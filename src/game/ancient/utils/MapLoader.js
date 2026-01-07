import Map from '../entity/Map.js';
import UnitFactory from './UnitFactory.js';
import TileFactory from './TileFactory.js';
import { UNIT_TYPES } from '../constants.js';

export default class MapLoader {
    /**
     * Loads a map from a JSON file URL.
     * @param {string} url - The URL to the map JSON file.
     * @returns {Promise<Map>} - A promise that resolves to the loaded Map entity.
     */
    static async loadMap(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load map: ${response.statusText}`);
        }
        const json = await response.json();
        return MapLoader.parseMap(json);
    }

    /**
     * Parses the JSON object into a Map entity.
     * @param {Object} json - The map data JSON.
     * @returns {Map} - The populated Map entity.
     */
    static parseMap(json) {
        // Create map with dimensions
        const width = json.width;
        const height = json.height;
        const map = new Map(width, height);
        
        map.setAuthor(json.author || 'Unknown');
        
        // Handle team access if present (default to all false or true? Java defaults false)
        if (json.teamAccess) {
             for (let i = 0; i < 4; i++) {
                 map.setTeamAccess(i, json.teamAccess[i]);
             }
        }

        // Parse Tiles
        // json.mapData is 2D array [height][width] or [width][height]?
        // In classic 1 200.json, it looks like [row][col].
        // row index acts as Y, col index acts as X.
        // Map.js setTile(index, x, y)
        const mapData = json.mapData;
        
        // Check orientation. Accessing mapData[0] gives a row.
        // Typically mapData[y][x] in simple exporting.
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let tileIndex = mapData[y][x];
                // Ensure tileIndex is valid
                if (tileIndex === undefined) tileIndex = 0; // Default to water or something
                map.setTile(tileIndex, x, y);
            }
        }

        // Parse Units
        if (json.units) {
            json.units.forEach(u => {
                const teamId = MapLoader.resolveTeam(u.team);
                const unitIndex = MapLoader.resolveUnitIndex(u.type);
                
                if (unitIndex !== -1) {
                    // UnitFactory.createUnit(index, team)
                    const unit = UnitFactory.createUnit(unitIndex, teamId);
                    unit.setX(u.x);
                    unit.setY(u.y);
                    map.addUnit(unit);
                } else {
                    console.warn(`Unknown unit type: ${u.type}`);
                }
            });
        }
        
        // Parse Tombs? (Not in sample JSON)
        
        return map;
    }

    static resolveTeam(teamName) {
        switch (teamName.toLowerCase()) {
            case 'blue': return 0;
            case 'red': return 1;
            case 'green': return 2;
            case 'black': return 3;
            default: return 0;
        }
    }

    static resolveUnitIndex(typeName) {
        if (!typeName) return -1;
        const normalized = typeName.toLowerCase();
        return UNIT_TYPES[normalized] !== undefined ? UNIT_TYPES[normalized] : -1;
    }
}
