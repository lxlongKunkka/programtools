import { SaveManager } from '../manager/SaveManager.js';

export class SystemMenu {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.active = false;
        
        this.menuElement = document.createElement('div');
        this.menuElement.style.position = 'absolute';
        this.menuElement.style.display = 'none';
        this.menuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.menuElement.style.border = '2px solid #fff';
        this.menuElement.style.padding = '20px';
        this.menuElement.style.color = '#fff';
        this.menuElement.style.zIndex = '200';
        this.menuElement.style.top = '50%';
        this.menuElement.style.left = '50%';
        this.menuElement.style.transform = 'translate(-50%, -50%)';
        this.menuElement.style.minWidth = '200px';
        
        document.body.appendChild(this.menuElement);
    }

    show() {
        this.active = true;
        this.menuElement.style.display = 'block';
        this.renderContent();
    }

    hide() {
        this.active = false;
        this.menuElement.style.display = 'none';
    }

    renderContent() {
        this.menuElement.innerHTML = '<h3 style="text-align:center; margin-top:0;">System Menu</h3>';
        
        this.addButton('End Turn', () => {
            this.hide();
            this.gameManager.endTurn();
        });
        this.addButton('Save Game', () => this.showSaveLoad('save'));
        this.addButton('Load Game', () => this.showSaveLoad('load'));
        this.addButton('Resume', () => this.hide());
    }
    
    addButton(text, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.display = 'block';
        btn.style.width = '100%';
        btn.style.margin = '10px 0';
        btn.style.padding = '10px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = '#333';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #666';
        
        btn.onmouseover = () => btn.style.backgroundColor = '#555';
        btn.onmouseout = () => btn.style.backgroundColor = '#333';
        
        btn.onclick = onClick;
        this.menuElement.appendChild(btn);
    }
    
    showSaveLoad(mode) {
        this.menuElement.innerHTML = `<h3 style="text-align:center; margin-top:0;">${mode === 'save' ? 'Save' : 'Load'} Game</h3>`;
        
        for (let i = 1; i <= 3; i++) {
            const hasSave = SaveManager.hasSave(i);
            const text = `Slot ${i} ${hasSave ? '(Used)' : '(Empty)'}`;
            
            this.addButton(text, () => {
                if (mode === 'save') {
                    if (SaveManager.saveGame(i, this.gameManager.game)) {
                        alert('Game Saved!');
                        this.hide();
                    }
                } else {
                    if (hasSave) {
                        const json = SaveManager.loadGame(i);
                        if (json) {
                            this.gameManager.loadGame(json);
                            this.hide();
                        }
                    } else {
                        alert('Slot is empty!');
                    }
                }
            });
        }
        
        this.addButton('Back', () => this.renderContent());
    }
}
