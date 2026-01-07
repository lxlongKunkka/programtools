import json
import os
import glob

# Paths
source_dir = r"c:\Users\kunkka\Downloads\project_aeii-master\core\resources\data\units"
output_file = r"d:\webapp\programtools\src\game\ancient\utils\UnitData.js"

data = {}
config = {}

# Read config
with open(os.path.join(source_dir, "unit_config.json"), 'r') as f:
    config = json.load(f)

# Read units
units = []
for i in range(config['unit_count']):
    with open(os.path.join(source_dir, f"unit_{i}.json"), 'r') as f:
        units.append(json.load(f))

# Write JS
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("export const UnitConfig = " + json.dumps(config, indent=4) + ";\n\n")
    f.write("export const UnitDefinitions = " + json.dumps(units, indent=4) + ";\n")

print("Done packing unit data.")
