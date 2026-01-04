import os
import json

ATLAS_DIR = 'public/sprites_atlas'
MANIFEST_PATH = os.path.join(ATLAS_DIR, 'manifest.json')

categories = {
    'units': [],
    'terrain': [],
    'particles': [],
    'icons': [],
    'ui': [],
    'misc': []
}

for f in os.listdir(ATLAS_DIR):
    if not f.endswith('.png'): continue
    
    if f.startswith('u') and f[1].isdigit():
        # Filter out sliced parts if any (e.g. u0_0.png)
        if '_' not in f:
            categories['units'].append(f)
    elif f.startswith('t') and f[1].isdigit():
        categories['terrain'].append(f)
    elif f.startswith('p') and f[1].isdigit():
        categories['particles'].append(f)
    elif f.startswith('icons_'):
        categories['icons'].append(f)
    elif f in ['button_regular_down.png', 'button_regular_up.png', 'border.png', 'background_scroll_pane.png', 'background_text_field.png', 'list_selection.png', 'text_field_cursor.png', 'text_field_selection.png', 'cursor_normal.png', 'cursor_attack.png', 'cursor_target.png']:
        categories['ui'].append(f)
    else:
        categories['misc'].append(f)

# Sort lists
for k in categories:
    categories[k].sort(key=lambda x: (len(x), x))

with open(MANIFEST_PATH, 'w') as f:
    json.dump(categories, f, indent=2)

print(f"Generated manifest at {MANIFEST_PATH}")
