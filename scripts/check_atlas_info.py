from PIL import Image
import os

path = "d:/webapp/programtools/public/sprites_atlas/unit_sheet_0.png"
if os.path.exists(path):
    img = Image.open(path)
    print(f"Sheet dimensions: {img.size}")
    # Assume tile size is 48 based on existing constants
    tile_size = 48 # Or deduce from height
    print(f"Estimated Tile Size based on height/2: {img.height // 2}")
    
    # Check simple color stats
    print(f"Mode: {img.mode}")
    
else:
    print("Sheet 0 not found")
