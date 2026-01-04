import os
import json
from PIL import Image
import math

sprites_dir = r"d:\webapp\programtools\public\sprites"
output_file = r"d:\webapp\programtools\scripts\sprite_analysis.json"

def get_dominant_color_category(r, g, b):
    # Simple color categorization
    if r < 50 and g < 50 and b < 50: return "dark"
    if r > 200 and g > 200 and b > 200: return "white"
    
    if r > g + 30 and r > b + 30: return "red"
    if b > r + 30 and b > g + 30: return "blue"
    if g > r + 30 and g > b + 30: return "green"
    
    if r > 150 and g > 150 and b < 100: return "yellow"
    if r > 100 and g < 100 and b > 100: return "purple"
    if r < 100 and g > 100 and b > 100: return "cyan"
    
    return "neutral"

def analyze_sprites():
    results = []
    
    if not os.path.exists(sprites_dir):
        print("Sprites dir not found")
        return

    files = sorted([f for f in os.listdir(sprites_dir) if f.endswith('.png')])
    
    for f in files:
        path = os.path.join(sprites_dir, f)
        try:
            img = Image.open(path).convert("RGBA")
            width, height = img.size
            
            pixels = img.getdata()
            non_transparent_count = 0
            total_r, total_g, total_b = 0, 0, 0
            
            for r, g, b, a in pixels:
                if a > 10:
                    non_transparent_count += 1
                    total_r += r
                    total_g += g
                    total_b += b
            
            total_pixels = width * height
            coverage = non_transparent_count / total_pixels if total_pixels > 0 else 0
            
            avg_r = total_r // non_transparent_count if non_transparent_count > 0 else 0
            avg_g = total_g // non_transparent_count if non_transparent_count > 0 else 0
            avg_b = total_b // non_transparent_count if non_transparent_count > 0 else 0
            
            color_cat = get_dominant_color_category(avg_r, avg_g, avg_b)
            
            # Extract ID from filename "sprite_123.png"
            try:
                sprite_id = int(f.split('_')[1].split('.')[0])
            except:
                sprite_id = -1

            results.append({
                "filename": f,
                "id": sprite_id,
                "width": width,
                "height": height,
                "coverage": round(coverage, 3),
                "color": color_cat,
                "rgb": [avg_r, avg_g, avg_b]
            })
            
        except Exception as e:
            print(f"Error processing {f}: {e}")

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Analyzed {len(results)} sprites. Results saved to {output_file}")

if __name__ == "__main__":
    analyze_sprites()
