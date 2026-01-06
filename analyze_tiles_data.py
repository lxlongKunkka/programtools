import os
import struct

def read_bool(f):
    line = f.readline().strip()
    return line == "true"

def read_int(f):
    line = f.readline().strip()
    try:
        return int(line)
    except ValueError:
        return 0

def parse_tile(file_path, index):
    with open(file_path, 'r') as f:
        try:
            defence_bonus = read_int(f)
            step_cost = read_int(f)
            hp_recovery = read_int(f)
            type_val = read_int(f)
            top_tile_index = read_int(f)
            team = read_int(f)
            
            access_tile_count = read_int(f)
            if access_tile_count > 0:
                for _ in range(access_tile_count):
                    read_int(f)
            
            is_capturable = read_bool(f)
            if is_capturable:
                for _ in range(5):
                    read_int(f) # captured_tile_list
            
            is_destroyable = read_bool(f)
            if is_destroyable:
                read_int(f) # destroyed_index
            
            is_repairable = read_bool(f)
            if is_repairable:
                read_int(f) # repaired_index
            
            is_animated = read_bool(f)
            if is_animated:
                read_int(f) # animation_tile_index
            
            mini_map_index = read_int(f)
            is_castle = read_bool(f)
            is_village = read_bool(f)
            
            # Optional temple
            # is_temple = read_bool(f) 
            
            return {
                "id": index,
                "team": team,
                "type": type_val,
                "is_castle": is_castle,
                "is_village": is_village,
                "is_capturable": is_capturable,
                "defense": defence_bonus,
                "cost": step_cost
            }
        except Exception as e:
            return {"id": index, "error": str(e)}

data_dir = r"c:\Users\kunkka\Downloads\project_aeii-master\core\resources\data\tiles"
tiles = []

# Find all tile files
for filename in os.listdir(data_dir):
    if filename.startswith("tile_") and filename.endswith(".dat") and filename != "tile_config.dat":
        try:
            idx = int(filename.replace("tile_", "").replace(".dat", ""))
            tiles.append(parse_tile(os.path.join(data_dir, filename), idx))
        except:
            pass

tiles.sort(key=lambda x: x["id"])

print(f"{'ID':<5} {'Team':<5} {'Castle':<7} {'Village':<8} {'Capt':<5} {'Type':<5} {'Def':<5} {'Cost':<5}")
print("-" * 60)
for t in tiles:
    if "error" in t:
        print(f"{t['id']:<5} ERROR: {t['error']}")
        continue
        
    # Highlight interesting tiles
    is_building = t['is_castle'] or t['is_village'] or t['is_capturable']
    prefix = "*" if is_building else " "
    
    print(f"{prefix}{t['id']:<4} {t['team']:<5} {str(t['is_castle']):<7} {str(t['is_village']):<8} {str(t['is_capturable']):<5} {t['type']:<5} {t['defense']:<5} {t['cost']:<5}")
