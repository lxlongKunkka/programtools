import { Tile } from '../entity/Tile.js';
import tilesData from '../tiles.json'; // Assuming tiles.json contains tile definitions

export class TileFactory {
    static tiles = [];

    static init() {
        // Initialize tiles from tiles.json or constants
        // Assuming tilesData is an object/array keyed by ID
        // We need to convert it to Tile objects
        
        // If tilesData is object { "t0": {...}, "t1": {...} }
        // We need to map numeric ID to Tile object.
        // The map data uses integers.
        
        // Let's assume we have a max number of tiles
        this.tiles = new Array(200); // Arbitrary size
        
        // Populate with default or loaded data
        // For now, create dummy tiles or load from tilesData if structure matches
        
        // Example:
        for (let i = 0; i < 200; i++) {
            // Default: Land, 0 def, 1 cost
            this.tiles[i] = new Tile(0, 1, Tile.TYPE_LAND);
        }
        
        // Override with actual data
        if (Array.isArray(tilesData)) {
            for (const data of tilesData) {
                const id = data.id;
                const type = data.type === 1 ? Tile.TYPE_WATER : 
                             data.type === 2 ? Tile.TYPE_FOREST :
                             data.type === 3 ? Tile.TYPE_MOUNTAIN : Tile.TYPE_LAND;
                
                const cost = data.step_cost || 1;
                const def = data.defence_bonus || 0;
                
                const tile = new Tile(def, cost, type);
                tile.setHpRecovery(data.hp_recovery || 0);
                
                tile.can_be_captured = data.is_capturable || false;
                tile.captured_tile_list = data.captured_tile_list || null;
                tile.is_castle = data.is_castle || false;
                tile.is_village = data.is_village || false;
                tile.team = data.team !== undefined ? data.team : -1;
                
                tile.can_be_repaired = data.is_repairable || false;
                tile.repaired_index = data.repaired_tile_index || 0;
                tile.can_be_destroyed = data.is_destroyable || false;
                tile.destroyed_index = data.destroyed_tile_index || 0;
                
                this.tiles[id] = tile;
            }
        } else {
            console.error("tiles.json is not an array");
        }
    }

    static getTile(index) {
        if (this.tiles.length === 0) {
            this.init();
        }
        return this.tiles[index] || this.tiles[0];
    }
}
