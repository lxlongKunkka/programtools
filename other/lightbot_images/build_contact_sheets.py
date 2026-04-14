from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE = Path('/Users/kunkka/projects/lightbot_images')
SECTIONS = [
    ('base', 9, 3),
    ('prog', 9, 3),
    ('overload', 9, 3),
    ('circle', 9, 3),
    ('if', 7, 3),
    ('clg', 7, 3),
]
CELL_W = 260
CELL_H = 240
THUMB_W = 220
THUMB_H = 170
LABEL_H = 40
MARGIN = 20

font = ImageFont.load_default()

for section, count, cols in SECTIONS:
    rows = (count + cols - 1) // cols
    sheet = Image.new('RGB', (cols * CELL_W + (cols + 1) * MARGIN, rows * CELL_H + (rows + 1) * MARGIN), 'white')
    draw = ImageDraw.Draw(sheet)
    for idx in range(1, count + 1):
        path = BASE / f'Lightbot-{section}-{idx}.gif'
        with Image.open(path) as im:
            im.seek(0)
            frame = im.convert('RGB')
            frame.thumbnail((THUMB_W, THUMB_H))
        row = (idx - 1) // cols
        col = (idx - 1) % cols
        x = MARGIN + col * CELL_W
        y = MARGIN + row * CELL_H
        thumb_x = x + (CELL_W - frame.width) // 2
        thumb_y = y
        sheet.paste(frame, (thumb_x, thumb_y))
        draw.rectangle([x, y, x + CELL_W - 1, y + THUMB_H + LABEL_H], outline='black', width=1)
        draw.text((x + 10, y + THUMB_H + 10), f'{section}-{idx}', fill='black', font=font)
    out = BASE / f'{section}-contact.png'
    sheet.save(out)
    print(out)
