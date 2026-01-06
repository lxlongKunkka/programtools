from PIL import Image
import os

def get_colors(img_path):
    img = Image.open(img_path).convert("RGBA")
    colors = set()
    for item in img.getdata():
        if item[3] > 0: # Not transparent
            colors.add(item)
    return colors

sheet_path = "d:/webapp/programtools/public/sprites_atlas/unit_sheet_0.png"
u19_path = "d:/webapp/programtools/sprites_source/u19_0.png"

sheet_colors = get_colors(sheet_path)
u19_colors = get_colors(u19_path)

# Find colors in u19 that are NOT in sheet (excluding the newly added u19 itself which is now in the sheet... wait, the sheet was already updated)
# Actually, I should check the *original* sheet.
# But since I updated it, the sheet now contains u19 colors.

# Let's count how many "Blue" pixels are in u19.
def is_blue(rgba):
    r, g, b, a = rgba
    # Simple heuristic for Blue dominant
    return b > r + 20 and b > g + 20

u19_blues = [c for c in u19_colors if is_blue(c)]
print(f"u19 has {len(u19_colors)} unique colors.")
print(f"u19 has {len(u19_blues)} blue-ish colors.")

# Now check u19 vs u0 (Soldier) roughly
# Since I can't easily isolate u0 from the big sheet without coordinates, I'll just check if these u19 blues exist in the REST of the sheet.
# Since I just appended u19 to the sheet, I can assume the first 456 pixels width are the "Old" sheet.
img_sheet = Image.open(sheet_path).convert("RGBA")
old_sheet_crop = img_sheet.crop((0, 0, 456, 48))
old_sheet_colors = set()
for item in old_sheet_crop.getdata():
    if item[3] > 0:
        old_sheet_colors.add(item)
        
missing_blues = [c for c in u19_blues if c not in old_sheet_colors]
print(f"Blues in u19 that were NOT in the original sheet: {len(missing_blues)}")
print(f"Examples: {missing_blues[:5]}")
