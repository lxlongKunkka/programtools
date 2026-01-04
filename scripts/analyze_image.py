from PIL import Image
import os

image_path = r"d:\webapp\programtools\other\远古帝国重制版现有图块素材\main_texture2.png"

if os.path.exists(image_path):
    img = Image.open(image_path)
    print(f"Image found: {image_path}")
    print(f"Dimensions: {img.width}x{img.height}")
    print(f"Format: {img.format}")
else:
    print(f"Image not found at {image_path}")
