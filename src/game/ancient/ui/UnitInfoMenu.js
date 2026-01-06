import { UNIT_DESCRIPTIONS, UNIT_QUOTES } from '../constants.js';

export class UnitInfoMenu {
    constructor(gameCore) {
        this.game = gameCore;
        this.active = false;
        
        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.display = 'none';
        this.element.style.top = '50%';
        this.element.style.left = '50%';
        this.element.style.transform = 'translate(-50%, -50%)';
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        this.element.style.border = '2px solid #d4af37'; // Gold border
        this.element.style.padding = '20px';
        this.element.style.color = '#fff';
        this.element.style.zIndex = '200';
        this.element.style.width = '400px';
        this.element.style.fontFamily = 'Arial, sans-serif';
        this.element.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';
        
        document.body.appendChild(this.element);
        
        // Close on click outside or escape (handled by GameManager usually, but let's add a close button)
        this.closeBtn = document.createElement('div');
        this.closeBtn.innerText = 'X';
        this.closeBtn.style.position = 'absolute';
        this.closeBtn.style.top = '10px';
        this.closeBtn.style.right = '10px';
        this.closeBtn.style.cursor = 'pointer';
        this.closeBtn.style.fontWeight = 'bold';
        this.closeBtn.onclick = () => this.hide();
        this.element.appendChild(this.closeBtn);
        
        this.content = document.createElement('div');
        this.element.appendChild(this.content);
    }

    show(unit, onClose) {
        this.active = true;
        this.element.style.display = 'block';
        this.onClose = onClose;
        this.render(unit);
    }

    hide() {
        this.active = false;
        this.element.style.display = 'none';
        if (this.onClose) {
            this.onClose();
            this.onClose = null;
        }
    }

    render(unit) {
        const description = UNIT_DESCRIPTIONS[unit.type] || "No description available.";
        const quote = UNIT_QUOTES[unit.type] || "";
        
        let abilitiesHtml = '';
        if (unit.abilities && unit.abilities.length > 0) {
            abilitiesHtml = `<div style="margin-top: 10px;"><strong>Abilities:</strong><br>${unit.abilities.join(', ')}</div>`;
        }

        let statusHtml = '';
        if (unit.status.poison > 0) statusHtml += `<span style="color: #0f0;">Poisoned (${unit.status.poison})</span> `;
        if (unit.status.blind > 0) statusHtml += `<span style="color: #888;">Blinded (${unit.status.blind})</span> `;
        if (unit.status.weak > 0) statusHtml += `<span style="color: #f00;">Weak (${unit.status.weak})</span> `;
        
        if (statusHtml) {
            statusHtml = `<div style="margin-top: 10px;"><strong>Status:</strong> ${statusHtml}</div>`;
        }

        this.content.innerHTML = `
            <h2 style="text-align: center; margin-top: 0; color: #d4af37;">${unit.type.toUpperCase()}</h2>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div>
                    <div><strong>HP:</strong> ${unit.hp} / ${unit.maxHp}</div>
                    <div><strong>Attack:</strong> ${unit.attack}</div>
                    <div><strong>Defense:</strong> ${unit.physDef} / ${unit.magDef}</div>
                </div>
                <div>
                    <div><strong>Move:</strong> ${unit.move}</div>
                    <div><strong>Range:</strong> ${Array.isArray(unit.attackRange) ? unit.attackRange.join('-') : unit.attackRange}</div>
                    <div><strong>Level:</strong> ${unit.level} (XP: ${unit.xp})</div>
                </div>
            </div>
            <div style="border-top: 1px solid #555; padding-top: 10px; margin-top: 10px;">
                <p style="font-style: italic; color: #aaa;">"${quote}"</p>
                <p>${description}</p>
            </div>
            ${abilitiesHtml}
            ${statusHtml}
        `;
    }
}
