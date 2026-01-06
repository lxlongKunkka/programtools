import os
import colorsys
from PIL import Image

# Configuration
ATLAS_DIR = "d:/webapp/programtools/public/sprites_atlas"
SOURCE_DIR = "d:/webapp/programtools/sprites_source"
TILE_SIZE = 24  # Sprites in the sheet are 24x24 (displayed as 48x48)
SHEET_NAMES = ["unit_sheet_0.png", "unit_sheet_1.png", "unit_sheet_2.png", "unit_sheet_3.png"]

# Target Hues (Approximate)
# Blue (Sheet 0) is reference.
# Red (Sheet 1) ~ 0.0 (or 1.0)
# Green (Sheet 2) ~ 0.33
# Black (Sheet 3) - Special handling (desaturation)

def is_blue_ish(r, g, b):
    # Heuristic: Blue component is significantly larger than Red and Green
    return b > r + 15 and b > g + 15

def shift_pixel(r, g, b, a, sheet_index):
    """
    Shifts a single pixel based on the target sheet index.
    sheet_index: 0=Blue, 1=Red, 2=Green, 3=Black
    """
    if sheet_index == 0:
        return (r, g, b, a)

    # Convert to HSV
    h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)

    if sheet_index == 1: # Red
        # Blue(0.66) -> Red(0.0) is -0.66.
        new_h = (h + 0.33) % 1.0 # 0.66 + 0.33 = 0.99 (Red-ish)
        return tuple(int(c * 255) for c in colorsys.hsv_to_rgb(new_h, s, v)) + (a,)
    
    elif sheet_index == 2: # Green
        # Blue(0.66) -> Green(0.33) is -0.33.
        new_h = (h - 0.33) % 1.0
        return tuple(int(c * 255) for c in colorsys.hsv_to_rgb(new_h, s, v)) + (a,)
        
    elif sheet_index == 3: # Black
        # Desaturate and darken slightly
        new_s = s * 0.2
        new_v = v * 0.7
        return tuple(int(c * 255) for c in colorsys.hsv_to_rgb(h, new_s, new_v)) + (a,)
        
    return (r, g, b, a)

def learn_color_map(src_img, dst_img):
    """
    Learns a color mapping from src_img to dst_img.
    """
    mapping = {}
    width, height = src_img.size
    src_pixels = src_img.load()
    dst_pixels = dst_img.load()
    
    for y in range(height):
        for x in range(width):
            s_px = src_pixels[x, y]
            d_px = dst_pixels[x, y]
            if s_px != d_px and s_px[3] > 0:
                mapping[s_px] = d_px
    return mapping

def apply_color_logic(img, mapping, sheet_index):
    """
    Applies learned mapping. If no mapping found and pixel is blue-ish, applies Hue Shift.
    """
    new_img = img.copy()
    pixels = new_img.load()
    width, height = new_img.size
    
    for y in range(height):
        for x in range(width):
            px = pixels[x, y]
            if px[3] == 0: continue # Skip transparent
            
            if px in mapping:
                pixels[x, y] = mapping[px]
            elif is_blue_ish(px[0], px[1], px[2]):
                # Smart Shift
                pixels[x, y] = shift_pixel(px[0], px[1], px[2], px[3], sheet_index)
                
    return new_img

def process_and_append_units():
    print("Starting Improved Unit Injection...")
    
    # 1. Load Reference Sheets (Blue is 0)
    # Note: We should load the *original* parts of the sheets to learn from.
    # But since we already modified them, the first 19 units are still valid.
    
    sheets = []
    for name in SHEET_NAMES:
        path = os.path.join(ATLAS_DIR, name)
        sheets.append(Image.open(path).convert("RGBA"))
        
    blue_sheet = sheets[0]
    
    # Crop to original game units (Unit 0 to 18) to exclude my recent additions
    # Width = 19 * 24 = 456
    ORIGINAL_WIDTH = 456
    blue_ref = blue_sheet.crop((0, 0, ORIGINAL_WIDTH, 48))
    
    print("Learning color palettes from original units...")
    maps = [] 
    for i in range(1, 4):
        target_ref = sheets[i].crop((0, 0, ORIGINAL_WIDTH, 48))
        maps.append(learn_color_map(blue_ref, target_ref))
        
    # 3. Load Source Images
    # Modified to include 13 as requested
    target_unit_ids = [13] 
    unit_images = {}
    
    for uid in target_unit_ids:
        unit_images[uid] = {}
        for frame in [0, 1]:
            f_path = os.path.join(SOURCE_DIR, f"u{uid}_{frame}.png")
            if os.path.exists(f_path):
                 unit_images[uid][frame] = Image.open(f_path).convert("RGBA")
            else:
                 # Fallback if frame 1 missing
                 if frame == 1 and 0 in unit_images[uid]:
                     unit_images[uid][1] = unit_images[uid][0].copy()

    # 4. Rebuild Sheets
    
    for i in range(4):
        # Start with current sheet (which has correct width now)
        current_sheet = sheets[i]
        
        # Get map for this sheet (Map index i-1)
        current_map = {} if i == 0 else maps[i-1]
        
        for uid in target_unit_ids:
            # Get Source (Blue)
            f0 = unit_images[uid][0]
            f1 = unit_images[uid][1]
            
            # Resize
            if f0.size != (TILE_SIZE, TILE_SIZE): f0 = f0.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)
            if f1.size != (TILE_SIZE, TILE_SIZE): f1 = f1.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)
            
            # Apply Logic
            # For Sheet 0 (Blue), apply_color_logic just returns copy (since map is emptyand index is 0)
            f0_mod = apply_color_logic(f0, current_map, i)
            f1_mod = apply_color_logic(f1, current_map, i)
            
            # Paste
            x_pos = uid * TILE_SIZE
            current_sheet.paste(f0_mod, (x_pos, 0))
            current_sheet.paste(f1_mod, (x_pos, TILE_SIZE))
            
        save_path = os.path.join(ATLAS_DIR, SHEET_NAMES[i])
        current_sheet.save(save_path)
        print(f"Refined Sheet {i} saved.")

if __name__ == "__main__":
    process_and_append_units()
