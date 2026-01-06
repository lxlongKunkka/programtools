import { Unit } from './entity/Unit.js';
import { TEAMS, UNIT_TYPES, UNIT_STATS, TERRAIN } from './constants.js';

export class AI {
    constructor(gameState) {
        this.gameState = gameState;
        this.isCalculating = false;
    }

    async executeTurn() {
        console.log(`AI for Team ${this.gameState.currentTurn} starting turn...`);
        this.isCalculating = true;
        
        // Wait a bit for visual pacing
        await this.sleep(500);

        while (this.isCalculating) {
            // Check if turn ended externally (e.g. game over)
            if (this.gameState.winner) {
                this.isCalculating = false;
                break;
            }

            const acted = await this.performNextAction();
            if (!acted) {
                this.isCalculating = false;
                break;
            }
            await this.sleep(300); // Delay between actions
        }
        console.log("AI Turn Ended");
    }

    async performNextAction() {
        const units = this.getMyUnits();
        
        // 1. Try to find a unit that hasn't acted yet
        for (const unit of units) {
            if (unit.state === 'ready') {
                await this.processUnit(unit);
                return true; // Performed one action (move+act), return to loop
            }
        }

        // 2. If all units done, try to recruit
        const recruited = await this.tryRecruit();
        if (recruited) return true;

        return false;
    }

    async processUnit(unit) {
        // Select the unit
        await this.gameState.selectTile(unit.x, unit.y);
        await this.sleep(200);

        // Get reachable tiles (calculated by GameState on selection)
        const reachable = this.gameState.reachableTiles;
        
        let bestMove = null;
        let bestAction = 'wait';
        let bestTarget = null;
        let maxScore = -Infinity;

        // Iterate all reachable positions (including current position)
        // We need to consider staying put too.
        const moves = [...reachable, { x: unit.x, y: unit.y }];

        for (const pos of moves) {
            const score = this.evaluatePosition(unit, pos);
            if (score > maxScore) {
                maxScore = score;
                bestMove = pos;
            }
        }
        
        // Re-evaluate best move to determine specific action (Attack/Capture/Wait)
        if (bestMove) {
            // Check Capture
            const building = this.gameState.getBuildingAt(bestMove.x, bestMove.y);
            if (building && building.team !== unit.team) {
                 bestAction = 'capture'; 
            }

            // Check Attack
            // Find enemies in range from bestMove
            const enemies = this.findEnemiesInRange(unit, bestMove);
            if (enemies.length > 0) {
                // Simple AI: Attack the weakest or first enemy
                // Better: Attack the one we can kill or do most damage to
                let bestEnemy = null;
                let maxDamage = -1;
                
                for (const enemy of enemies) {
                    // We need damage calculation. GameState has attackUnit but that executes it.
                    // We can estimate or just pick one.
                    // Let's pick the one with lowest HP for now (kill confirm)
                    if (!bestEnemy || enemy.hp < bestEnemy.hp) {
                        bestEnemy = enemy;
                    }
                }
                
                if (bestEnemy) {
                    bestAction = 'attack';
                    bestTarget = bestEnemy;
                }
            }
        }

        // Execute Move
        if (bestMove && (bestMove.x !== unit.x || bestMove.y !== unit.y)) {
            await this.gameState.selectTile(bestMove.x, bestMove.y); // Move
            await this.sleep(300); // Wait for move animation
        }

        // Execute Action
        if (bestAction === 'attack' && bestTarget) {
            await this.gameState.selectTile(bestTarget.x, bestTarget.y); // Attack
            unit.state = 'done';
        } else {
            // Wait or Capture (handled by waitUnit)
            this.gameState.waitUnit(bestMove.x, bestMove.y);
        }
        
        await this.sleep(200);
    }

    evaluatePosition(unit, pos) {
        let score = 0;
        
        // 1. Distance to nearest enemy (closer is better)
        const nearestEnemy = this.findNearestEnemy(pos);
        if (nearestEnemy) {
            const dist = Math.abs(pos.x - nearestEnemy.x) + Math.abs(pos.y - nearestEnemy.y);
            score -= dist * 10;
        }

        // 2. Defensive bonus of terrain
        const terrain = this.gameState.grid.getTerrainAt(pos.x, pos.y);
        // Need TERRAIN_DEFENSE from constants
        // Assuming we can access it or hardcode
        // score += (TERRAIN_DEFENSE[terrain] || 0) * 2;

        // 3. Capture priority
        const building = this.gameState.getBuildingAt(pos.x, pos.y);
        if (building && building.team !== unit.team) {
             score += 1000;
        }

        // 4. Attack opportunity
        if (nearestEnemy) {
             const dist = Math.abs(pos.x - nearestEnemy.x) + Math.abs(pos.y - nearestEnemy.y);
             const minRange = Array.isArray(unit.attackRange) ? unit.attackRange[0] : unit.attackRange;
             const maxRange = Array.isArray(unit.attackRange) ? unit.attackRange[1] : unit.attackRange;
             
             if (dist >= minRange && dist <= maxRange) {
                 score += 500;
             }
        }

        return score;
    }

    findNearestEnemy(pos) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const u of this.gameState.units) {
            if (u.team !== this.gameState.currentTurn && u.hp > 0) {
                const dist = Math.abs(pos.x - u.x) + Math.abs(pos.y - u.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = u;
                }
            }
        }
        return nearest;
    }

    findEnemiesInRange(unit, pos) {
        const enemies = [];
        const minRange = Array.isArray(unit.attackRange) ? unit.attackRange[0] : unit.attackRange;
        const maxRange = Array.isArray(unit.attackRange) ? unit.attackRange[1] : unit.attackRange;

        for (const u of this.gameState.units) {
            if (u.team !== this.gameState.currentTurn && u.hp > 0) {
                const dist = Math.abs(pos.x - u.x) + Math.abs(pos.y - u.y);
                if (dist >= minRange && dist <= maxRange) {
                    enemies.push(u);
                }
            }
        }
        return enemies;
    }

    getMyUnits() {
        return this.gameState.units.filter(u => u.team === this.gameState.currentTurn && u.hp > 0);
    }

    async tryRecruit() {
        // Find castles
        const castles = this.gameState.buildings.filter(b => 
            b.team === this.gameState.currentTurn && 
            (b.type === 'castle' || b.type === 'town')
        );

        for (const castle of castles) {
            // Check if tile is empty
            if (!this.gameState.getUnitAt(castle.x, castle.y)) {
                // Recruit a Soldier (cheap)
                const money = this.gameState.money[this.gameState.currentTurn];
                const type = UNIT_TYPES.SOLDIER;
                const cost = UNIT_STATS[type].cost;

                if (money >= cost) {
                    // Select castle (visual feedback)
                    await this.gameState.selectTile(castle.x, castle.y);
                    await this.sleep(200);
                    
                    // Buy unit
                    this.gameState.money[this.gameState.currentTurn] -= cost;
                    const unit = new Unit(type, this.gameState.currentTurn, castle.x, castle.y);
                    this.gameState.addUnit(unit);
                    
                    // Deselect
                    this.gameState.selectedBuilding = null;
                    
                    return true;
                }
            }
        }
        return false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
