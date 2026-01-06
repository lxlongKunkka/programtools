import { Position } from './Position.js';
import { Unit } from './Unit.js';
import { Tomb } from './Tomb.js';
import { UnitFactory } from '../utils/UnitFactory.js';
import { TileFactory } from '../utils/TileFactory.js'; // Import TileFactory

export class Map {
    constructor(widthOrJson, height) {
        this.units = new globalThis.Map(); // Using JS Map for ObjectMap<Position, Unit>. Explicitly use globalThis.Map to avoid conflict with class name
        this.tombs = new Set();
        this.castle_positions = new Set();
        this.village_positions = new Set();
        
        if (typeof widthOrJson === 'object' && widthOrJson !== null) {
            this.initFromJson(widthOrJson);
        } else {
            this.initFromDimensions(widthOrJson, height);
        }
    }

    initFromDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.map_data = Array(width).fill().map(() => Array(height).fill(0));
        this.team_access = [false, false, false, false];
        
        this.upper_unit_layer = Array(width).fill().map(() => Array(height).fill(null));
        this.positions = Array(width).fill().map((_, x) => Array(height).fill().map((_, y) => new Position(x, y)));
    }

    initFromJson(json) {
        this.initFromDimensions(json.width, json.height);
        this.author = json.author;
        
        const map_data_flat = json.map_data;
        let index = 0;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.setTile(map_data_flat[index++], x, y);
            }
        }
        
        if (json.units) {
            for (const unitJson of json.units) {
                this.addUnit(UnitFactory.createUnitFromJson(unitJson));
            }
        }

        if (json.tombs) {
            for (const tombJson of json.tombs) {
                this.addTomb(new Tomb(tombJson));
            }
        }
       
        const team_access = json.team_access;
        if (team_access) {
            for (let team = 0; team < 4; team++) {
                this.setTeamAccess(team, team_access[team]);
            }
        }
    }
    
    getWidth() { return this.width; }
    getHeight() { return this.height; }
    
    setTile(tileIndex, x, y) {
        if (this.isValid(x, y)) {
            this.map_data[x][y] = tileIndex;
        }
    }

    getTile(x, y) {
        if (this.isValid(x, y)) {
            const tileIndex = this.map_data[x][y];
            // Assuming TileFactory.getTile(index) returns a Tile object
            // In Java, TileFactory.getTile(index) returns a shared Tile instance for that type
            // We need to implement TileFactory to support this.
            return TileFactory.getTile(tileIndex);
        }
        return null;
    }
    
    isValid(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    setTeamAccess(team, access) {
        this.team_access[team] = access;
    }
    
    setAuthor(author) {
        this.author = author;
    }

    addUnit(unit) {
        if (this.isValid(unit.x, unit.y)) {
            this.upper_unit_layer[unit.x][unit.y] = unit;
            // We need a way to map Position to Unit. 
            // Since JS Map uses object reference for keys, we need to use the exact Position object from this.positions
            // or use a string key. The Java code uses Position object.
            // Let's use the Position object from our pre-allocated array.
            const pos = this.positions[unit.x][unit.y];
            this.units.set(pos, unit);
        }
    }

    addTomb(tomb) {
        this.tombs.add(tomb);
    }

    toJSON() {
        const units = [];
        for (const unit of this.units.values()) {
            units.push(unit.toJSON());
        }
        
        const tombs = [];
        for (const tomb of this.tombs) {
            tombs.push(tomb.toJSON());
        }
        
        // Flatten map_data
        const map_data = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                map_data.push(this.map_data[x][y]);
            }
        }

        return {
            width: this.width,
            height: this.height,
            author: this.author,
            map_data: map_data,
            units: units,
            tombs: tombs,
            team_access: this.team_access
        };
    }
}
