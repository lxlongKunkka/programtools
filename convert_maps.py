import os
import struct
import json

# Constants from JS project
TERRAIN = {
  'PLAIN': 0,
  'FOREST': 1,
  'MOUNTAIN': 2,
  'WATER': 3,
  'CASTLE': 4,
  'VILLAGE': 5,
  'MOUNTAIN_SMALL': 119,
  'SNOW_PLAIN': 118,
  'BRIDGE_H': 128,
  'BRIDGE_V': 129,
  'VILLAGE_RUIN': 127,
  'TEMPLE': 180,
  'TOWN': 136,
  'REEF': 181 # REEF_3
}

# Mapping from Java Tile Index to JS Terrain ID
# Generated from constants.js TERRAIN_SPRITES
TILE_MAPPING = {
    0: 3, # WATER
    1: 101, # WATER_SHIMMER
    2: 102, # WATER_SHIMMER_2
    3: 103, # WATER_R_LAND
    4: 104, # WATER_RB_LAND
    5: 105, # WATER_BR_LAND
    6: 106, # WATER_B_LAND
    7: 107, # WATER_BL_LAND
    8: 108, # WATER_LB_LAND
    9: 109, # WATER_L_LAND
    10: 110, # WATER_TR_LAND
    11: 111, # WATER_T_LAND
    12: 112, # WATER_TL_LAND
    13: 115, # FOREST_3
    14: 116, # FOREST_2
    15: 1, # FOREST
    16: 117, # MOUNTAIN_HIGH
    17: 2, # MOUNTAIN
    18: 0, # PLAIN
    19: 118, # SNOW_PLAIN
    20: 120, # SNOW_ROAD_H
    21: 121, # SNOW_ROAD_V
    22: 122, # SNOW_ROAD_CROSS
    23: 123, # SNOW_ROAD_L_B
    24: 124, # SNOW_ROAD_L_T
    25: 125, # SNOW_ROAD_T_R
    26: 126, # SNOW_ROAD_B_R
    27: 127, # VILLAGE_RUIN
    28: 128, # BRIDGE_H
    29: 129, # BRIDGE_V
    30: 5, # VILLAGE
    31: 131, # TEMPLE_HEAL
    32: 132, # SNOW_BUILDING_1
    33: 133, # SNOW_BUILDING_2
    34: 134, # SNOW_BUILDING_3
    35: 135, # SNOW_BUILDING_4
    36: 136, # TOWN
    37: 4, # CASTLE
    38: 138, # WATER_TL_BL_LAND
    39: 4, # CASTLE (Blue) - Was 139
    40: 140, # WATER_TR_BR_LAND
    41: 4, # CASTLE (Red) - Was 141
    42: 142, # WATER_TL_BR_LAND
    43: 4, # CASTLE (Green) - Was 143
    44: 144, # WATER_TL_TR_BL_LAND
    45: 4, # CASTLE (Black) - Was 145
    46: 146, # WATER_TR_BL_BR_LAND
    47: 147, # WATER_TL_BL_BR_LAND
    48: 148, # WATER_CORNERS_LAND
    49: 149, # WATER_BL_BR_T_LAND
    50: 150, # WATER_TL_TR_B_LAND
    51: 151, # WATER_TL_BL_R_LAND
    52: 152, # WATER_L_TR_BR_LAND
    53: 153, # WATER_T_BR_LAND
    54: 154, # WATER_T_BL_LAND
    55: 155, # WATER_TL_B_LAND
    56: 156, # WATER_TR_B_LAND
    57: 157, # WATER_TL_R_LAND
    58: 158, # WATER_BL_R_LAND
    59: 159, # WATER_L_TR_LAND
    60: 160, # WATER_L_BR_LAND
    61: 161, # WATER_T_R_BL_LAND
    62: 162, # WATER_TL_R_B_LAND
    63: 163, # WATER_L_B_TR_LAND
    64: 164, # WATER_L_T_BR_LAND
    65: 165, # WATER_T_B_LAND
    66: 166, # WATER_L_R_LAND
    67: 167, # WATER_T_R_B_LAND
    68: 168, # WATER_T_L_B_LAND
    69: 169, # WATER_L_T_R_LAND
    70: 170, # WATER_L_B_R_LAND
    71: 171, # WATER_ALL_LAND
    72: 172, # SNOW_ROAD_T_B_R
    73: 173, # SNOW_ROAD_L_T_R
    74: 174, # SNOW_ROAD_L_R_B
    75: 175, # SNOW_ROAD_T_B_L
    76: 176, # SNOW_ROAD_END_T
    77: 177, # SNOW_ROAD_END_B
    78: 178, # SNOW_ROAD_END_R
    79: 179, # SNOW_ROAD_END_L
    80: 180, # TEMPLE
    81: 181, # REEF_3
    82: 182, # REEF_2
    83: 183, # TEMPLE_WATER
}

# Mapping from Java Unit Index to JS Unit Type String
UNIT_MAPPING = {
    0: 'soldier',
    1: 'archer',
    2: 'water_elemental',
    3: 'sorceress',
    4: 'elf', # Wisp/Elf
    5: 'knight',
    6: 'paladin', # Or Wolf?
    7: 'catapult',
    8: 'dragon',
    9: 'king',
    10: 'skeleton',
    11: 'wisdom_crystal',
    12: 'paladin',
    14: 'dark_mage',
    18: 'slime',
    # Fill others as needed
}

TEAMS = {
    0: 'blue',
    1: 'red',
    2: 'green',
    3: 'black'
}

