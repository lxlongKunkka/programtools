import { Map } from '../entity/Map.js';
import { UnitFactory } from '../utils/UnitFactory.js';
import { TileFactory } from '../utils/TileFactory.js';

export class MapLoader {
    static async load(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);
        let offset = 0;

        // Helper to read UTF string (2 byte length + bytes)
        function readUTF() {
            const len = view.getUint16(offset, false); // Big Endian
            offset += 2;
            const bytes = new Uint8Array(buffer, offset, len);
            offset += len;
            return new TextDecoder().decode(bytes);
        }

        function readBoolean() {
            const val = view.getUint8(offset) !== 0;
            offset += 1;
            return val;
        }

        function readInt() {
            const val = view.getInt32(offset, false); // Big Endian
            offset += 4;
            return val;
        }

        function readShort() {
            const val = view.getInt16(offset, false); // Big Endian
            offset += 2;
            return val;
        }

        try {
            const author = readUTF();
            const teamAccess = [readBoolean(), readBoolean(), readBoolean(), readBoolean()];
            const width = readInt();
            const height = readInt();

            const map = new Map(width, height);
            map.setAuthor(author);
            for(let i=0; i<4; i++) map.setTeamAccess(i, teamAccess[i]);

            // Map Data
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const tileIndex = readShort();
                    map.setTile(tileIndex, x, y);
                }
            }

            // Units
            const unitCount = readInt();
            for (let i = 0; i < unitCount; i++) {
                const team = readInt();
                const unitIndex = readInt();
                const x = readInt();
                const y = readInt();
                
                // We need UnitFactory to create unit by index
                // Java: UnitFactory.createUnit(index, team)
                // We need to implement this mapping in UnitFactory
                const unit = UnitFactory.createUnitFromIndex(unitIndex, team);
                if (unit) {
                    unit.x = x;
                    unit.y = y;
                    map.addUnit(unit);
                }
            }

            return map;

        } catch (e) {
            console.error("Error loading map:", e);
            throw e;
        }
    }
}
