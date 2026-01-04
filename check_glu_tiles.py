import struct

def check_tiles():
    file_path = r'c:\Users\kunkka\Downloads\project_aeii-master\android\assets\map\Glu.aem'
    
    with open(file_path, 'rb') as f:
        # Skip header
        f.read(2) # Author len
        author_len = struct.unpack('>H', f.read(2))[0] # Wait, read_utf reads len then bytes.
        # My read_utf:
        # length_bytes = f.read(2)
        # length = struct.unpack('>H', length_bytes)[0]
        # string_bytes = f.read(length)
        
        # So I need to skip author properly.
        f.seek(0)
        l = struct.unpack('>H', f.read(2))[0]
        f.read(l)
        
        f.read(4) # Team access
        
        width = struct.unpack('>i', f.read(4))[0]
        height = struct.unpack('>i', f.read(4))[0]
        
        grid = []
        for x in range(width):
            col = []
            for y in range(height):
                tile_index = struct.unpack('>h', f.read(2))[0]
                col.append(tile_index)
            grid.append(col)
            
        # Points of interest
        # Blue King (3, 4)
        # Red King (9, 8)
        # Green King (3, 14)
        
        points = [
            (3, 4, "Blue King"),
            (9, 8, "Red King"),
            (3, 14, "Green King"),
            (2, 4, "Town near Blue"),
            (4, 9, "Castle (Neutral?)"),
            (9, 9, "Town near Red"),
            (2, 14, "Town near Green")
        ]
        
        for x, y, label in points:
            val = grid[x][y]
            print(f"{label} at ({x}, {y}): Index {val}")

if __name__ == '__main__':
    check_tiles()
