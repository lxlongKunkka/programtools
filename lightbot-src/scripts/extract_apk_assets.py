from __future__ import annotations

import shutil
import sys
import zipfile
import zlib
from pathlib import Path

import UnityPy

WORKSPACE = Path(__file__).resolve().parent.parent
PUBLIC_DIR = WORKSPACE / 'public'
OUTPUT_DIR = PUBLIC_DIR / 'extracted-assets'
SNOW_APK = PUBLIC_DIR / 'Algorithm City _The Snow Coder_1.0.3_APKPure.apk'
CODING_APK = PUBLIC_DIR / 'Algorithm City _ Coding Game_1.0.5_APKPure.apk'
SNOW_OUTPUT = OUTPUT_DIR / 'snow-coder-unity'
CODING_OUTPUT = OUTPUT_DIR / 'coding-game-swf'

UNITY_DATA_MEMBERS = [
    'assets/bin/Data/data.unity3d',
    'assets/bin/Data/sharedassets0.resource',
    'assets/bin/Data/unity default resources',
]


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def extract_member(apk_path: Path, member_name: str, destination: Path) -> Path | None:
    with zipfile.ZipFile(apk_path) as archive:
        try:
            entry = archive.getinfo(member_name)
        except KeyError:
            return None
        output_path = destination / Path(member_name).name
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(entry) as source, output_path.open('wb') as target:
            shutil.copyfileobj(source, target)
        return output_path


def next_available_path(path: Path) -> Path:
    if not path.exists():
        return path

    suffix = 1
    while True:
        candidate = path.with_name(f'{path.stem}_{suffix}{path.suffix}')
        if not candidate.exists():
            return candidate
        suffix += 1


def iter_embedded_pngs(blob: bytes):
    signature = b'\x89PNG\r\n\x1a\n'
    offset = 0
    while True:
        start = blob.find(signature, offset)
        if start == -1:
            return

        end_marker = b'IEND\xaeB`\x82'
        end = blob.find(end_marker, start)
        if end == -1:
            return

        yield blob[start:end + len(end_marker)]
        offset = end + len(end_marker)


def iter_embedded_jpegs(blob: bytes):
    signature = b'\xff\xd8\xff'
    offset = 0
    while True:
        start = blob.find(signature, offset)
        if start == -1:
            return

        end = blob.find(b'\xff\xd9', start + 3)
        if end == -1:
            return

        yield blob[start:end + 2]
        offset = end + 2


def export_embedded_swf_images(swf_path: Path) -> tuple[int, int]:
    images_dir = CODING_OUTPUT / 'images'
    reset_dir(images_dir)

    data = swf_path.read_bytes()
    signature = data[:3]
    body = zlib.decompress(data[8:]) if signature == b'CWS' else data[8:]

    png_count = 0
    for blob in iter_embedded_pngs(body):
        target_path = next_available_path(images_dir / f'embedded_png_{png_count + 1}.png')
        target_path.write_bytes(blob)
        png_count += 1

    jpeg_count = 0
    for blob in iter_embedded_jpegs(body):
        target_path = next_available_path(images_dir / f'embedded_jpeg_{jpeg_count + 1}.jpg')
        target_path.write_bytes(blob)
        jpeg_count += 1

    return png_count, jpeg_count


def export_unity_assets() -> tuple[int, int]:
    raw_dir = SNOW_OUTPUT / 'raw'
    exported_dir = SNOW_OUTPUT / 'images'
    reset_dir(raw_dir)
    reset_dir(exported_dir)

    extracted_files: list[Path] = []
    for member in UNITY_DATA_MEMBERS:
        extracted = extract_member(SNOW_APK, member, raw_dir)
        if extracted is not None:
            extracted_files.append(extracted)

    if not extracted_files:
        print('No Unity data files were extracted from Snow Coder APK.')
        return 0, 0

    env = UnityPy.load(str(raw_dir))
    texture_count = 0
    sprite_count = 0

    for index, obj in enumerate(env.objects):
        if obj.type.name not in {'Sprite', 'Texture2D'}:
            continue

        try:
            data = obj.read()
            image = data.image
        except Exception as error:
            print(f'SKIP {obj.type.name} #{index}: {error}')
            continue

        name = getattr(data, 'name', '') or f'{obj.type.name.lower()}_{index}'
        safe_name = ''.join(char if char.isalnum() or char in {'-', '_'} else '_' for char in name).strip('_')
        if not safe_name:
            safe_name = f'{obj.type.name.lower()}_{index}'

        target_dir = exported_dir / obj.type.name.lower()
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f'{safe_name}.png'

        suffix = 1
        while target_path.exists():
            target_path = target_dir / f'{safe_name}_{suffix}.png'
            suffix += 1

        try:
            image.save(target_path)
        except Exception as error:
            print(f'FAILED {target_path.name}: {error}')
            continue

        if obj.type.name == 'Sprite':
            sprite_count += 1
        else:
            texture_count += 1

    return texture_count, sprite_count


def export_swf_bundle() -> Path | None:
    reset_dir(CODING_OUTPUT)
    return extract_member(CODING_APK, 'assets/AlgorithmCity.swf', CODING_OUTPUT)


def main() -> int:
    if not SNOW_APK.exists() or not CODING_APK.exists():
        print('Expected APK files were not found in public/.')
        return 1

    swf_path = export_swf_bundle()
    texture_count, sprite_count = export_unity_assets()
    swf_png_count = 0
    swf_jpeg_count = 0
    if swf_path is not None:
        swf_png_count, swf_jpeg_count = export_embedded_swf_images(swf_path)

    print(f'SWF extracted: {swf_path if swf_path else "missing"}')
    print(f'SWF embedded PNGs exported: {swf_png_count}')
    print(f'SWF embedded JPEGs exported: {swf_jpeg_count}')
    print(f'Unity textures exported: {texture_count}')
    print(f'Unity sprites exported: {sprite_count}')
    print(f'Output root: {OUTPUT_DIR}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
