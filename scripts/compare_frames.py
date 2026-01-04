from PIL import Image
import numpy as np

def compare(path1, path2):
    try:
        img1 = Image.open(path1).convert('RGBA')
        img2 = Image.open(path2).convert('RGBA')
        
        if img1.size != img2.size:
            img2 = img2.resize(img1.size)

        arr1 = np.array(img1)
        arr2 = np.array(img2)
        
        diff = np.abs(arr1.astype(int) - arr2.astype(int))
        total_diff = np.sum(diff)
        avg_diff = np.mean(diff)
        
        max_diff = arr1.size * 255
        score = total_diff / max_diff
        print(f"{path1} vs {path2}: Score {score:.4f} (0=Same, 1=Opposite)")
        
        # Check if difference is localized (e.g. legs)
        diff_img = Image.fromarray(diff.astype('uint8'))
        bbox = diff_img.getbbox()
        if bbox:
            print(f"  Difference bounding box: {bbox} (Image size: {img1.size})")
        else:
            print("  Images are identical")
            
    except Exception as e:
        print(f"Error: {e}")

print("Checking Blue Soldier vs Blue Archer (Current Config)")
compare('public/sprites/characters/sprite_164.png', 'public/sprites/characters/sprite_184.png')

print("\nChecking Red Soldier vs Red Archer (Current Config)")
compare('public/sprites/characters/sprite_100.png', 'public/sprites/characters/sprite_75.png')
