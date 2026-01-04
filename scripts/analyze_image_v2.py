from PIL import Image
import os

image_path = r"d:\webapp\programtools\other\远古帝国重制版现有图块素材\main_texture2.png"

if os.path.exists(image_path):
    img = Image.open(image_path).convert("RGBA")
    print(f"Dimensions: {img.width}x{img.height}")
    
    # Check corners
    corners = [
        img.getpixel((0, 0)),
        img.getpixel((img.width-1, 0)),
        img.getpixel((0, img.height-1)),
        img.getpixel((img.width-1, img.height-1))
    ]
    print(f"Corner pixels: {corners}")
    
    # Check if alpha channel is used
    extrema = img.getextrema()
    print(f"Extrema: {extrema}")
    alpha_extrema = extrema[3]
    print(f"Alpha range: {alpha_extrema}")

else:
    print("Image not found")
