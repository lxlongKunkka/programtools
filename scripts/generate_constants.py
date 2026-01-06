import re
import json

constants_path = 'src/game/ancient/constants.js'
tiles_path = 'src/game/ancient/tiles.json'

with open(constants_path, 'r', encoding='utf-8') as f:
    content = f.read()

with open(tiles_path, 'r', encoding='utf-8') as f:
    tiles_data = json.load(f)

# Extract TERRAIN_SPRITES to build the mapping
match = re.search(r'export const TERRAIN_SPRITES = \{([^}]+)\};', content, re.DOTALL)
if not match:
    print("Could not find TERRAIN_SPRITES")
    exit(1)

sprites_content = match.group(1)

# Build the new map
new_terrain_map = {}
for line in sprites_content.split('\n'):
    line = line.strip()
    # Match [TERRAIN.NAME]: 'tID'
    m = re.match(r'\[TERRAIN\.(\w+)\]:\s*[\'"]t(\d+)[\'"]', line)
    if m:
        name = m.group(1)
        new_id = int(m.group(2))
        new_terrain_map[name] = new_id

# Generate the new TERRAIN block
new_terrain_block = "export const TERRAIN = {\n"
sorted_items = sorted(new_terrain_map.items(), key=lambda x: x[1])
for name, new_id in sorted_items:
    new_terrain_block += f"  {name}: {new_id},\n"
new_terrain_block += "};"

# Replace the old TERRAIN block in the content
start_idx = content.find("export const TERRAIN = {")
if start_idx == -1:
    print("Could not find start of TERRAIN")
    exit(1)

end_idx = content.find("// export const UNIT_TYPES", start_idx)
if end_idx == -1:
    end_idx = content.find("export const UNIT_TYPES", start_idx)

if end_idx == -1:
    print("Could not find end of TERRAIN block")
    exit(1)

block_end = content.rfind("};", start_idx, end_idx) + 2
if block_end == -1:
    print("Could not find closing brace of TERRAIN block")
    exit(1)

content = content[:start_idx] + new_terrain_block + "\n\n" + content[block_end:].lstrip()

# Now generate TERRAIN_STATS
# We want to generate stats for ALL tiles in tiles.json, or at least those in TERRAIN.
# Actually, TERRAIN_STATS should probably be keyed by ID (which is what [TERRAIN.NAME] does).
# So we can just iterate over tiles_data.

new_stats_block = "export const TERRAIN_STATS = {\n"
for tile in tiles_data:
    tid = tile['id']
    # We can use [TERRAIN.NAME] if we have a name for this ID, otherwise just use the ID?
    # But constants.js usually uses [TERRAIN.NAME].
    # If we don't have a name, we can't use [TERRAIN.NAME].
    # But we can use the integer ID directly:  18: { ... },
    # Mixed keys are fine in JS objects.
    
    # Let's try to find a name for this ID
    name = None
    for n, i in new_terrain_map.items():
        if i == tid:
            name = n
            break
    
    stats = f"{{ defense: {tile['defence_bonus']}, cost: {tile['step_cost']}, type: {tile['type']} }}"
    
    if name:
        new_stats_block += f"  [TERRAIN.{name}]: {stats},\n"
    else:
        # If no name, maybe skip or use ID?
        # Let's use ID to be safe, so GameState works for all tiles.
        new_stats_block += f"  {tid}: {stats},\n"

new_stats_block += "};"

# Replace TERRAIN_STATS block
start_stats = content.find("export const TERRAIN_STATS = {")
if start_stats != -1:
    # Find end of stats block
    # It ends before export const TERRAIN_QUOTES (or whatever is next)
    # Let's assume it ends at };
    # We can use a similar logic or just regex
    
    # Look for next export
    next_export_idx = content.find("export const", start_stats + 10)
    if next_export_idx == -1:
        next_export_idx = len(content)
        
    block_end_stats = content.rfind("};", start_stats, next_export_idx) + 2
    
    content = content[:start_stats] + new_stats_block + "\n\n" + content[block_end_stats:].lstrip()
else:
    print("Could not find TERRAIN_STATS block to replace")

# Write the new content
with open(constants_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated constants.js with TERRAIN and TERRAIN_STATS")