def read_utf(f):
    # Java writeUTF writes length (short) then bytes
    length_bytes = f.read(2)
    if not length_bytes: return None
    length = struct.unpack('>H', length_bytes)[0]
    string_bytes = f.read(length)
    return string_bytes.decode('utf-8')

def convert_aem(file_path):
    try:
        with open(file_path, 'rb') as f:
            # 1. Author Name
            author = read_utf(f)
            
            # 2. Team Access (4 booleans)
            team_access = []
            for _ in range(4):
                team_access.append(bool(f.read(1)))
                
            # 3. Width, Height (Ints)
            width = struct.unpack('>i', f.read(4))[0]
            height = struct.unpack('>i', f.read(4))[0]
            
            # 4. Terrain Data (Shorts)
            terrain_grid = []
            buildings = []
            
            for x in range(width):
                col = []
                for y in range(height):
                    tile_index = struct.unpack('>h', f.read(2))[0]
                    
                    # Map to JS Terrain
                    js_terrain = TILE_MAPPING.get(tile_index, 0) # Default to Plain
                    
                    # Handle Buildings (Castle, Village, Town)
                    # In JS, these are terrain types but also need entries in 'buildings' list for ownership
                    # We need to infer ownership. In .aem, ownership is stored in the tile data?
                    # No, MapFactory says: "short tile_index = checkTile(dis.readShort()); map.setTile(tile_index, x, y);"
                    # Ownership seems to be implicit in the tile index for Castles?
                    # Or maybe buildings are separate?
                    # Wait, MapFactory.createTeamAccess checks tile.getTeam().
                    # TileFactory loads 'team' from tile_X.dat.
                    # So specific tile indices correspond to Blue Castle, Red Castle, etc.
                    
                    # We need to know which tile indices are owned buildings.
                    # For now, we'll just map the terrain type.
                    # We might need to post-process buildings based on location (e.g. near start) or if we can map specific indices.
                    
                    col.append(js_terrain)
                terrain_grid.append(col)
                
            # Transpose to [y][x] for JS
            js_terrain_grid = [[terrain_grid[x][y] for x in range(width)] for y in range(height)]
            
            # 5. Units
            unit_count = struct.unpack('>i', f.read(4))[0]
            units = []
            
            for _ in range(unit_count):
                team_idx = struct.unpack('>i', f.read(4))[0]
                unit_idx = struct.unpack('>i', f.read(4))[0]
                x = struct.unpack('>i', f.read(4))[0]
                y = struct.unpack('>i', f.read(4))[0]
                
                unit_type = UNIT_MAPPING.get(unit_idx, 'soldier')
                team = TEAMS.get(team_idx, 'blue')
                
                units.append({
                    'type': unit_type,
                    'team': team,
                    'x': x,
                    'y': y
                })
                
            # Construct JSON
            map_data = {
                'name': os.path.splitext(os.path.basename(file_path))[0],
                'author': author,
                'width': width,
                'height': height,
                'mapData': js_terrain_grid,
                'units': units,
                'buildings': [] # We need to populate this
            }
            
            # Heuristic for buildings:
            # Iterate terrain, if Castle/Village/Town, add to buildings list.
            # Default to Neutral.
            # If a unit is on top, maybe set team? No.
            # We need the tile index mapping to know the team.
            # For now, set all to Neutral, except maybe Castles near units?
            
            for y in range(height):
                for x in range(width):
                    t = js_terrain_grid[y][x]
                    if t in [TERRAIN['CASTLE'], TERRAIN['VILLAGE'], TERRAIN['TOWN']]:
                        # Check if any unit is on it (King?)
                        owner = None
                        # Simple heuristic: If King is on Castle, it's theirs.
                        king = next((u for u in units if u['x'] == x and u['y'] == y and u['type'] == 'king'), None)
                        if king and t == TERRAIN['CASTLE']:
                            owner = king['team']
                        
                        map_data['buildings'].append({
                            'type': 'castle' if t == TERRAIN['CASTLE'] else ('town' if t == TERRAIN['TOWN'] else 'village'),
                            'team': owner, # Null for neutral
                            'x': x,
                            'y': y
                        })

            return map_data

    except Exception as e:
        print(f"Error converting {file_path}: {e}")
        return None

def main():
    base_input_dir = r'c:\Users\kunkka\Downloads\project_aeii-master\android\assets\map'
    output_dir = r'd:\webapp\programtools\public\maps'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    converted_count = 0
    map_list = []

    # Define directories to process: root and campaign
    dirs_to_process = [
        base_input_dir,
        os.path.join(base_input_dir, 'campaign')
    ]
    
    for input_dir in dirs_to_process:
        if not os.path.exists(input_dir):
            print(f"Directory not found: {input_dir}")
            continue

        print(f"Scanning directory: {input_dir}")
        files = [f for f in os.listdir(input_dir) if f.endswith('.aem')]
        
        for f in files:
            input_path = os.path.join(input_dir, f)
            json_filename = f.replace('.aem', '.json')
            output_path = os.path.join(output_dir, json_filename)
            
            print(f"Converting {f}...")
            data = convert_aem(input_path)
            
            if data:
                with open(output_path, 'w', encoding='utf-8') as out:
                    json.dump(data, out, indent=2)
                converted_count += 1
                map_list.append(json_filename)
            
    # Save map list
    with open(os.path.join(output_dir, 'map_list.json'), 'w', encoding='utf-8') as f:
        json.dump(map_list, f, indent=2)
            
    print(f"Converted {converted_count} maps. Saved map_list.json.")

if __name__ == "__main__":
    main()
