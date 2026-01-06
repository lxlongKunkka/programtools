import os
import struct
import json

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
            
            for x in range(width):
                col = []
                for y in range(height):
                    tile_index = struct.unpack('>h', f.read(2))[0]
                    # Use raw tile index
                    col.append(tile_index)
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
                'buildings': [] # We will populate this in JS based on tile properties
            }
            
            return map_data

    except Exception as e:
        print(f"Error converting {file_path}: {e}")
        return None

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
