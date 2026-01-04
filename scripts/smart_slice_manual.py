from PIL import Image
import numpy as np
import os
import sys

# Increase recursion depth just in case, though we'll use iterative BFS
sys.setrecursionlimit(10000)

image_path = r"d:\webapp\programtools\other\远古帝国重制版现有图块素材\main_texture2.png"
output_dir = r"d:\webapp\programtools\public\sprites_smart_manual"

def smart_slice_manual():
    if not os.path.exists(image_path):
        print("Image not found")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Loading image...")
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    pixels = np.array(img) # Shape: (height, width, 4)

    print(f"Image size: {width}x{height}")

    # Define background: White or Transparent
    # A pixel is background if Alpha < 10 OR (R>250 and G>250 and B>250)
    # Let's create a boolean mask: True = Content, False = Background
    
    alpha = pixels[:, :, 3]
    rgb = pixels[:, :, :3]
    
    is_opaque = alpha > 10
    is_not_white = np.any(rgb < 250, axis=2)
    
    # Content is (Opaque AND Not White)
    # Wait, if the image has no alpha (all 255), then we rely on color.
    # If image has alpha, we rely on alpha.
    # The previous analysis said corners are (255, 255, 255, 255).
    # So background is White Opaque.
    
    content_mask = is_not_white
    
    # If the image actually uses alpha for transparency, we should use that.
    # But the analysis said alpha range is (0, 255), so there ARE transparent pixels?
    # Wait, previous analysis: "Alpha range: (0, 255)".
    # So there are transparent pixels.
    # But corners are (255, 255, 255, 255).
    # Maybe the background is white, but some parts are transparent?
    # Let's assume anything that is NOT (White Opaque) AND NOT (Transparent) is content?
    # Or maybe just anything that is NOT White Opaque?
    
    # Let's stick to: Content = NOT (R>250 & G>250 & B>250 & A>250)
    is_white_bg = (pixels[:, :, 0] > 250) & (pixels[:, :, 1] > 250) & (pixels[:, :, 2] > 250) & (pixels[:, :, 3] > 250)
    is_transparent = pixels[:, :, 3] < 10
    
    # Content is neither white-bg nor transparent
    content_mask = ~(is_white_bg | is_transparent)

    visited = np.zeros((height, width), dtype=bool)
    
    sprites = []

    print("Scanning for sprites...")
    
    # Iterative Flood Fill
    for y in range(height):
        for x in range(width):
            if content_mask[y, x] and not visited[y, x]:
                # Found a new sprite!
                min_x, max_x = x, x
                min_y, max_y = y, y
                
                stack = [(x, y)]
                visited[y, x] = True
                
                pixel_count = 0
                
                while stack:
                    cx, cy = stack.pop()
                    pixel_count += 1
                    
                    # Update bounds
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    
                    # Check neighbors (4-connectivity)
                    neighbors = [
                        (cx+1, cy), (cx-1, cy),
                        (cx, cy+1), (cx, cy-1)
                    ]
                    
                    for nx, ny in neighbors:
                        if 0 <= nx < width and 0 <= ny < height:
                            if content_mask[ny, nx] and not visited[ny, nx]:
                                visited[ny, nx] = True
                                stack.append((nx, ny))
                
                # Sprite found
                if pixel_count > 10: # Filter noise
                    sprites.append((min_x, min_y, max_x, max_y))

    print(f"Found {len(sprites)} sprites.")
    
    # Sort sprites
    # Sort by Y (row) then X (col)
    # Use center Y to group rows
    sprites.sort(key=lambda box: (box[1] // 20) * 10000 + box[0])

    for i, (x1, y1, x2, y2) in enumerate(sprites):
        # Crop (add 1 to max because slice is exclusive)
        sprite = img.crop((x1, y1, x2+1, y2+1))
        
        # Optional: Make background transparent
        # We can iterate the sprite pixels and set white/bg pixels to transparent
        # But for now let's just save the crop
        
        filename = f"sprite_{i}.png"
        sprite.save(os.path.join(output_dir, filename))

    print(f"Saved {len(sprites)} sprites to {output_dir}")

if __name__ == "__main__":
    smart_slice_manual()
