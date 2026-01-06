export class RecruitmentMenu {
    constructor(gameCore, renderer, onRecruit) {
        this.game = gameCore;
        this.renderer = renderer;
        this.onRecruit = onRecruit;
        this.active = false;
        this.castlePos = null;
        
        // Create DOM elements for the menu
        this.menuElement = document.createElement('div');
        this.menuElement.style.position = 'absolute';
        this.menuElement.style.display = 'none';
        this.menuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.menuElement.style.border = '2px solid #fff';
        this.menuElement.style.padding = '10px';
        this.menuElement.style.color = '#fff';
        this.menuElement.style.zIndex = '100';
        this.menuElement.style.maxHeight = '400px';
        this.menuElement.style.overflowY = 'auto';
        
        document.body.appendChild(this.menuElement);
    }

    show(x, y, castlePos) {
        this.castlePos = castlePos;
        this.active = true;
        
        // Position menu near the castle
        const rect = this.renderer.canvas.getBoundingClientRect();
        const screenX = rect.left + x * this.renderer.tileSize + this.renderer.tileSize;
        const screenY = rect.top + y * this.renderer.tileSize;
        
        this.menuElement.style.left = `${screenX}px`;
        this.menuElement.style.top = `${screenY}px`;
        this.menuElement.style.display = 'block';
        
        this.renderContent();
    }

    hide() {
        this.active = false;
        this.menuElement.style.display = 'none';
        this.castlePos = null;
    }

    renderContent() {
        this.menuElement.innerHTML = '';
        
        const title = document.createElement('h3');
        title.innerText = 'Recruit Unit';
        title.style.margin = '0 0 10px 0';
        this.menuElement.appendChild(title);
        
        const player = this.game.players[this.game.current_team];
        const goldInfo = document.createElement('div');
        goldInfo.innerText = `Gold: ${player.gold}`;
        goldInfo.style.marginBottom = '10px';
        goldInfo.style.color = '#FFD700';
        this.menuElement.appendChild(goldInfo);

        // List units
        // We need a list of recruitable units. 
        // For now, let's use a hardcoded list or filter UNIT_STATS
        const recruitableUnits = [
            'SOLDIER', 'ARCHER', 'LIZARD', 'SORCERESS', 'WOLF', 
            'STONE_GOLEM', 'CATAPULT', 'DRAGON', 'DARK_MAGE'
        ];
        
        // Import UNIT_TYPES and UNIT_STATS dynamically or assume global access if modules allow.
        // Since this is a class, we need access to constants.
        // We'll assume the caller passes necessary data or we import it.
        // But we can't import in this file easily if we don't know the path relative to this new file.
        // It's in src/game/ancient/ui/RecruitmentMenu.js, so constants are in ../constants.js
        
        import('../constants.js').then(({ UNIT_TYPES, UNIT_STATS }) => {
            for (const key of recruitableUnits) {
                const type = UNIT_TYPES[key];
                if (!type) continue;
                
                const stats = UNIT_STATS[type];
                if (!stats) continue;
                
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.marginBottom = '5px';
                item.style.cursor = 'pointer';
                item.style.padding = '5px';
                item.style.border = '1px solid #444';
                
                if (player.gold < stats.cost) {
                    item.style.opacity = '0.5';
                    item.style.cursor = 'not-allowed';
                } else {
                    item.onmouseover = () => item.style.backgroundColor = '#333';
                    item.onmouseout = () => item.style.backgroundColor = 'transparent';
                    item.onclick = () => {
                        if (player.gold >= stats.cost) {
                            this.onRecruit(type, stats.cost);
                            this.hide();
                        }
                    };
                }
                
                const icon = document.createElement('div');
                icon.innerText = stats.symbol;
                icon.style.fontSize = '24px';
                icon.style.marginRight = '10px';
                icon.style.width = '30px';
                
                const info = document.createElement('div');
                info.innerHTML = `
                    <div style="font-weight:bold">${key}</div>
                    <div style="font-size:12px">Cost: ${stats.cost} | Atk: ${stats.attack} | Def: ${stats.physDef}</div>
                `;
                
                item.appendChild(icon);
                item.appendChild(info);
                this.menuElement.appendChild(item);
            }
            
            // Cancel Button
            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.width = '100%';
            cancelBtn.style.marginTop = '10px';
            cancelBtn.onclick = () => this.hide();
            this.menuElement.appendChild(cancelBtn);
        });
    }
}
