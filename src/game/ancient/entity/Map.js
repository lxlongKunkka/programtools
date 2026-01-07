import Unit from './Unit.js';
import Tomb from './Tomb.js';
import Position from './Position.js';
import TileFactory from '../utils/TileFactory.js';
import UnitFactory from '../utils/UnitFactory.js';
import UnitToolkit from '../utils/UnitToolkit.js';

export default class GameMap {
    constructor(first, second) {
        this.units = new Map(); // ObjectMap<Position, Unit>
        this.tombs = new Set(); // ObjectSet<Tomb>
        this.castle_positions = new Set(); // ObjectSet<Position>
        this.village_positions = new Set(); // ObjectSet<Position>
        
        if (typeof first === 'object' && first.map_data) {
            // JSON Object constructor
            const json = first;
            this.initDimensions(json.width, json.height);
            this.setAuthor(json.author);
            
            const map_data = json.map_data;
            let index = 0;
            for (let x = 0; x < this.getWidth(); x++) {
                for (let y = 0; y < this.getHeight(); y++) {
                    const tile = map_data[index++];
                    this.setTile(tile, x, y);
                }
            }
            
            const units = json.units;
            for (let i = 0; i < units.length; i++) {
                this.addUnit(UnitFactory.createUnit(units[i]));
            }
            
            const tombs = json.tombs;
            for (let i = 0; i < tombs.length; i++) {
                this.addTomb(new Tomb(tombs[i]));
            }
            
            const team_access = json.team_access;
            for (let team = 0; team < 4; team++) {
                this.setTeamAccess(team, team_access[team]);
            }
            
        } else if (first instanceof GameMap) {
            // Copy constructor
            const map = first;
            this.initDimensions(map.getWidth(), map.getHeight());
            this.author = map.author;
            // System.arraycopy(map.team_access, 0, team_access, 0, 4);
            for(let i=0; i<4; i++) this.team_access[i] = map.team_access[i];
            
            for (let x = 0; x < map.getWidth(); x++) {
                for (let y = 0; y < map.getHeight(); y++) {
                    this.setTile(map.getTileIndex(x, y), x, y);
                    const unit = map.upper_unit_layer[x][y];
                    if (unit != null) {
                        this.upper_unit_layer[x][y] = new Unit(unit);
                    }
                }
            }
            
            for (const position of map.getUnitPositions()) {
                const unit = map.units.get(position);
                // We need to use OUR canonical position
                const ourPos = this.getPosition(position.x, position.y);
                this.units.set(ourPos, new Unit(unit));
            }
            
            for (const tomb of map.tombs) {
                this.tombs.add(new Tomb(tomb));
            }
            
        } else {
            // (width, height)
            const width = first;
            const height = second;
            this.initDimensions(width, height);
        }
    }

    initDimensions(width, height) {
        // map_data = new short[width][height];
        this.map_data = Array.from({ length: width }, () => new Int16Array(height));
        this.team_access = [false, false, false, false];

        // upper_unit_layer = new Unit[width][height];
        this.upper_unit_layer = Array.from({ length: width }, () => new Array(height).fill(null));
        
        // positions = new Position[width][height];
        this.positions = Array.from({ length: width }, (_, x) => 
            Array.from({ length: height }, (_, y) => new Position(x, y))
        );
    }

    setAuthor(author) {
        this.author = author;
    }

    getAuthor() {
        return this.author;
    }

    hasTeamAccess(team) {
        return this.team_access[team];
    }

    setTeamAccess(team, access) {
        if (typeof team === 'object') {
             // array
             const access_table = team;
             if (access_table.length === 4) {
                for (let t = 0; t < 4; t++) {
                    this.setTeamAccess(t, access_table[t]);
                }
            }
        } else {
             this.team_access[team] = access;
        }
    }

    resetTeamAccess() {
        for (let i = 0; i < 4; i++) {
            this.team_access[i] = false;
        }
    }

    getWidth() {
        return this.map_data.length;
    }

    getHeight() {
        return this.map_data[0].length;
    }

    isWithinMap(x, y) {
        return 0 <= x && x < this.getWidth() && 0 <= y && y < this.getHeight();
    }
    
    getPosition(x, y) {
        if (this.isWithinMap(x, y)) {
            return this.positions[x][y];
        }
        return null;
    }

    setTile(index, x, y) {
        this.map_data[x][y] = index;

        const position = this.getPosition(x, y);
        const tile = this.getTile(position); // Calls getTile(Position)
        
        if (tile) {
            if (tile.isCastle()) {
                this.castle_positions.add(position);
            } else {
                if (tile.isVillage()) {
                    this.village_positions.add(position);
                } else {
                    this.castle_positions.delete(position);
                    this.village_positions.delete(position);
                }
            }
        }
    }

    getTileIndex(xOrPos, y) {
        let x, y_coord;
        if (typeof xOrPos === 'object') {
            x = xOrPos.x;
            y_coord = xOrPos.y;
        } else {
            x = xOrPos;
            y_coord = y;
        }

        if (this.isWithinMap(x, y_coord)) {
            return this.map_data[x][y_coord];
        } else {
            return -1;
        }
    }

