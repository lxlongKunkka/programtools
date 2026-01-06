import { UnitToolkit } from '../utils/UnitToolkit.js';
import { PositionGenerator } from '../manager/PositionGenerator.js';
import { TILE_SIZE, UNIT_TYPES, TERRAIN, ABILITIES } from '../constants.js';

export class AI {
    constructor(gameManager) {
        this.manager = gameManager;
        this.game = gameManager.game;
        this.isCalculating = false;
    }

    async startTurn() {
        console.log(`AI for Team ${this.game.current_team} starting turn...`);
        this.isCalculating = true;
        
        // Wait a bit for visual pacing
        await this.sleep(500);

        while (this.isCalculating) {
            const acted = await this.performNextAction();
            if (!acted) {
                this.isCalculating = false;
                this.manager.endTurn();
                break;
            }
            await this.sleep(300); // Delay between actions
        }
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

        // 2. If all units done, try to recruit (TODO)
        // For now, just return false to end turn
        return false;
    }

    async processUnit(unit) {
        // Select the unit
        this.manager.handleSelect(unit.x, unit.y);
        await this.sleep(200);

        const unitPos = { x: unit.x, y: unit.y };
        const movablePositions = this.manager.movablePositions; // Set of positions
        
        // Simple AI Logic:
        // 1. Check for Capture opportunities
        // 2. Check for Attack opportunities
        // 3. Move towards enemy

        let bestMove = null;
        let bestAction = 'wait';
        let bestTarget = null;
        let maxScore = -Infinity;

        // Iterate all reachable positions
        for (const pos of movablePositions) {
            const score = this.evaluatePosition(unit, pos);
            if (score > maxScore) {
                maxScore = score;
                bestMove = pos;
                // Determine action at this position
                // This is simplified; evaluatePosition should return action too
            }
        }
        
        // Re-evaluate best move to determine specific action (Attack/Capture/Wait)
        if (bestMove) {
            // Simulate move to check for targets
            const attackable = this.manager.positionGenerator.createAttackablePositions(unit, bestMove);
            
            // Check Capture
            const tile = this.game.map.getTile(bestMove.x, bestMove.y);
            if (tile.can_be_captured && tile.team !== unit.team && unit.abilities.includes(ABILITIES.VILLAGE_CAPTURER)) { // Simplified check
                 // Actually need to check specific capturer abilities vs tile type
                 // For now assume if can_be_captured, we want it.
                 bestAction = 'capture'; // Wait on tile = capture
            }

            // Check Attack
            for (const targetPos of attackable) {
                const targetUnit = this.game.map.units.get(targetPos);
                if (targetUnit && this.game.isEnemy(unit.team, targetUnit.team)) {
                    bestAction = 'attack';
                    bestTarget = targetPos;
                    break; // Just pick first target for now
                }
            }
        }

        // Execute Move
        if (bestMove) {
            this.manager.handleMove(bestMove.x, bestMove.y);
            await this.sleep(300); // Wait for move animation
            
            // Wait for animation to finish? 
            // GameManager.handleMove triggers animation state.
            // We need to wait until state is ACTION.
            await this.waitForState(this.manager.constructor.STATE_ACTION);

            // Execute Action
            if (bestAction === 'attack' && bestTarget) {
                this.manager.onAction('attack');
                this.manager.handleAttack(bestTarget.x, bestTarget.y);
            } else {
                this.manager.onAction('wait');
            }
        } else {
            // Should not happen if unit is ready, at least stay put
            this.manager.onAction('wait');
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
        const tile = this.game.map.getTile(pos.x, pos.y);
        score += tile.defence_bonus;

        // 3. Capture priority
        if (tile.can_be_captured && tile.team !== unit.team) {
             if (unit.abilities.includes(ABILITIES.VILLAGE_CAPTURER) || 
                 (tile.is_castle && unit.abilities.includes(ABILITIES.CASTLE_CAPTURER))) {
                 score += 1000;
             }
        }

        // 4. Attack opportunity (simulated)
        // We can't easily simulate attack range from here without PositionGenerator
        // But we know unit.attackRange.
        // Simple check: is any enemy within range?
        if (nearestEnemy) {
             const dist = Math.abs(pos.x - nearestEnemy.x) + Math.abs(pos.y - nearestEnemy.y);
             const minRange = Array.isArray(unit.attackRange) ? unit.attackRange[0] : unit.attackRange;
             const maxRange = Array.isArray(unit.attackRange) ? unit.attackRange[1] : unit.attackRange;
             
             if (dist >= minRange && dist <= maxRange) {
                 score += 500; // Can attack
                 // Bonus for killing blow? (Too complex for now)
             }
        }

        return score;
    }

    findNearestEnemy(pos) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const u of this.game.map.units.values()) {
            if (this.game.isEnemy(this.game.current_team, u.team)) {
                const dist = Math.abs(pos.x - u.x) + Math.abs(pos.y - u.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = u;
                }
            }
        }
        return nearest;
    }

    getMyUnits() {
        const units = [];
        for (const unit of this.game.map.units.values()) {
            if (unit.team === this.game.current_team) {
                units.push(unit);
            }
        }
        return units;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    waitForState(state) {
        return new Promise(resolve => {
            const check = () => {
                if (this.manager.state === state) {
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
    }
}
