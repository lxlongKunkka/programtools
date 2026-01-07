import json
import os

JAVA_PROJECT_ROOT = r"C:\Users\kunkka\Downloads\project_aeii-master\core\resources\data"
OUTPUT_DIR = r"D:\webapp\programtools\public\data"

def convert_units():
    print("Converting Units...")
    units_dir = os.path.join(JAVA_PROJECT_ROOT, "units")
    with open(os.path.join(units_dir, "unit_config.json"), 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    unit_count = config['unit_count']
    units = []
    
    for i in range(unit_count):
        with open(os.path.join(units_dir, f"unit_{i}.json"), 'r', encoding='utf-8') as f:
            unit_data = json.load(f)
            # Ensure index is set (Java does this in constructor)
            unit_data['index'] = i 
            units.append(unit_data)
            
    # Save config and units
    output = {
        "config": config,
        "units": units
    }
    
    with open(os.path.join(OUTPUT_DIR, "units.json"), 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    print(f"Saved {unit_count} units to units.json")

def parse_tile_dat(content, index):
    # Mimic Java Scanner
    tokens = content.split()
    iterator = iter(tokens)
    
    def next_int():
        return int(next(iterator))
    
    def next_bool():
        val = next(iterator)
        return val.lower() == 'true'
        
    def next_short():
        return int(next(iterator))

    tile = {}
    tile['index'] = index
    tile['defence_bonus'] = next_int()
    tile['step_cost'] = next_int()
    tile['hp_recovery'] = next_int()
    tile['type'] = next_int()
    tile['top_tile_index'] = next_int()
    tile['team'] = next_int()
    
    access_tile_count = next_int()
    if access_tile_count > 0:
        access_list = []
        for _ in range(access_tile_count):
            access_list.append(next_int())
        tile['access_tile_list'] = access_list
        
    is_capturable = next_bool()
    tile['is_capturable'] = is_capturable
    if is_capturable:
        captured_list = []
        for _ in range(5):
            captured_list.append(next_short())
        tile['captured_tile_list'] = captured_list
        
    is_destroyable = next_bool()
    tile['is_destroyable'] = is_destroyable
    if is_destroyable:
        tile['destroyed_tile_index'] = next_short()
        
    is_repairable = next_bool()
    tile['is_repairable'] = is_repairable
    if is_repairable:
        tile['repaired_tile_index'] = next_short()
        
    is_animated = next_bool()
    tile['is_animated'] = is_animated
    if is_animated:
        tile['animation_tile_index'] = next_short()
        
    tile['mini_map_index'] = next_int()
    tile['is_castle'] = next_bool()
    tile['is_village'] = next_bool()
    
    # Check if there are more tokens (hasNextBoolean check in Java)
    try:
        val = next(iterator, None)
        if val is not None:
            # Java: if (din.hasNextBoolean()) boolean is_temple = din.nextBoolean();
            # The token is already consumed by 'val'
            tile['is_temple'] = (val.lower() == 'true')
    except StopIteration:
        pass
        
    return tile

def convert_tiles():
    print("Converting Tiles...")
    tiles_dir = os.path.join(JAVA_PROJECT_ROOT, "tiles")
    
    with open(os.path.join(tiles_dir, "tile_config.dat"), 'r') as f:
        content = f.read()
        count = int(content.split()[0])
        
    tiles = []
    for i in range(count):
        with open(os.path.join(tiles_dir, f"tile_{i}.dat"), 'r') as f:
            content = f.read()
            try:
                tile = parse_tile_dat(content, i)
                tiles.append(tile)
            except Exception as e:
                print(f"Error parsing tile_{i}.dat: {e}")
                
    with open(os.path.join(OUTPUT_DIR, "tiles.json"), 'w', encoding='utf-8') as f:
        json.dump(tiles, f, indent=2)
    print(f"Saved {len(tiles)} tiles to tiles.json")

if __name__ == "__main__":
    convert_units()
    convert_tiles()
