import { Unit } from '../entity/Unit.js';

export class CampaignContext {
    constructor(gameState) {
        this.gameState = gameState;
        this.vars = new Map();
    }

    /**
     * Set the alliance ID for a team. Teams with the same alliance ID are allies.
     * @param {string} team - The team identifier (e.g., 'blue', 'red').
     * @param {number} allianceId - The alliance ID.
     */
    setAlliance(team, allianceId) {
        this.gameState.alliances[team] = allianceId;
    }

    /**
     * Spawn a unit at a specific location.
     * @param {string} team - The team of the unit.
     * @param {string} unitType - The type of the unit (e.g., 'soldier').
     * @param {number} x - The x coordinate.
     * @param {number} y - The y coordinate.
     */
    spawnUnit(team, unitType, x, y) {
        // Check if tile is occupied
        if (this.gameState.getUnitAt(x, y)) {
            console.warn(`Cannot spawn unit at ${x},${y}, tile occupied.`);
            return;
        }
        const unit = new Unit(unitType, team, x, y);
        this.gameState.addUnit(unit);
        
        // Trigger spawn animation or event if needed
        if (this.gameState.onEvent) {
            this.gameState.onEvent({ type: 'spawn', unit });
        }
    }

    /**
     * Set a campaign variable.
     * @param {string} name - The name of the variable.
     * @param {any} value - The value of the variable.
     */
    setVar(name, value) {
        this.vars.set(name, value);
    }

    /**
     * Get a campaign variable.
     * @param {string} name - The name of the variable.
     * @returns {any} The value of the variable.
     */
    getVar(name) {
        return this.vars.get(name);
    }

    /**
     * Show a dialog sequence.
     * @param {Array<{speaker: string, text: string}>} dialogData - The dialog data.
     */
    showDialog(dialogData) {
        if (this.gameState.onEvent) {
            this.gameState.onEvent({ type: 'dialog', data: dialogData });
        }
    }
    
    /**
     * Check if two teams are allied.
     * @param {string} teamA 
     * @param {string} teamB 
     * @returns {boolean}
     */
    isAllied(teamA, teamB) {
        if (teamA === teamB) return true;
        const allianceA = this.gameState.alliances[teamA];
        const allianceB = this.gameState.alliances[teamB];
        return allianceA !== undefined && allianceB !== undefined && allianceA === allianceB;
    }

    /**
     * Count units for a specific team.
     * @param {string} team 
     * @returns {number}
     */
    countUnits(team) {
        return this.gameState.units.filter(u => u.team === team && u.hp > 0).length;
    }

    /**
     * Trigger game over.
     * @param {string} winner 
     */
    gameOver(winner) {
        this.gameState.winner = winner;
    }
}
