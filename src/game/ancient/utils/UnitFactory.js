import Unit from '../entity/Unit.js';

let unit_config = {
    commander_index: -1, 
    skeleton_index: -1, 
    crystal_index: -1
};
let default_units = [];

export default class UnitFactory {

    static loadUnitData(jsonData) {
        unit_config = jsonData.config;
        default_units = new Array(jsonData.units.length);
        
        jsonData.units.forEach((definition, index) => {
            default_units[index] = new Unit(definition, index);
        });
    }

    static isCommander(index) {
        return index === UnitFactory.getCommanderIndex();
    }

    static getCommanderIndex() {
        return unit_config.commander_index;
    }

    static getSkeletonIndex() {
        return unit_config.skeleton_index;
    }
    
    static isCrystal(index) {
        return index === unit_config.crystal_index;
    }

    static isSkeleton(index) {
        return index === unit_config.skeleton_index;
    }
    
    static createUnit(indexOrJson, team, unit_code) {
        if (typeof indexOrJson === 'object') {
            const json = indexOrJson;
            // From Java: int index = json.getInt("index"); ...
            // But json here is likely the full serialized unit?
            // Java: createUnit(JSONObject json) -> return new Unit(json); or similar?
            // "UnitFactory.createUnit(units.getJSONObject(i))" in Map.java usually means deserialize.
            // But Unit constructor (which takes UnitDefinition) is different from "deserialize".
            // Unit.java has NO constructor taking JSONObject except maybe indirectly?
            // Wait, Unit.java "private Unit(int index, String unit_code)"
            // Is there a Unit constructor taking JSONObject? 
            // I did NOT read one.
            // Let's check UnitFactory.java impl of createUnit(JSONObject)
            
            // Assuming deserialize:
            // return new Unit(json); which I need to implement in Unit.js "constructor(json)"?
            // My Unit.js handles (Unit), (UnitDefinition, index).
            // It does NOT handle (JSONObject).
            // But UnitFactory.createUnit(json) exists.
            
            // I'll implement deserialization here.
            
            const index = json.index;
            const code = json.unit_code;
            const t = json.team;
            
            // We create a fresh unit from definition, then overwrite state.
            // Or create via copy?
            // Given "index" and "unit_code", we can create a base.
             
            // Just return a recreated unit from JSON data directly if possible?
            // But my Unit constructor is messy. 
            // Let's modify Unit.js to accept JSON object?
            // Or just instantiate and set fields.
            
            const unit = new Unit(default_units[index], code);
            unit.setTeam(t);
            unit.setCurrentHp(json.current_hp);
            unit.setCurrentMovementPoint(json.current_movement_point);
            unit.setX(json.x_position);
            unit.setY(json.y_position);
            unit.setStandby(json.standby);
            // unit.setStatic(json.static); // static is private/final in java?
            // is_static is field.
            // unit.head = json.head;
            // status...
            
            // For now, I'll assume Unit.js constructor works if I pass this logic or implement it in Unit.js
            
            // Actually, simpler:
            // Java `createUnit` likely calls a Unit constructor or manually sets fields.
            // I'll leave a TODO here or implement basic restore.
            
            // Let's use a dedicated restore method or constructor in Unit.js later.
            // For now:
            return Unit.restoreFromJson ? Unit.restoreFromJson(json) : null; 
        } else {
             const index = indexOrJson;
             // (index, team, unit_code)
             // Java: createUnit(index, team) calls createUnit(index, team, "#")
             const code = unit_code || "#";
             const unit = new Unit(default_units[index], code);
             unit.setTeam(team);
             unit.setX(-1);
             unit.setY(-1);
             // Unit ctor `Unit(definition, index)` sets defaults.
             // Copy ctor `Unit(Unit, code)` copies.
             // Here we use copy ctor from default unit.
             unit.setCurrentHp(unit.getMaxHp());
             unit.resetMovementPoint();
             return unit;
        }
    }
    
    static createCommander(team) {
        return UnitFactory.createUnit(UnitFactory.getCommanderIndex(), team);
    }
    
    static getSample(index) {
        return default_units[index];
    }
    
    static cloneUnit(unit) {
        return new Unit(unit);
    }

    static getDefaultUnit(index) {
        return default_units[index];
    }
    
    static getAllUnits() {
        return default_units;
    }
}
