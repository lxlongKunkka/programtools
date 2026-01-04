import os
from PIL import Image

ATLAS_DIR = 'public/sprites_new'

for file in os.listdir(ATLAS_DIR):
    if file.startswith('u') and file.endswith('.png') and '_' not in file:
        path = os.path.join(ATLAS_DIR, file)
        img = Image.open(path)
        w, h = img.size
        
        if h == 48:
            # Slice
            top = img.crop((0, 0, 24, 24))
            bottom = img.crop((0, 24, 24, 48))
            
            name = os.path.splitext(file)[0]
            top.save(os.path.join(ATLAS_DIR, f"{name}_0.png"))
            bottom.save(os.path.join(ATLAS_DIR, f"{name}_1.png"))
            print(f"Sliced {file} into {name}_0.png and {name}_1.png")
