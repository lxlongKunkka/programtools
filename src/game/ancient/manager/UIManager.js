import { TileFactory } from '../utils/TileFactory.js';
import { UnitToolkit } from '../utils/UnitToolkit.js';

export class UIManager {
    constructor(gameCore) {
        this.game = gameCore;
        this.panel = document.getElementById('stats-panel');
        this.unitName = document.getElementById('unit-name');
        this.unitHp = document.getElementById('unit-hp');
        this.unitStats = document.getElementById('unit-stats');
        this.terrainInfo = document.getElementById('terrain-info');
    }

    update(selectedUnit, hoverX, hoverY) {
        if (!this.panel) return;

        let show = false;
        
        // Show selected unit info
        if (selectedUnit) {
            show = true;
            this.unitName.innerText = selectedUnit.type.toUpperCase(); // Or map to display name
            this.unitHp.innerText = `HP: ${selectedUnit.hp}/${selectedUnit.maxHp}`;
            this.unitStats.innerText = `ATK: ${selectedUnit.attack} | DEF: ${selectedUnit.physDef}/${selectedUnit.magDef}`;
        } else if (hoverX !== undefined && this.game.map.isValid(hoverX, hoverY)) {
            // Show hovered unit info
            const unit = this.game.map.units.get(this.game.map.positions[hoverX][hoverY]);
            if (unit) {
                show = true;
                this.unitName.innerText = unit.type.toUpperCase();
                this.unitHp.innerText = `HP: ${unit.hp}/${unit.maxHp}`;
                this.unitStats.innerText = `ATK: ${unit.attack} | DEF: ${unit.physDef}/${unit.magDef}`;
            }
        }

        // Show terrain info
        if (hoverX !== undefined && this.game.map.isValid(hoverX, hoverY)) {
            const tile = this.game.map.getTile(hoverX, hoverY);
            if (tile) {
                show = true;
                // Need terrain name mapping
                this.terrainInfo.innerText = `Terrain: Type ${tile.type} | Def: ${tile.defence_bonus}%`;
            }
        }

        this.panel.style.display = show ? 'block' : 'none';
    }
}