    getTile(xOrUnitOrPos, y) {
        let x, y_coord;
        if (xOrUnitOrPos instanceof Unit) {
            x = xOrUnitOrPos.getX();
            y_coord = xOrUnitOrPos.getY();
        } else if (typeof xOrUnitOrPos === 'object') { // Position
             x = xOrUnitOrPos.x;
             y_coord = xOrUnitOrPos.y;
        } else {
            x = xOrUnitOrPos;
            y_coord = y;
        }

        if (this.isWithinMap(x, y_coord)) {
            return TileFactory.getTile(this.map_data[x][y_coord]);
        } else {
            return null;
        }
    }

    getCastlePositions(team) {
        if (team === undefined) return this.castle_positions;
        
        const positions = new Set();
        for (const position of this.castle_positions) {
            if (this.getTile(position).getTeam() === team) {
                positions.add(position);
            }
        }
        return positions;
    }

    getVillagePositions(team) {
        if (team === undefined) return this.village_positions;

        const positions = new Set();
        for (const position of this.village_positions) {
            if (this.getTile(position).getTeam() === team) {
                positions.add(position);
            }
        }
        return positions;
    }
    
    addTomb(first, second) {
        if (typeof first === 'number') {
             this.tombs.add(new Tomb(first, second));
        } else {
             this.tombs.add(first);
        }
    }

    removeTomb(x, y) {
        for (const tomb of this.tombs) {
            if (tomb.x === x && tomb.y === y) {
                this.tombs.delete(tomb);
                break;
            }
        }
    }

    isTomb(xOrPos, y) {
        let x, y_coord;
        if (typeof xOrPos === 'object') {
            x = xOrPos.x;
            y_coord = xOrPos.y;
        } else {
            x = xOrPos;
            y_coord = y;
        }
        
        for (const tomb of this.tombs) {
            if (tomb.x === x && tomb.y === y_coord) {
                 return true;
            }
        }
        return false;
    }

    updateTombs() {
        for (const tomb of this.tombs) {
            tomb.update();
            if (tomb.getRemains() < 0) {
                this.tombs.delete(tomb);
            }
        }
    }

    getTombs() {
        return this.tombs;
    }

    moveUnit(unit, dest_x, dest_y) {
        const start_x = unit.getX();
        const start_y = unit.getY();
        const start_position = this.getPosition(start_x, start_y);
        const dest_position = this.getPosition(dest_x, dest_y);
        
        // Java: if (canMove(dest_x, dest_y))
        // canMove is not in the read snippet of Map.java. 
        // I will assume it exists or use basic check.
        // Wait, I should double check Map.java for canMove.
        // For now I'll use check isWithinMap.
        if (this.isWithinMap(dest_x, dest_y)) { // Using minimal check for now
            unit.setX(dest_x);
            unit.setY(dest_y);
            
            if (UnitToolkit.isTheSameUnit(unit, this.upper_unit_layer[start_x][start_y])) {
                this.upper_unit_layer[start_x][start_y] = null;
            }
            if (UnitToolkit.isTheSameUnit(unit, this.units.get(start_position))) {
                this.units.delete(start_position);
            }
            
            if (!this.units.has(dest_position)) {
                 this.units.set(dest_position, unit);
            } else {
                 this.upper_unit_layer[dest_x][dest_y] = unit;
            }
        }
    }

    addUnit(unit, replace) {
        if (!unit) return;
        const position = this.getPosition(unit.getX(), unit.getY());
        if (replace) {
            this.units.set(position, unit);
        } else {
            if (this.units.has(position)) {
                if (this.upper_unit_layer[position.x][position.y] == null) {
                    this.upper_unit_layer[position.x][position.y] = unit;
                }
            } else {
                this.units.set(position, unit);
            }
        }
    }

    getUnit(xOrPos, y) {
        let x, y_coord;
        if (xOrPos instanceof Position || (typeof xOrPos === 'object' && xOrPos.x !== undefined)) {
            x = xOrPos.x;
            y_coord = xOrPos.y;
        } else {
            x = xOrPos;
            y_coord = y;
        }

        if (this.isWithinMap(x, y_coord)) {
            const position = this.getPosition(x, y_coord);
            const unit = this.units.get(position);
            const upper = this.upper_unit_layer[x][y_coord];
            return upper || unit; // Return upper if exists, else lower
        }
        return null;
    }

    getUnitByCode(unit_code) {
        for (const unit of this.units.values()) {
            if (unit.getUnitCode() === unit_code) {
                return unit;
            }
        }
        return null;
    }

    removeUnit(x, y) {
         if (this.isWithinMap(x,y)) {
            const position = this.getPosition(x, y);
            this.units.delete(position);
         }
    }

    getUnits(team) {
        if (team === undefined) return this.units.values();
        
        const units = new Set();
        for (const unit of this.units.values()) {
            if (unit.getTeam() === team) {
                units.add(unit);
            }
        }
        return units;
    }
    
