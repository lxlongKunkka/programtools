from PIL import Image
import os
import sys

# Increase recursion depth just in case
sys.setrecursionlimit(20000)

image_path = r"d:\webapp\programtools\other\远古帝国重制版现有图块素材\main_texture2.png"
output_dir = r"d:\webapp\programtools\public\sprites_smart_pil"

def is_background(pixel):
    # Pixel is tuple (R, G, B, A)
    r, g, b, a = pixel
    
    # Transparent
    if a < 10: return True
    
    # White
    if r > 250 and g > 250 and b > 250: return True
    
    return False

def smart_slice_pil():
    if not os.path.exists(image_path):
        print("Image not found")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Loading image...")
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    print(f"Image size: {width}x{height}")

    visited = set()
    sprites = []

    print("Scanning for sprites...")
    
    # Get all pixels at once to avoid function call overhead? 
    # Actually getdata() returns a flat sequence, might be harder to index by x,y.
    # Let's stick to getpixel or load(). load() is faster.
    pixels = img.load()

    for y in range(height):
        for x in range(width):
            if (x, y) in visited:
                continue
            
            pixel = pixels[x, y]
            
            if not is_background(pixel):
                # Found new sprite content
                min_x, max_x = x, x
                min_y, max_y = y, y
                
                stack = [(x, y)]
                visited.add((x, y))
                
                pixel_count = 0
                
                while stack:
                    cx, cy = stack.pop()
                    pixel_count += 1
                    
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    
                    # Neighbors
                    neighbors = [
                        (cx+1, cy), (cx-1, cy),
                        (cx, cy+1), (cx, cy-1)
                    ]
                    
                    for nx, ny in neighbors:
                        if 0 <= nx < width and 0 <= ny < height:
                            if (nx, ny) not in visited:
                                npixel = pixels[nx, ny]
                                if not is_background(npixel):
                                    visited.add((nx, ny))
                                    stack.append((nx, ny))
                
                if pixel_count > 10:
                    sprites.append((min_x, min_y, max_x, max_y))

    print(f"Found {len(sprites)} sprites.")
    
    # Sort sprites
    sprites.sort(key=lambda box: (box[1] // 20) * 10000 + box[0])

    for i, (x1, y1, x2, y2) in enumerate(sprites):
        # Crop
        sprite = img.crop((x1, y1, x2+1, y2+1))
        
        # Make background transparent in the sprite
        # Create new data
        datas = sprite.getdata()
        new_data = []
        for item in datas:
            if is_background(item):
                new_data.append((255, 255, 255, 0)) # Transparent
            else:
                new_data.append(item)
        sprite.putdata(new_data)
        
        filename = f"sprite_{i}.png"
        sprite.save(os.path.join(output_dir, filename))

    print(f"Saved {len(sprites)} sprites to {output_dir}")

if __name__ == "__main__":
    smart_slice_pil()
