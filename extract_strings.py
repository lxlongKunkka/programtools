
import sys
import re

def extract_strings(file_path):
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
        
        # Find strings of length >= 4
        strings = re.findall(b'[a-zA-Z0-9_/.]{4,}', data)
        
        for s in strings:
            try:
                decoded = s.decode('ascii')
                if "net/toyknight" in decoded or "Map" in decoded or "Loader" in decoded:
                    print(decoded)
            except:
                pass
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_strings(r"c:\Users\kunkka\Downloads\aer-release-4.2.5.1.apk\classes.dex")
