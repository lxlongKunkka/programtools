import struct
import os

def read_utf(f):
    length_bytes = f.read(2)
    if not length_bytes: return None
    length = struct.unpack('>H', length_bytes)[0]
    string_bytes = f.read(length)
    return string_bytes.decode('utf-8')

def analyze_glu():
    file_path = r'c:\Users\kunkka\Downloads\project_aeii-master\android\assets\map\Glu.aem'
    
    with open(file_path, 'rb') as f:
        author = read_utf(f)
        print(f"Author: {author}")
        
        # Team Access
        f.read(4)
        
        width = struct.unpack('>i', f.read(4))[0]
        height = struct.unpack('>i', f.read(4))[0]
        print(f"Size: {width}x{height}")
        
        unique_tiles = set()
        grid = []
        
        for x in range(width):
            col = []
            for y in range(height):
                tile_index = struct.unpack('>h', f.read(2))[0]
                unique_tiles.add(tile_index)
                col.append(tile_index)
            grid.append(col)
            
        print(f"Unique Tile Indices: {sorted(list(unique_tiles))}")
        
        # Print a small section to visualize
        print("\nTop-left 10x10 grid of indices:")
        # Transpose for printing
        for y in range(min(height, 10)):
            row_str = ""
            for x in range(min(width, 10)):
                row_str += f"{grid[x][y]:3d} "
            print(row_str)

if __name__ == '__main__':
    analyze_glu()
