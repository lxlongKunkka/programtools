import os
from PIL import Image

ATLAS_FILE = 'scripts/atlas.txt'
IMAGE_FILE = 'other/远古帝国重制版现有图块素材/main_texture.png'
OUTPUT_DIR = 'public/sprites_new'

def parse_atlas(atlas_path):
    sprites = {}
    current_name = None
    current_data = {}
    
    with open(atlas_path, 'r') as f:
        lines = f.readlines()
        
    # Skip header lines until we find the first sprite
    # The header seems to end when indentation starts or after 'alpha'
    # Actually, looking at the user input:
    # main_texture.png
    # size: ...
    # ...
    # alpha
    #   rotate: ...
    
    # It seems the first block is 'alpha'.
    # Let's just look for lines with no indentation as names, 
    # but skip the first few lines if they are header info.
    # Header lines: main_texture.png, size, format, filter, repeat.
    
    iterator = iter(lines)
    try:
        while True:
            line = next(iterator).rstrip()
            if not line: continue
            
            if line.startswith(' '):
                # Property
                if current_name:
                    key, value = line.strip().split(':', 1)
                    current_data[key.strip()] = value.strip()
            else:
                # New block or header
                # If previous block exists, save it
                if current_name and 'xy' in current_data and 'size' in current_data:
                    sprites[current_name] = current_data
                
                # Check if it's a header line
                if ':' in line and not line.startswith('  '):
                    # Likely header like "size: 451,469"
                    current_name = None
                    continue
                
                if line.endswith('.png'):
                    current_name = None
                    continue
                    
                current_name = line
                current_data = {}
                
    except StopIteration:
        pass
        
    # Save last one
    if current_name and 'xy' in current_data and 'size' in current_data:
        sprites[current_name] = current_data
        
    return sprites

def slice_image(image_path, sprites, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    img = Image.open(image_path)
    
    for name, data in sprites.items():
        try:
            x, y = map(int, data['xy'].split(','))
            w, h = map(int, data['size'].split(','))
            
            # Crop: left, top, right, bottom
            # Note: Atlas coordinates usually start from top-left? 
            # LibGDX format usually is top-left.
            
            crop = img.crop((x, y, x + w, y + h))
            crop.save(os.path.join(output_dir, f"{name}.png"))
            print(f"Saved {name}.png")
        except Exception as e:
            print(f"Error saving {name}: {e}")

if __name__ == "__main__":
    print(f"Parsing {ATLAS_FILE}...")
    sprites = parse_atlas(ATLAS_FILE)
    print(f"Found {len(sprites)} sprites.")
    
    print(f"Slicing {IMAGE_FILE}...")
    slice_image(IMAGE_FILE, sprites, OUTPUT_DIR)
    print("Done.")
