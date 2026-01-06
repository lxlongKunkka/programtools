import { ABILITIES, TERRAIN } from '../constants.js';

export class ActionMenu {
    constructor(gameCore, renderer, onAction) {
        this.game = gameCore;
        this.renderer = renderer;
        this.onAction = onAction; // Callback(action, data)
        this.active = false;
        
        this.menuElement = document.createElement('div');
        this.menuElement.style.position = 'absolute';
        this.menuElement.style.display = 'none';
        this.menuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.menuElement.style.border = '2px solid #fff';
        this.menuElement.style.padding = '10px';
        this.menuElement.style.color = '#fff';
        this.menuElement.style.zIndex = '100';
        
        document.body.appendChild(this.menuElement);
    }

    show(x, y, unit, canAttack) {
        this.active = true;
        
        const rect = this.renderer.canvas.getBoundingClientRect();
        const screenX = rect.left + x * this.renderer.tileSize + this.renderer.tileSize;
        const screenY = rect.top + y * this.renderer.tileSize;
        
        this.menuElement.style.left = `${screenX}px`;
        this.menuElement.style.top = `${screenY}px`;
        this.menuElement.style.display = 'block';
        
        this.renderContent(unit, canAttack);
    }

    hide() {
        this.active = false;
        this.menuElement.style.display = 'none';
    }

    renderContent(unit, canAttack) {
        this.menuElement.innerHTML = '';
        
        // Attack
        if (canAttack) {
            this.addOption('Attack', () => this.onAction('attack'));
        }
        
        // Skills
        if (unit.abilities) {
            if (unit.abilities.includes(ABILITIES.RAISE_DEAD)) {
                this.addOption('Raise Dead', () => this.onAction('skill', 'raise_dead'));
            }
            if (unit.abilities.includes(ABILITIES.HEALER)) {
                this.addOption('Heal', () => this.onAction('skill', 'heal'));
            }
            if (unit.abilities.includes(ABILITIES.SUMMONER)) {
                this.addOption('Summon', () => this.onAction('skill', 'summon'));
            }
            if (unit.abilities.includes(ABILITIES.REPAIRER)) {
                // Check if on repairable tile
                const tile = this.game.map.getTile(unit.x, unit.y);
                if (tile.type === TERRAIN.VILLAGE_RUIN) {
                    this.addOption('Repair', () => this.onAction('skill', 'repair'));
                }
            }
        }
        
        // Info
        this.addOption('Info', () => this.onAction('info'));

        // Wait
        this.addOption('Wait', () => this.onAction('wait'));
    }

    addOption(text, onClick) {
        const item = document.createElement('div');
        item.innerText = text;
        item.style.cursor = 'pointer';
        item.style.padding = '5px 10px';
        item.style.borderBottom = '1px solid #444';
        
        item.onmouseover = () => item.style.backgroundColor = '#333';
        item.onmouseout = () => item.style.backgroundColor = 'transparent';
        item.onclick = () => {
            onClick();
            this.hide();
        };
        
        this.menuElement.appendChild(item);
    }
}
