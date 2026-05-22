from __future__ import annotations

import json
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image, ImageDraw

WORKSPACE = Path(__file__).resolve().parent.parent
SWF_ROOT = WORKSPACE / 'public' / 'extracted-assets' / 'coding-game-swf'
XML_PATH = SWF_ROOT / 'sprites.xml'
EMBEDDED_IMAGES_DIR = SWF_ROOT / 'images'
OUTPUT_ROOT = SWF_ROOT / 'xml-slices'
SLICES_DIR = OUTPUT_ROOT / 'slices'
CONTACT_SHEET_PATH = OUTPUT_ROOT / 'contact-sheet.png'
MANIFEST_PATH = OUTPUT_ROOT / 'manifest.json'
CATEGORIES_JSON_PATH = OUTPUT_ROOT / 'categories.json'
CATEGORIES_MD_PATH = OUTPUT_ROOT / 'categories.md'

CONTACT_COLUMNS = 4
CONTACT_CELL_WIDTH = 192
CONTACT_CELL_HEIGHT = 192
CONTACT_LABEL_HEIGHT = 44


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def parse_int(value: str | None, default: int = 0) -> int:
    if not value:
        return default
    match = re.search(r'-?\d+', value)
    return int(match.group(0)) if match else default


def sanitize_name(name: str) -> str:
    sanitized = ''.join(character if character.isalnum() or character in {'-', '_'} else '_' for character in name)
    sanitized = re.sub(r'_+', '_', sanitized).strip('_')
    return sanitized or 'unnamed'


def classify_name(name: str) -> str:
    if name.startswith('char'):
        return 'characters'
    if name.startswith('block') or name == 'commandSquareImg':
        return 'tiles'
    if name.startswith('cmd'):
        return 'commands'
    if name.startswith('icon') or name.startswith('baseButton') or name.startswith('bar'):
        return 'ui'
    if name.startswith('obstacle') or name in {'goldImg', 'handImg', 'musterenImg', 'iconMusterenImg'}:
        return 'props'
    return 'misc'


def choose_atlas_image(max_right: int, max_bottom: int) -> Path:
    candidates = sorted(EMBEDDED_IMAGES_DIR.glob('embedded_png_*.png'))
    valid_candidates: list[Path] = []

    for candidate in candidates:
        with Image.open(candidate) as image:
            width, height = image.size
        if width >= max_right and height >= max_bottom:
            valid_candidates.append(candidate)

    if not valid_candidates:
        raise FileNotFoundError('No embedded PNG large enough for atlas coordinates.')

    valid_candidates.sort(key=lambda path: path.stat().st_size, reverse=True)
    return valid_candidates[0]


def extract_entries() -> list[dict[str, int | str]]:
    root = ElementTree.parse(XML_PATH).getroot()
    entries: list[dict[str, int | str]] = []

    for element in root.findall('SubTexture'):
        name = element.attrib['name']
        x = parse_int(element.attrib.get('x'))
        y = parse_int(element.attrib.get('y'))
        width = parse_int(element.attrib.get('width'))
        height = parse_int(element.attrib.get('height'))
        frame_x = parse_int(element.attrib.get('frameX'))
        frame_y = parse_int(element.attrib.get('frameY'))
        frame_width = parse_int(element.attrib.get('frameWidth'), width)
        frame_height = parse_int(element.attrib.get('frameHeight'), height)

        entries.append(
            {
                'name': name,
                'x': x,
                'y': y,
                'width': width,
                'height': height,
                'frameX': frame_x,
                'frameY': frame_y,
                'frameWidth': frame_width,
                'frameHeight': frame_height,
                'category': classify_name(name),
            }
        )

    return entries


