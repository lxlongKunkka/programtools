import { TEAMS, UNIT_TYPES, UNIT_STATS, TERRAIN_STATS, ABILITIES } from './constants';

export class AI {
    constructor(gameState) {
        this.gameState = gameState;
        this.team = TEAMS.RED;
    }

    async executeTurn() {
        // 1. Recruit Phase
        this.recruitPhase();

        // 2. Unit Action Phase
        // Filter units that are alive and belong to AI
        const units = this.gameState.units.filter(u => u.team === this.team && u.hp > 0);
        
        for (const unit of units) {
            if (unit.hp <= 0) continue; // Unit might have died during previous actions
            
            await this.processUnit(unit);
            await this.sleep(300); // Delay between units for visual pacing
        }

        // 3. End Turn
        this.gameState.endTurn();
    }

    recruitPhase() {
        // Simple logic: Find empty castles, buy random affordable unit
        const castles = this.gameState.buildings.filter(b => {
            if (b.team !== this.team || b.type !== 'castle') return false;
            
            const unit = this.gameState.getUnitAt(b.x, b.y);
            if (!unit) return true; // Empty castle
            
            if (unit.type === UNIT_TYPES.KING && unit.team === this.team) {
                // Check if there's any valid move for a ground unit from here
                const neighbors = [
                    {x: b.x, y: b.y-1}, {x: b.x, y: b.y+1}, 
                    {x: b.x-1, y: b.y}, {x: b.x+1, y: b.y}
                ];
                
                return neighbors.some(n => {
                    if (n.x < 0 || n.x >= this.gameState.grid.width || n.y < 0 || n.y >= this.gameState.grid.height) return false;
                    const u = this.gameState.getUnitAt(n.x, n.y);
                    if (u && u.team === this.team) return false; // Blocked by friend
                    // Check terrain? Assuming standard unit can move to Plain, Forest, Mountain (maybe), not Water (unless special)
                    const t = this.gameState.grid.getTerrainAt(n.x, n.y);
                    if (t === 1) return false; // Water (assuming basic units)
                    return true;
                });
            }
            return false;
        });

        for (const castle of castles) {
            const money = this.gameState.money[this.team];
            // Simple priority: Paladin > Wolf > Soldier
            if (money >= UNIT_STATS[UNIT_TYPES.PALADIN].cost) {
                this.gameState.buyUnit(UNIT_TYPES.PALADIN, castle.x, castle.y);
            } else if (money >= UNIT_STATS[UNIT_TYPES.WOLF].cost) {
                this.gameState.buyUnit(UNIT_TYPES.WOLF, castle.x, castle.y);
            } else if (money >= UNIT_STATS[UNIT_TYPES.SOLDIER].cost) {
                this.gameState.buyUnit(UNIT_TYPES.SOLDIER, castle.x, castle.y);
            }
        }
    }