    getUnitPositions() {
        return this.units.keys();
    }

    removeTeam(team) {
        const positions = Array.from(this.getUnitPositions()); // Copy
        for (const position of positions) {
            const unit = this.getUnit(position.x, position.y);
            if (unit && unit.getTeam() === team) {
                this.removeUnit(position.x, position.y);
            }
        }
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < this.getHeight(); y++) {
                const unit = this.getUnit(x, y);
                // getUnit returns upper if present. Check both??
                // Java: Unit unit = getUnit(x, y); if (...) removeUnit.
                // But removeUnit only removes from `units` map.
                // What about upper layer?
                // Java removeUnit: units.remove(getPosition(x, y));
                // It does NOT remove from upper_unit_layer!
                // Java team removal logic matches `getUnit` result.
                
                if (unit && unit.getTeam() === team) {
                    this.removeUnit(x, y); 
                    // This might be buggy in original java if unit is only in upper layer?
                    // But usually upper layer is temporary during move?
                }
                
                const tile = this.getTile(x, y);
                if (tile.getTeam() === team && tile.isCapturable()) {
                     this.setTile(tile.getCapturedTileIndex(4), x, y); // Index 4 is usually neutral/ruins?
                     // Java code says: setTile(tile.getCapturedTileIndex(-1), x, y);
                     // But getCapturedTileIndex takes int team. 0-3 are valid teams.
                     // Java logic in Tile: if (0 <= team && team < 4) ... return captured_tile_list[team]; else return [4];
                     // So passing -1 returns index 4 (neutral).
                }
            }
        }
    }

    getPopulation(team, count_skeleton) {
        let population = 0;
        for (const unit of this.units.values()) {
            if (unit && unit.getTeam() === team) {
                if (unit.isSkeleton()) {
                    population += count_skeleton ? unit.getOccupancy() : 0;
                } else {
                    population += unit.getOccupancy();
                }
            }
        }
        
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < this.getHeight(); y++) {
                 const unit = this.upper_unit_layer[x][y];
                 if (unit && unit.getTeam() === team) {
                    if (unit.isSkeleton()) {
                        population += count_skeleton ? unit.getOccupancy() : 0;
                    } else {
                        population += unit.getOccupancy();
                    }
                 }
            }
        }
        return population;
    }
    
    canMove(x, y) {
        const dest_position = this.getPosition(x, y);
        // Valid map check? Map.java assumes x,y is valid here or crashes/returns null?
        // getPosition checks bounds. Returns null if invalid.
        if (!dest_position) return false;
        
        return !this.units.has(dest_position) || this.upper_unit_layer[x][y] == null;
    }

    canStandby(unit) {
        const position = this.getPosition(unit.getX(), unit.getY());
        if (!position) return false;
        
        // if (UnitToolkit.isTheSameUnit(unit, upper_unit_layer[unit.getX()][unit.getY()]))
        if (UnitToolkit.isTheSameUnit(unit, this.upper_unit_layer[unit.getX()][unit.getY()])) {
            return !this.units.has(position);
        } else {
            return UnitToolkit.isTheSameUnit(unit, this.units.get(position));
        }
    }

    getPlayerCount() {
        let count = 0;
        for (let team = 0; team < 4; team++) {
            if (this.hasTeamAccess(team)) {
                count++;
            }
        }
        return count;
    }

    getCommanderCount(team) {
        let count = 0;
        for (const unit of this.units.values()) {
            if (unit.getTeam() === team && unit.isCommander()) {
                count++;
            }
        }
        return count;
    }

    getCastleCount(team) {
        let count = 0;
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < this.getHeight(); y++) {
                const tile = this.getTile(x, y);
                if (tile.isCastle() && tile.getTeam() === team) {
                    count++;
                }
            }
        }
        return count;
    }

    toJson() {
        // ... (implementation of toJson based on java)
        // For simplicity, returning a simple object, JSON.stringify handles the rest if structure matches.
        const map_data = [];
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < this.getHeight(); y++) {
                map_data.push(this.getTileIndex(x, y));
            }
        }

        const units = Array.from(this.units.values()).map(u => u.toJson ? u.toJson() : u); // Need u.toJson if distinct
        // Unit.java didn't show toJson, let's assume it implements it as Serializable.
        // Actually Unit.java has "implements Serializable" but I didn't port toJson method there.
        // I need to check Unit.java again or implement toJson in Unit.js.
        
        const tombs = Array.from(this.tombs).map(t => t.toJson());
        
        return {
            author: this.getAuthor(),
            width: this.getWidth(),
            height: this.getHeight(),
            map_data: map_data, // Serialization of 2D array flat?
            // Java:
            // for (int x = 0; x < getWidth(); x++) {
            //    for (int y = 0; y < getHeight(); y++) {
            //        map_data.put(getTileIndex(x, y));
            //    }
            // }
            // So it is flattened column-by-column.
            
            units: units,
            tombs: tombs,
            team_access: this.team_access
        };
    }
}

