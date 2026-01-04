import json
import os

unit_dir = r'c:\Users\kunkka\Downloads\project_aeii-master\core\resources\data\units'
tile_dir = r'c:\Users\kunkka\Downloads\project_aeii-master\core\resources\data\tiles'

print('--- UNITS ---')
for i in range(20):
    fname = os.path.join(unit_dir, f'unit_{i}.json')
    if os.path.exists(fname):
        with open(fname, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"{i}: Price={data.get('price')}, Atk={data.get('attack')}, Move={data.get('movement_point')}, Range={data.get('min_attack_range')}-{data.get('max_attack_range')}")

print('\n--- TILES ---')
for i in range(20):
    fname = os.path.join(tile_dir, f'tile_{i}.dat')
    if os.path.exists(fname):
        with open(fname, 'r') as f:
            content = f.read().strip().split()
            # defence_bonus step_cost hp_recovery type ...
            # TileFactory: defence_bonus, step_cost, hp_recovery, type, top_tile_index, team
            print(f"{i}: Def={content[0]}, Cost={content[1]}, Type={content[3]}")
