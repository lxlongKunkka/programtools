import os
import json
import shutil

analysis_file = r"d:\webapp\programtools\scripts\sprite_analysis.json"
sprites_dir = r"d:\webapp\programtools\public\sprites"

def categorize_sprites():
    if not os.path.exists(analysis_file):
        print("Analysis file not found")
        return

    with open(analysis_file, 'r') as f:
        data = json.load(f)

    # Create directories
    dirs = [
        "map",
        "characters",
        "structures",
        "effects",
        "other"
    ]
    
    for d in dirs:
        path = os.path.join(sprites_dir, d)
        if not os.path.exists(path):
            os.makedirs(path)

    moved_count = 0

    for item in data:
        filename = item['filename']
        # Find file in any existing subdirectory
        src_path = None
        for root, _, files in os.walk(sprites_dir):
            if filename in files:
                src_path = os.path.join(root, filename)
                break
        
        if not src_path:
            continue

        w = item['width']
        h = item['height']
        cov = item['coverage']
        
        target_folder = "other"

        # Improved Logic based on user feedback
        # Coverage 1.0 usually means a full tile (Terrain/Map)
        # Coverage < 0.9 usually means a sprite with transparency (Character)
        
        if w < 10 or h < 10:
            target_folder = "effects"
        elif w > 40 or h > 40:
            # Slightly lower threshold for structures
            target_folder = "structures"
        elif cov > 0.9:
            # Full square or nearly full -> Map Tile
            target_folder = "map"
        else:
            # Has transparency -> Character
            target_folder = "characters"

        # Move
        dst_path = os.path.join(sprites_dir, target_folder, filename)
        
        # Avoid moving if already in correct folder
        if os.path.dirname(src_path) != os.path.dirname(dst_path):
            shutil.move(src_path, dst_path)
            moved_count += 1

    print(f"Moved {moved_count} sprites into new categories.")

if __name__ == "__main__":
    categorize_sprites()
