import re

constants_path = r'd:\webapp\programtools\src\game\ancient\constants.js'

def generate_mapping():
    with open(constants_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse TERRAIN
    terrain_map = {}
    terrain_block = re.search(r'export const TERRAIN = \{([^}]+)\};', content, re.DOTALL).group(1)
    for line in terrain_block.split('\n'):
        line = line.strip()
        if ':' in line:
            key, val = line.split(':')
            key = key.strip()
            val = int(val.strip().replace(',', ''))
            terrain_map[key] = val
            # Also map value to key for debugging
            terrain_map[val] = key

    # Parse TERRAIN_SPRITES
    sprite_map = {}
    sprites_block = re.search(r'export const TERRAIN_SPRITES = \{([^}]+)\};', content, re.DOTALL).group(1)
    
    # Matches [TERRAIN.KEY]: 'tXX'
    matches = re.findall(r'\[TERRAIN\.(\w+)\]:\s*\'t(\d+)\'', sprites_block)
    
    aem_to_terrain = {}
    
    for terrain_name, sprite_idx in matches:
        sprite_idx = int(sprite_idx)
        terrain_id = terrain_map[terrain_name]
        
        if sprite_idx in aem_to_terrain:
            existing_id = aem_to_terrain[sprite_idx]
            # print(f"Collision for t{sprite_idx}: {terrain_map[existing_id]} ({existing_id}) vs {terrain_name} ({terrain_id})")
            # Prefer the one that matches the sprite index if possible? No.
            # Prefer the "simpler" one?
            # e.g. MOUNTAIN (2) vs MOUNTAIN_SMALL (119) for t17.
            # If AEM has 17, it probably means MOUNTAIN.
            
            # Heuristic: Prefer lower ID if < 100 (Base types)
            if existing_id < 100 and terrain_id >= 100:
                continue
            if terrain_id < 100 and existing_id >= 100:
                aem_to_terrain[sprite_idx] = terrain_id
                continue
                
            # Special cases
            if sprite_idx == 17: # Mountain
                # 2 vs 119. Prefer 2.
                if terrain_id == 2: aem_to_terrain[sprite_idx] = terrain_id
            elif sprite_idx == 30: # Village
                # 5 vs 130 (Heal). Prefer 5.
                if terrain_id == 5: aem_to_terrain[sprite_idx] = terrain_id
            elif sprite_idx == 37: # Castle
                # 4 vs 137 (Castle 2). Prefer 4.
                if terrain_id == 4: aem_to_terrain[sprite_idx] = terrain_id
                
        else:
            aem_to_terrain[sprite_idx] = terrain_id

    print("TILE_MAPPING = {")
    for k in sorted(aem_to_terrain.keys()):
        print(f"    {k}: {aem_to_terrain[k]}, # {terrain_map[aem_to_terrain[k]]}")
    print("}")

if __name__ == '__main__':
    generate_mapping()
