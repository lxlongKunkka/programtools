
import sys
import zlib

def analyze_header(file_path):
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
            
        print(f"File: {file_path}")
        print(f"Total Size: {len(data)}")
        print(f"Hex Head: {data[:20].hex()}")
        
        # Try ZLIB decompression with offsets
        for i in range(50):
            try:
                decompressed = zlib.decompress(data[i:])
                print(f"SUCCESS: ZLIB Decompressed at offset {i}!")
                print(f"Decompressed Size: {len(decompressed)}")
                # Print first 100 bytes of decompressed data
                print(f"Head Hex: {decompressed[:50].hex()}")
                printable = ''.join(chr(b) if 32 <= b <= 126 else '.' for b in decompressed[:100])
                print(f"Head ASCII: {printable}")
                return
            except:
                pass
        
        print("Failed to decompress with offsets 0-50")
        
        print("-" * 20)
        print("Strings found in file:")
        import re
        # Find all strings of printable characters length >= 4
        strings = re.findall(b'[ -~]{4,}', data)
        for s in strings:
            print(s.decode('ascii'))

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_header(r"c:\Users\kunkka\Downloads\project_aeii-master\android\assets\map\classic 1 200.aem")
