import os
import json

sprites_dir = r"d:\webapp\programtools\public\sprites"
output_file = r"d:\webapp\programtools\public\sprites\manifest.json"

def generate_manifest():
    manifest = {}
    
    for root, dirs, files in os.walk(sprites_dir):
        if root == sprites_dir:
            continue
            
        category = os.path.relpath(root, sprites_dir).replace("\\", "/")
        png_files = sorted([f for f in files if f.endswith('.png')])
        
        if png_files:
            manifest[category] = png_files
            
    with open(output_file, 'w') as f:
        json.dump(manifest, f, indent=2)
        
    print(f"Manifest saved to {output_file}")

if __name__ == "__main__":
    generate_manifest()