def render_entry(atlas: Image.Image, entry: dict[str, int | str]) -> Image.Image:
    x = int(entry['x'])
    y = int(entry['y'])
    width = int(entry['width'])
    height = int(entry['height'])
    frame_x = int(entry['frameX'])
    frame_y = int(entry['frameY'])
    frame_width = max(int(entry['frameWidth']), width)
    frame_height = max(int(entry['frameHeight']), height)

    sprite = atlas.crop((x, y, x + width, y + height))

    needs_frame = (
        frame_width != width
        or frame_height != height
        or frame_x != 0
        or frame_y != 0
    )
    if not needs_frame:
        return sprite

    framed = Image.new('RGBA', (frame_width, frame_height), (0, 0, 0, 0))
    paste_x = max(-frame_x, 0)
    paste_y = max(-frame_y, 0)
    framed.alpha_composite(sprite, (paste_x, paste_y))
    return framed


def write_contact_sheet(items: list[dict[str, int | str]]) -> None:
    rows = (len(items) + CONTACT_COLUMNS - 1) // CONTACT_COLUMNS
    sheet_width = CONTACT_COLUMNS * CONTACT_CELL_WIDTH
    sheet_height = rows * (CONTACT_CELL_HEIGHT + CONTACT_LABEL_HEIGHT)
    sheet = Image.new('RGBA', (sheet_width, sheet_height), (16, 18, 24, 255))
    draw = ImageDraw.Draw(sheet)

    for index, item in enumerate(items, start=1):
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

        sprite = Image.open(SLICES_DIR / str(item['file'])).convert('RGBA')
        sprite.thumbnail((CONTACT_CELL_WIDTH - 24, CONTACT_CELL_HEIGHT - 24))
        sprite_x = cell_x + (CONTACT_CELL_WIDTH - sprite.width) // 2
        sprite_y = cell_y + (CONTACT_CELL_HEIGHT - sprite.height) // 2
        sheet.alpha_composite(sprite, (sprite_x, sprite_y))

        label = f"#{index:03d} {item['name']}"
        draw.text((cell_x + 12, cell_y + CONTACT_CELL_HEIGHT + 4), label, fill=(232, 236, 245, 255))
        category_label = f"{item['category']} {item['width']}x{item['height']}"
        draw.text((cell_x + 12, cell_y + CONTACT_CELL_HEIGHT + 22), category_label, fill=(164, 171, 189, 255))

    sheet.save(CONTACT_SHEET_PATH)


def write_category_reports(items: list[dict[str, int | str]]) -> None:
    grouped: dict[str, list[str]] = defaultdict(list)
    for item in items:
        grouped[str(item['category'])].append(str(item['name']))

    for values in grouped.values():
        values.sort()

    CATEGORIES_JSON_PATH.write_text(json.dumps(grouped, ensure_ascii=False, indent=2), encoding='utf-8')

    lines = ['# SWF Sprite Categories', '']
    for category in sorted(grouped):
        lines.append(f'## {category}')
        lines.append('')
        for name in grouped[category]:
            lines.append(f'- {name}')
        lines.append('')

    CATEGORIES_MD_PATH.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')


def main() -> int:
    if not XML_PATH.exists():
        print(f'Atlas XML not found: {XML_PATH}')
        return 1

    entries = extract_entries()
    max_right = max(int(entry['x']) + int(entry['width']) for entry in entries)
    max_bottom = max(int(entry['y']) + int(entry['height']) for entry in entries)
    atlas_path = choose_atlas_image(max_right, max_bottom)

    reset_dir(OUTPUT_ROOT)
    SLICES_DIR.mkdir(parents=True, exist_ok=True)

    with Image.open(atlas_path).convert('RGBA') as atlas:
        manifest: list[dict[str, int | str]] = []
        for index, entry in enumerate(entries, start=1):
            file_name = f"{index:03d}_{sanitize_name(str(entry['name']))}.png"
            rendered = render_entry(atlas, entry)
            rendered.save(SLICES_DIR / file_name)
            manifest.append(
                {
                    **entry,
                    'id': index,
                    'file': file_name,
                }
            )

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    write_contact_sheet(manifest)
    write_category_reports(manifest)

    print(f'Atlas source: {atlas_path.name}')
    print(f'Sprite count: {len(manifest)}')
    print(f'Output root: {OUTPUT_ROOT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())