import os
from PIL import Image
import numpy as np

ATLAS_DIR = 'public/sprites_new'

def get_avg_color(img_crop):
    arr = np.array(img_crop)
    # Filter out transparent pixels
    mask = arr[:, :, 3] > 0
    if not np.any(mask):
        return "Transparent"
    
    pixels = arr[mask]
    avg = np.mean(pixels[:, :3], axis=0)
    return avg

def color_name(rgb):
    if isinstance(rgb, str): return rgb
    r, g, b = rgb
    if r > b + 20 and r > g + 20: return "Red"
    if b > r + 20 and b > g + 20: return "Blue"
    if g > r + 20 and g > b + 20: return "Green"
    if r > 200 and g > 200 and b > 200: return "White"
    if r < 50 and g < 50 and b < 50: return "Black"
    return "Gray/Mixed"

print("Analyzing u* sprites (Top vs Bottom)...")
for i in range(21):
    name = f"u{i}.png"
    path = os.path.join(ATLAS_DIR, name)
    if not os.path.exists(path): continue
    
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    
    if h == 48:
        top = img.crop((0, 0, 24, 24))
        bottom = img.crop((0, 24, 24, 48))
        
        c1 = get_avg_color(top)
        c2 = get_avg_color(bottom)
        
        n1 = color_name(c1)
        n2 = color_name(c2)
        
        print(f"{name}: Top={n1}, Bottom={n2}")
    else:
        print(f"{name}: Size {w}x{h}")
