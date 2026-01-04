import json
import os

maps_dir = r"d:\webapp\programtools\public\maps"

mapping = {
    "aei_c0.json": "AEI Ch1: Regroup",
    "aei_c1.json": "AEI Ch2: Friends & Enemies",
    "aei_c2.json": "AEI Ch3: Escort",
    "aei_c3.json": "AEI Ch4: Reinforcements",
    "aei_c4.json": "AEI Ch5: Dragon Rescue!",
    "aei_c5.json": "AEI Ch6: Siege!",
    "aei_c6.json": "AEI Ch7: Final Assault",
    
    "aeii_c0.json": "AEII Ch1: Temple of Courage",
    "aeii_c1.json": "AEII Ch2: Temple of Wisdom",
    "aeii_c2.json": "AEII Ch3: Forest of Mists",
    "aeii_c3.json": "AEII Ch4: Temple of Life",
    "aeii_c4.json": "AEII Ch5: Pathway to Thorin",
    "aeii_c5.json": "AEII Ch6: Gates of Thorin",
    "aeii_c6.json": "AEII Ch7: Outside the City",
    "aeii_c7.json": "AEII Ch8: Bonus",
    
    "tutorial_stage_1.json": "Tutorial 1: Move & Attack",
    "tutorial_stage_2.json": "Tutorial 2: Repair & Occupy",
    "tutorial_stage_3.json": "Tutorial 3: Prepare for Battle",
    
    "challenge_stage_1.json": "Challenge 1: Grand Siege",
    "challenge_stage_2.json": "Challenge 2: Blitzkrieg",
    "challenge_stage_3.json": "Challenge 3: The Last Stand",
    "challenge_stage_4.json": "Challenge 4: Rock Valley",
    "challenge_stage_5.json": "Challenge 5: Endless Trail",
    
    "warroom_stage_1.json": "Warroom 1: Ghost Island",
    "warroom_stage_2.json": "Warroom 2: Forest Shrine",
    "warroom_stage_3.json": "Warroom 3: Long March",
    "warroom_stage_4.json": "Warroom 4: Dilemma"
}

for filename, new_name in mapping.items():
    filepath = os.path.join(maps_dir, filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            data['name'] = new_name
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            print(f"Updated {filename} to name '{new_name}'")
        except Exception as e:
            print(f"Error updating {filename}: {e}")
    else:
        print(f"File not found: {filename}")
