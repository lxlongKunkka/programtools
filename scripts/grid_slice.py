from PIL import Image
import os

image_path = r"d:\webapp\programtools\other\远古帝国重制版现有图块素材\main_texture2.png"
output_dir = r"d:\webapp\programtools\public\sprites"

def grid_slice(tile_width, tile_height):
    if not os.path.exists(image_path):
        print("Image not found")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    
    cols = width // tile_width
    rows = height // tile_height
    
    print(f"Slicing {width}x{height} image into {cols}x{rows} grid of {tile_width}x{tile_height} tiles.")

    count = 0
    for r in range(rows):
        for c in range(cols):
            x = c * tile_width
            y = r * tile_height
            
            sprite = img.crop((x, y, x + tile_width, y + tile_height))
            
            # Check if empty (all white or transparent)
            # ... (Optional)
            
            filename = f"tile_{r}_{c}.png"
            sprite.save(os.path.join(output_dir, filename))
            count += 1
            
    print(f"Saved {count} tiles to {output_dir}")

if __name__ == "__main__":
    # Try 18x18 as a guess for Ancient Empires
    grid_slice(18, 18)
