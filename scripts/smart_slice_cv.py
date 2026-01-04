import cv2
import numpy as np
import os

image_path = r"d:\webapp\programtools\other\远古帝国重制版现有图块素材\main_texture2.png"
output_dir = r"d:\webapp\programtools\public\sprites_smart"

def smart_slice_cv():
    if not os.path.exists(image_path):
        print("Image not found")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Read image with alpha channel
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    
    if img is None:
        print("Failed to load image")
        return

    print(f"Image shape: {img.shape}")

    # Handle background
    # If image has alpha channel (4 channels)
    if img.shape[2] == 4:
        # Extract alpha channel
        alpha = img[:, :, 3]
        # Create a mask where alpha is not 0 (content)
        _, mask = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)
    else:
        # Assume white background [255, 255, 255]
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Invert: background becomes black (0), content becomes white
        # Assuming background is white (255)
        _, mask = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)

    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    print(f"Found {len(contours)} potential sprites.")

    count = 0
    min_area = 50 # Ignore tiny noise
    
    # Sort contours by position (top-left to bottom-right)
    # cv2.boundingRect returns (x, y, w, h)
    bounding_boxes = [cv2.boundingRect(c) for c in contours]
    
    # Sort by Y first (with some tolerance for rows), then X
    # This helps keep sprites in order
    def sort_key(box):
        x, y, w, h = box
        return (y // 20) * 10000 + x # Group by rows of ~20px height

    bounding_boxes.sort(key=sort_key)

    for i, (x, y, w, h) in enumerate(bounding_boxes):
        if w * h < min_area:
            continue
            
        # Extract sprite
        sprite = img[y:y+h, x:x+w]
        
        # Save
        filename = f"sprite_{i}.png"
        cv2.imwrite(os.path.join(output_dir, filename), sprite)
        count += 1

    print(f"Saved {count} sprites to {output_dir}")

if __name__ == "__main__":
    smart_slice_cv()
