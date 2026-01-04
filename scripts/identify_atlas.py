import os
from PIL import Image
import numpy as np

ATLAS_DIR = 'public/sprites_atlas'
OLD_SPRITES_DIR = 'public/sprites'

# Load all u-sprites
u_sprites = {}
for f in os.listdir(ATLAS_DIR):
    if f.startswith('u') and '_' in f and f.endswith('.png'):
        path = os.path.join(ATLAS_DIR, f)
        try:
            img = Image.open(path).convert('RGBA')
            u_sprites[f] = np.array(img)
        except:
            pass

print(f"Loaded {len(u_sprites)} atlas frames.")

# Walk old sprites and find best match for each u-sprite
matches = {}

for u_name, u_arr in u_sprites.items():
    u_alpha = u_arr[:, :, 3]
    uh, uw = u_alpha.shape
    
    best_match = None
    min_diff = float('inf')
    
    # We want to find which old sprite corresponds to this atlas frame
    # But there are hundreds of old sprites.
    # Let's optimize: only check sprites with similar aspect ratio?
    # Or just brute force, it's not that many (200-300).
    
    for root, dirs, files in os.walk(OLD_SPRITES_DIR):
        if 'sprites_atlas' in root: continue
        
        for file in files:
            if not file.endswith('.png'): continue
            
            path = os.path.join(root, file)
            try:
                img = Image.open(path).convert('RGBA')
                arr = np.array(img)
                alpha = arr[:, :, 3]
                h, w = alpha.shape
                
                if h > uh or w > uw: continue
                
                # Center align or top-left? 
                # The atlas frames are 24x24. Old sprites are cropped.
                # Let's try to find the old sprite INSIDE the atlas frame.
                
                # Brute force offset
                found = False
                for y in range(uh - h + 1):
                    for x in range(uw - w + 1):
                        sub = u_alpha[y:y+h, x:x+w]
                        diff = np.sum(np.abs(sub.astype(int) - alpha.astype(int)))
                        if diff == 0: # Exact match preferred
                            min_diff = 0
                            best_match = file
                            found = True
                            break
                        if diff < min_diff:
                            min_diff = diff
                            best_match = file
                    if found: break
                
                if min_diff == 0: break
            except:
                pass
        if min_diff == 0: break
            
    matches[u_name] = best_match
    print(f"{u_name} matches {best_match} (diff {min_diff})")

print("\n--- Summary ---")
# Group by U number
from collections import defaultdict
grouped = defaultdict(list)
for u_name, match in matches.items():
    base = u_name.split('_')[0]
    grouped[base].append(match)

for base in sorted(grouped.keys()):
    print(f"{base}: {grouped[base]}")
