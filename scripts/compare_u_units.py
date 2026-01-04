from PIL import Image
import numpy as np

def compare(path1, path2):
    try:
        img1 = Image.open(path1).convert('RGBA')
        img2 = Image.open(path2).convert('RGBA')
        
        arr1 = np.array(img1)
        arr2 = np.array(img2)
        
        diff = np.sum(np.abs(arr1.astype(int) - arr2.astype(int)))
        max_diff = arr1.size * 255
        score = diff / max_diff
        
        print(f"{path1} vs {path2}: Score {score:.4f}")
    except Exception as e:
        print(f"Error: {e}")

print("Comparing Blue Soldier (u2) vs Potential Blue Archer (u4)")
compare('public/sprites_atlas/u2.png', 'public/sprites_atlas/u4.png')

print("Comparing Red Soldier (u11) vs Potential Red Archer (u6)")
compare('public/sprites_atlas/u11.png', 'public/sprites_atlas/u6.png')
