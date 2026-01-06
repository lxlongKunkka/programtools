import { Unit } from '../entity/Unit.js';
import { UNIT_STATS, UNIT_TYPES } from '../constants.js';

export class UnitFactory {
    static current_code = 0;

    // Mapping from index (used in map files) to UNIT_TYPES
    static INDEX_MAP = [
        UNIT_TYPES.SOLDIER,         // 0
        UNIT_TYPES.ARCHER,          // 1
        UNIT_TYPES.LIZARD,          // 2
        UNIT_TYPES.SORCERESS,       // 3
        UNIT_TYPES.GHOST,           // 4 (Wisp/Ghost)
        UNIT_TYPES.WOLF,            // 5
        UNIT_TYPES.STONE_GOLEM,     // 6
        UNIT_TYPES.CATAPULT,        // 7
        UNIT_TYPES.DRAGON,          // 8
        UNIT_TYPES.KING,            // 9
        UNIT_TYPES.SKELETON,        // 10
        UNIT_TYPES.WISDOM_CRYSTAL   // 11
    ];

    static createUnitFromIndex(index, team) {
        const type = this.INDEX_MAP[index] || UNIT_TYPES.SOLDIER;
        return new Unit(type, team, -1, -1);
    }

    static createUnitFromType(type, team) {
        const unit = new Unit(type, team, -1, -1); // x, y will be set later
        // Initialize stats from constants if not already done in Unit constructor
        // The current Unit.js constructor seems to handle stats initialization
        return unit;
    }

    static createUnit(type, team) {
        return new Unit(type, team, 0, 0);
    }

    static createUnitFromJson(json) {
        // In Java: index is the unit type index. In JS we use string types (e.g. 'soldier')
        // We need to map index to type if the JSON uses indices, or use type directly if JSON is adapted.
        // Assuming the JSON might come from the Java backend or similar structure.
        // If 'index' is present, we might need a mapping. For now, let's assume 'type' or 'index' maps to UNIT_TYPES.
        
        let type = json.type;
        if (type === undefined && json.index !== undefined) {
            // Fallback or mapping needed. For now, let's assume we can get type from index if needed, 
            // but ideally the JSON should have 'type' string.
            // If we strictly follow Java, we need a mapping array.
            // Let's assume the JSON has been adapted to include 'type' or we use a placeholder.
            // For this port, I'll assume 'type' is available or I'll use a default.
             type = Object.values(UNIT_TYPES)[json.index] || UNIT_TYPES.SOLDIER;
        }

        const unit = new Unit(type, json.team, json.x_position || json.x, json.y_position || json.y);
        
        if (json.price !== undefined) unit.cost = json.price; // Unit.js uses 'cost'
        if (json.experience !== undefined) unit.experience = json.experience;
        if (json.current_hp !== undefined) unit.hp = json.current_hp;
        if (json.current_movement_point !== undefined) unit.moved = json.current_movement_point < unit.moveRange; // Simplified
        if (json.standby !== undefined) unit.state = json.standby ? 'done' : 'ready';
        
        // TODO: Status effects
        
        return unit;
    }
}
