from __future__ import annotations

import json
import shutil
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

WORKSPACE = Path(__file__).resolve().parent.parent
ATLAS_PATH = WORKSPACE / 'public' / 'extracted-assets' / 'coding-game-swf' / 'images' / 'embedded_png_4.png'
OUTPUT_ROOT = WORKSPACE / 'public' / 'extracted-assets' / 'coding-game-swf' / 'atlas-slices'
COMPONENTS_DIR = OUTPUT_ROOT / 'components'
CONTACT_SHEET_PATH = OUTPUT_ROOT / 'contact-sheet.png'
MANIFEST_PATH = OUTPUT_ROOT / 'manifest.json'

MIN_COMPONENT_PIXELS = 140
PADDING = 4
CONTACT_COLUMNS = 4
CONTACT_CELL_WIDTH = 160
CONTACT_CELL_HEIGHT = 160
CONTACT_LABEL_HEIGHT = 28
SATELLITE_MAX_AREA = 700
SATELLITE_ATTACH_GAP = 16
SATELLITE_MAX_GROUP_WIDTH = 160
SATELLITE_MAX_GROUP_HEIGHT = 160


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def find_components(image: Image.Image) -> list[dict[str, int]]:
    alpha = image.getchannel('A')
    width, height = image.size
    visited = bytearray(width * height)
    pixels = alpha.load()
    components: list[dict[str, int]] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index] or pixels[x, y] == 0:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[index] = 1
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            points: list[tuple[int, int]] = []

            while queue:
                current_x, current_y = queue.popleft()
                area += 1
                points.append((current_x, current_y))
                min_x = min(min_x, current_x)
                min_y = min(min_y, current_y)
                max_x = max(max_x, current_x)
                max_y = max(max_y, current_y)

                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if next_x < 0 or next_y < 0 or next_x >= width or next_y >= height:
                        continue

                    next_index = next_y * width + next_x
                    if visited[next_index] or pixels[next_x, next_y] == 0:
                        continue

                    visited[next_index] = 1
                    queue.append((next_x, next_y))

            if area < MIN_COMPONENT_PIXELS:
                continue

            components.append(
                {
                    'x': min_x,
                    'y': min_y,
                    'width': max_x - min_x + 1,
                    'height': max_y - min_y + 1,
                    'area': area,
                    'points': points,
                }
            )

    components.sort(key=lambda component: (component['y'], component['x']))
    return components


def component_gap(first: dict[str, int], second: dict[str, int]) -> tuple[int, int]:
    first_right = first['x'] + first['width'] - 1
    first_bottom = first['y'] + first['height'] - 1
    second_right = second['x'] + second['width'] - 1
    second_bottom = second['y'] + second['height'] - 1

    gap_x = max(0, second['x'] - first_right - 1, first['x'] - second_right - 1)
    gap_y = max(0, second['y'] - first_bottom - 1, first['y'] - second_bottom - 1)
    return gap_x, gap_y


def merge_component_group(components: list[dict[str, int]]) -> dict[str, int]:
    min_x = min(component['x'] for component in components)
    min_y = min(component['y'] for component in components)
    max_x = max(component['x'] + component['width'] - 1 for component in components)
    max_y = max(component['y'] + component['height'] - 1 for component in components)
    points: list[tuple[int, int]] = []
    area = 0

    for component in components:
        points.extend(component['points'])
        area += component['area']

    return {
        'x': min_x,
        'y': min_y,
        'width': max_x - min_x + 1,
        'height': max_y - min_y + 1,
        'area': area,
        'points': points,
    }


def merge_satellite_components(components: list[dict[str, int]]) -> list[dict[str, int]]:
    remaining = components[:]
    merged_any = True

    while merged_any:
        merged_any = False
        remaining.sort(key=lambda component: component['area'], reverse=True)

        for index, component in enumerate(remaining):
            if component['area'] > SATELLITE_MAX_AREA:
                continue

            best_target_index: int | None = None
            best_distance: tuple[int, int] | None = None

            for target_index, target in enumerate(remaining):
                if target_index == index or target['area'] <= component['area']:
                    continue

                gap_x, gap_y = component_gap(component, target)
                if gap_x > SATELLITE_ATTACH_GAP or gap_y > SATELLITE_ATTACH_GAP:
                    continue

                merged_width = max(component['x'] + component['width'], target['x'] + target['width']) - min(component['x'], target['x'])
                merged_height = max(component['y'] + component['height'], target['y'] + target['height']) - min(component['y'], target['y'])
                if merged_width > SATELLITE_MAX_GROUP_WIDTH or merged_height > SATELLITE_MAX_GROUP_HEIGHT:
                    continue

                distance = (gap_x + gap_y, gap_y, gap_x)
                if best_distance is None or distance < best_distance:
                    best_distance = distance
                    best_target_index = target_index

            if best_target_index is None:
                continue

            target = remaining[best_target_index]
            combined = merge_component_group([target, component])

            for remove_index in sorted([index, best_target_index], reverse=True):
                remaining.pop(remove_index)
            remaining.append(combined)
            merged_any = True
            break

    remaining.sort(key=lambda component: (component['y'], component['x']))
    return remaining


