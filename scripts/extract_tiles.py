import os
import json

def parse_tile_dat(file_path, index):
    with open(file_path, 'r') as f:
        content = f.read().split()
    
    iterator = iter(content)
    
    def next_token():
        return next(iterator)
    
    def next_int():
        return int(next_token())
    
    def next_bool():
        token = next_token().lower()
        return token == 'true'
    
    data = {
        'id': index,
        'defence_bonus': next_int(),
        'step_cost': next_int(),
        'hp_recovery': next_int(),
        'type': next_int(),
        'top_tile_index': next_int(),
        'team': next_int(),
    }
    
    access_tile_count = next_int()
    data['access_tile_list'] = []
    if access_tile_count > 0:
        for _ in range(access_tile_count):
            data['access_tile_list'].append(next_int())
            
    data['is_capturable'] = next_bool()
    if data['is_capturable']:
        data['captured_tile_list'] = []
        for _ in range(5):
            data['captured_tile_list'].append(next_int())
            
    data['is_destroyable'] = next_bool()
    if data['is_destroyable']:
        data['destroyed_tile_index'] = next_int()
        
    data['is_repairable'] = next_bool()
    if data['is_repairable']:
        data['repaired_tile_index'] = next_int()
        
    data['is_animated'] = next_bool()
    if data['is_animated']:
        data['animation_tile_index'] = next_int()
        
    data['mini_map_index'] = next_int()
    data['is_castle'] = next_bool()
    data['is_village'] = next_bool()
    
    try:
        data['is_temple'] = next_bool()
    except StopIteration:
        data['is_temple'] = False
        
    return data

def main():
    source_dir = r"c:\Users\kunkka\Downloads\project_aeii-master\core\resources\data\tiles"
    output_file = r"d:\webapp\programtools\public\data\tiles.json"
    
    # Read tile_config.dat to get count
    with open(os.path.join(source_dir, "tile_config.dat"), 'r') as f:
        tile_count = int(f.read().strip())
        
    tiles = []
    for i in range(tile_count):
        file_path = os.path.join(source_dir, f"tile_{i}.dat")
        if os.path.exists(file_path):
            tile_data = parse_tile_dat(file_path, i)
            tiles.append(tile_data)
        else:
            print(f"Warning: {file_path} not found")
            
    # Create directory if not exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(tiles, f, indent=2)
        
    print(f"Exported {len(tiles)} tiles to {output_file}")

if __name__ == "__main__":
    main()