    async processUnit(unit) {
        // Calculate all reachable tiles
        const reachable = this.gameState.calculateReachableTiles(unit);
        // Add current position as reachable (stay still), unless forced to move
        if (!unit.mustMove) {
            reachable.push({ x: unit.x, y: unit.y });
        }

        let bestMove = null;
        let bestScore = -Infinity;
        let bestTarget = null;
        let bestActionType = null;

        // Evaluate each move
        for (const tile of reachable) {
            // Skip if occupied by OTHER unit (unless it's self)
            const occupant = this.gameState.getUnitAt(tile.x, tile.y);
            if (occupant && occupant !== unit) continue;

            // Simulate move
            const originalX = unit.x;
            const originalY = unit.y;
            unit.x = tile.x;
            unit.y = tile.y;

            // Check attack opportunities
            const targets = this.gameState.calculateAttackableTiles(unit);
            
            let score = 0;
            let target = null;
            let actionType = 'attack'; // Default action

            // 1. Evaluate Attacks
            if (targets.length > 0) {
                // Evaluate all targets
                let bestTargetScore = -Infinity;
                let bestTargetForMove = null;

                for (const t of targets) {
                    const enemy = t.targetUnit;
                    const damage = this.gameState.calculateDamage(unit, enemy);
                    
                    let currentTargetScore = 0;
                    
                    // Base score for attacking
                    currentTargetScore += 1000;
                    
                    // Damage score (higher damage is better)
                    currentTargetScore += damage * 20;
                    
                    // Kill bonus (huge priority)
                    if (damage >= enemy.hp) {
                        currentTargetScore += 5000;
                        if (enemy.type === UNIT_TYPES.KING) currentTargetScore += 10000; // Win game
                    } else {
                        // If not kill, consider counter attack risk
                        // Simplified: penalize if we take damage back
                        // We don't calculate exact counter damage here to save perf, but we can assume some risk
                        currentTargetScore -= 50;
                    }
                    
                    // Prefer attacking high value targets
                    const enemyStats = UNIT_STATS[enemy.type];
                    if (enemyStats) {
                        currentTargetScore += enemyStats.cost / 10;
                    }

                    // Prefer attacking units that can capture (Soldier, King)
                    if (enemy.abilities.includes(ABILITIES.VILLAGE_CAPTURER) || enemy.abilities.includes(ABILITIES.CASTLE_CAPTURER)) {
                        currentTargetScore += 100;
                    }

                    if (currentTargetScore > bestTargetScore) {
                        bestTargetScore = currentTargetScore;
                        bestTargetForMove = enemy;
                    }
                }
                
                score = bestTargetScore;
                target = bestTargetForMove;
            }

            // 2. Evaluate Skills
            // Check for Heal
            if (unit.abilities.includes(ABILITIES.HEALER)) {
                const healTargets = this.gameState.calculateSkillTargets(unit, 'heal');
                if (healTargets.length > 0) {
                    let bestHealScore = -Infinity;
                    let bestHealTarget = null;

                    for (const t of healTargets) {
                        const ally = this.gameState.getUnitAt(t.x, t.y);
                        if (ally) {
                            let healScore = 1200; // Base priority slightly higher than basic attack
                            const missingHp = ally.maxHp - ally.hp;
                            healScore += missingHp * 10; // Prioritize injured
                            if (ally.hp < 40) healScore += 2000; // Save dying units
                            if (ally.type === UNIT_TYPES.KING) healScore += 1000; // Save King

                            if (healScore > bestHealScore) {
                                bestHealScore = healScore;
                                bestHealTarget = t;
                            }
                        }
                    }

                    if (bestHealScore > score) {
                        score = bestHealScore;
                        target = bestHealTarget; // {x, y, type: 'heal'}
                        actionType = 'heal';
                    }
                }
            }

            // Check for Summon
            if (unit.abilities.includes(ABILITIES.SUMMONER)) {
                const summonTargets = this.gameState.calculateSkillTargets(unit, 'summon');
                if (summonTargets.length > 0) {
                    const skeletonCost = UNIT_STATS[UNIT_TYPES.SKELETON].cost;
                    if (this.gameState.money[this.team] >= skeletonCost) {
                        // Summoning is generally good if we have money and space
                        // But don't spend all money if we need to save for better units?
                        // For AI, let's be aggressive.
                        let summonScore = 1500; 
                        
                        // Prefer summoning closer to enemies?
                        const nearestEnemy = this.findNearestEnemy(unit);
                        if (nearestEnemy) {
                            const dist = Math.abs(nearestEnemy.x - unit.x) + Math.abs(nearestEnemy.y - unit.y);
                            if (dist < 5) summonScore += 500; // Combat support
                        }

                        if (summonScore > score) {
                            score = summonScore;
                            target = summonTargets[0]; // Just pick first valid spot
                            actionType = 'summon';
                        }
                    }
                }
            }

            // Check for Raise Dead
            if (unit.abilities.includes(ABILITIES.RAISE_DEAD)) {
                const raiseTargets = this.gameState.calculateSkillTargets(unit, 'raise_dead');
                if (raiseTargets.length > 0) {
                    let raiseScore = 3000; // Free unit! High priority.
                    if (raiseScore > score) {
                        score = raiseScore;
                        target = raiseTargets[0];
                        actionType = 'raise_dead';
                    }
                }
            }

            // 3. Movement Only (if no action selected or action score is low)
            if (score < 2000) { // If no high priority action
                // Movement score
                // 1. Capture building?
                const building = this.gameState.getBuildingAt(tile.x, tile.y);
                if (building && !this.gameState.isAlly(building.team, this.team)) {
                    // Check if unit can capture
                    if (unit.abilities.includes(ABILITIES.VILLAGE_CAPTURER) && building.type === 'village') {
                        score += 2000;
                    } else if (unit.abilities.includes(ABILITIES.CASTLE_CAPTURER) && building.type === 'castle') {
                        score += 3000;
                    } else {
                        // Just blocking it
                        score += 50;
                    }
                }

                // 2. Distance to nearest enemy
                const nearestEnemy = this.findNearestEnemy(unit);
                if (nearestEnemy) {
                    const dist = Math.abs(nearestEnemy.x - tile.x) + Math.abs(nearestEnemy.y - tile.y);
                    score -= dist * 10; // Closer is better
                }
                
                // 3. Defense bonus
                const terrain = this.gameState.grid.getTerrainAt(tile.x, tile.y);
                const tStats = TERRAIN_STATS[terrain];
                if (tStats && tStats.defense > 0) {
                    score += tStats.defense * 2;
                }
                
                // 4. Heal on building
                if (unit.hp < unit.maxHp) {
                    if (building && building.team === this.team) {
                        score += 200;
                    }
                }
            }

            // Restore unit
            unit.x = originalX;
            unit.y = originalY;

            // Add some randomness to break ties
            score += Math.random() * 5;

            if (score > bestScore) {
                bestScore = score;
                bestMove = tile;
                bestTarget = target;
                bestActionType = actionType;
            }
        }

        if (bestMove) {
            // Execute Move
            const startX = unit.x;
            const startY = unit.y;
            
            this.gameState.moveUnit(unit, bestMove.x, bestMove.y);
            
            // Calculate delay based on distance (approx 200ms per tile)
            const dist = Math.abs(bestMove.x - startX) + Math.abs(bestMove.y - startY);
            await this.sleep(dist * 200 + 300);
            
            if (bestTarget) {
                if (bestActionType === 'attack') {
                    this.gameState.attackUnit(unit, bestTarget);
                    await this.sleep(600); // Wait for attack animation
                } else if (bestActionType === 'heal' || bestActionType === 'repair' || bestActionType === 'raise_dead' || bestActionType === 'summon') {
                    this.gameState.performAction(bestActionType, unit, bestTarget.x, bestTarget.y);
                    await this.sleep(600);
                }
            } else {
                // Wait
                unit.state = 'done';
                this.gameState.checkCapture(unit);
            }
        }
    }

    findNearestEnemy(unit) {
        let nearest = null;
        let minDist = Infinity;
        this.gameState.units.forEach(u => {
            if (!this.gameState.isAlly(u.team, this.team) && u.hp > 0) {
                const dist = Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = u;
                }
            }
        });
        return nearest;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