def crop_component(image: Image.Image, component: dict[str, int]) -> Image.Image:
    left = max(component['x'] - PADDING, 0)
    top = max(component['y'] - PADDING, 0)
    right = min(component['x'] + component['width'] + PADDING, image.size[0])
    bottom = min(component['y'] + component['height'] + PADDING, image.size[1])

    cropped = Image.new('RGBA', (right - left, bottom - top), (0, 0, 0, 0))
    source_pixels = image.load()
    target_pixels = cropped.load()

    for point_x, point_y in component['points']:
        target_pixels[point_x - left, point_y - top] = source_pixels[point_x, point_y]

    return cropped


def write_contact_sheet(slices: list[tuple[int, dict[str, int], Path]]) -> None:
    rows = (len(slices) + CONTACT_COLUMNS - 1) // CONTACT_COLUMNS
    sheet_width = CONTACT_COLUMNS * CONTACT_CELL_WIDTH
    sheet_height = rows * (CONTACT_CELL_HEIGHT + CONTACT_LABEL_HEIGHT)
    sheet = Image.new('RGBA', (sheet_width, sheet_height), (16, 18, 24, 255))
    draw = ImageDraw.Draw(sheet)

    for index, component, path in slices:
        row = (index - 1) // CONTACT_COLUMNS
        column = (index - 1) % CONTACT_COLUMNS
        cell_x = column * CONTACT_CELL_WIDTH
        cell_y = row * (CONTACT_CELL_HEIGHT + CONTACT_LABEL_HEIGHT)

        draw.rounded_rectangle(
            (cell_x + 8, cell_y + 8, cell_x + CONTACT_CELL_WIDTH - 8, cell_y + CONTACT_CELL_HEIGHT - 8),
            radius=12,
            fill=(32, 36, 46, 255),
            outline=(64, 72, 92, 255),
            width=2,
        )

        sprite = Image.open(path).convert('RGBA')
        sprite.thumbnail((CONTACT_CELL_WIDTH - 24, CONTACT_CELL_HEIGHT - 24))
        sprite_x = cell_x + (CONTACT_CELL_WIDTH - sprite.width) // 2
        sprite_y = cell_y + (CONTACT_CELL_HEIGHT - sprite.height) // 2
        sheet.alpha_composite(sprite, (sprite_x, sprite_y))

        label = f"#{index:02d} {component['width']}x{component['height']}"
        draw.text((cell_x + 12, cell_y + CONTACT_CELL_HEIGHT + 4), label, fill=(232, 236, 245, 255))

    sheet.save(CONTACT_SHEET_PATH)


def main() -> int:
    if not ATLAS_PATH.exists():
        print(f'Atlas not found: {ATLAS_PATH}')
        return 1

    reset_dir(OUTPUT_ROOT)
    COMPONENTS_DIR.mkdir(parents=True, exist_ok=True)

    atlas = Image.open(ATLAS_PATH).convert('RGBA')
    components = merge_satellite_components(find_components(atlas))
    manifest: list[dict[str, int | str]] = []
    saved_components: list[tuple[int, dict[str, int], Path]] = []

    for index, component in enumerate(components, start=1):
        cropped = crop_component(atlas, component)
        file_name = f'component_{index:02d}.png'
        output_path = COMPONENTS_DIR / file_name
        cropped.save(output_path)
        manifest.append(
            {
                'id': index,
                'file': file_name,
                'x': component['x'],
                'y': component['y'],
                'width': component['width'],
                'height': component['height'],
                'area': component['area'],
            }
        )
        saved_components.append((index, component, output_path))

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    write_contact_sheet(saved_components)

    print(f'Atlas slices: {len(saved_components)}')
    print(f'Output root: {OUTPUT_ROOT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())