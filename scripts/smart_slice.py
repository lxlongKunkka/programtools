from PIL import Image
import os
import numpy as np

image_path = r"d:\webapp\programtools\other\远古帝国重制版现有图块素材\main_texture2.png"
output_dir = r"d:\webapp\programtools\public\sprites"

def smart_slice():
    if not os.path.exists(image_path):
        print("Image not found")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    pixels = np.array(img)
    
    # Determine background color from top-left pixel
    bg_color = pixels[0, 0]
    print(f"Background color detected: {bg_color}")

    # Create a boolean mask: True where pixel is NOT background
    # Check RGB channels (ignore Alpha for equality check if bg is opaque)
    # Actually, let's check all 4 channels if bg has alpha, or just RGB if alpha is 255
    
    # Calculate difference from background
    diff = np.abs(pixels - bg_color)
    # Sum differences across channels
    diff_sum = np.sum(diff, axis=2)
    
    # Content is where difference > tolerance
    has_content = diff_sum > 10 # Tolerance for compression artifacts

    # Find rows with content
    row_has_content = np.any(has_content, axis=1)
    
    # Find columns with content
    col_has_content = np.any(has_content, axis=0)

    # Helper to find ranges
    def find_ranges(bool_array):
        ranges = []
        start = None
        for i, val in enumerate(bool_array):
            if val and start is None:
                start = i
            elif not val and start is not None:
                ranges.append((start, i))
                start = None
        if start is not None:
            ranges.append((start, len(bool_array)))
        return ranges

    row_ranges = find_ranges(row_has_content)
    col_ranges = find_ranges(col_has_content)

    print(f"Found {len(row_ranges)} rows and {len(col_ranges)} columns of sprites.")

    count = 0
    for r_idx, (y1, y2) in enumerate(row_ranges):
        for c_idx, (x1, x2) in enumerate(col_ranges):
            # Check if this specific cell has content
            # We need to check the intersection of row and col ranges
            # But wait, this assumes a perfect grid where rows and cols align.
            # If sprites are staggered, this might fail or merge them.
            # But for a sprite sheet, usually they are aligned.
            
            cell_content = has_content[y1:y2, x1:x2]
            if np.any(cell_content):
                # Crop
                sprite = img.crop((x1, y1, x2, y2))
                
                # Optional: Make background transparent
                sprite_data = np.array(sprite)
                # Create mask for this sprite
                sprite_diff = np.sum(np.abs(sprite_data - bg_color), axis=2)
                mask = sprite_diff <= 10
                sprite_data[mask] = [0, 0, 0, 0] # Set to transparent
                sprite = Image.fromarray(sprite_data)

                # Save
                filename = f"sprite_{r_idx}_{c_idx}.png"
                sprite.save(os.path.join(output_dir, filename))
                count += 1
    
    print(f"Extracted {count} sprites to {output_dir}")

if __name__ == "__main__":
    smart_slice()
