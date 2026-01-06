import { UnitToolkit } from '../utils/UnitToolkit.js';
import { Position } from '../entity/Position.js';

class Step {
    constructor(position, movementPoint) {
        this.position = position;
        this.movementPoint = movementPoint;
    }
}

export class PositionGenerator {
    constructor(gameCore) {
        this.game = gameCore;
        this.move_path = [];
        this.movable_positions = new Set();
        this.move_mark_map = [];
        
        this.x_dir = [1, -1, 0, 0];
        this.y_dir = [0, 0, 1, -1];
    }

    getGame() {
        return this.game;
    }

    reset() {
        this.current_unit = null;
    }

    initializeMoveMarkMap() {
        const width = this.getGame().map.getWidth();
        const height = this.getGame().map.getHeight();
        this.move_mark_map = Array(width).fill().map(() => Array(height).fill(Number.MIN_SAFE_INTEGER));
    }

    createMovablePositions(unit, preview = false) {
        this.movable_positions.clear();
        if (!unit) return new Set();

        this.current_unit = unit; 
        this.initializeMoveMarkMap();
        
        const startStep = new Step(new Position(unit.x, unit.y), unit.moved ? 0 : unit.moveRange); 
        
        const currentSteps = [startStep];
        this.bfsMovablePositions(currentSteps, unit, preview);
        
        return new Set(this.movable_positions);
    }

    bfsMovablePositions(currentSteps, unit, preview) {
        // Iterative BFS
        const queue = [...currentSteps];
        
        while (queue.length > 0) {
            const currentStep = queue.shift();
            const stepX = currentStep.position.x;
            const stepY = currentStep.position.y;
            const currentMp = currentStep.movementPoint;

            if (currentMp > this.move_mark_map[stepX][stepY]) {
                this.move_mark_map[stepX][stepY] = currentMp;
                
                if (preview || this.canUnitMove(unit, stepX, stepY)) {
                    const posObj = this.getGame().map.positions[stepX][stepY];
                    this.movable_positions.add(posObj);
                }
                
                for (let i = 0; i < 4; i++) {
                    const nextX = stepX + this.x_dir[i];
                    const nextY = stepY + this.y_dir[i];

                    if (this.getGame().map.isValid(nextX, nextY)) {
                        const nextTile = this.getGame().map.getTile(nextX, nextY);
                        const mpCost = UnitToolkit.getMovementPointCost(unit, nextTile);
                        const mpLeft = currentMp - mpCost;

                        // Optimization: Only push if this path is better
                        if (mpCost <= currentMp && mpLeft > this.move_mark_map[nextX][nextY]) {
                            const targetUnit = this.getGame().map.units.get(this.getGame().map.positions[nextX][nextY]);
                            
                            if (preview || this.canMoveThrough(unit, targetUnit)) {
                                const nextPos = this.getGame().map.positions[nextX][nextY];
                                queue.push(new Step(nextPos, mpLeft));
                            }
                        }
                    }
                }
            }
        }
    }

    findPath(unit, targetPos) {
        // BFS to find path
        const startPos = this.getGame().map.positions[unit.x][unit.y];
        
        this.initializeMoveMarkMap();
        const parentMap = new Map(); // child -> parent
        
        const startStep = new Step(startPos, unit.moveRange);
        const openSet = [startStep];
        this.move_mark_map[startPos.x][startPos.y] = unit.moveRange;
        
        let found = false;
        
        while (openSet.length > 0) {
            // Sort by MP left (Dijkstra-ish, max MP first)
            openSet.sort((a, b) => b.movementPoint - a.movementPoint);
            const currentStep = openSet.shift();
            const currentPos = currentStep.position;
            
            if (currentPos === targetPos) {
                found = true;
                break;
            }
            
            for (let i = 0; i < 4; i++) {
                const nextX = currentPos.x + this.x_dir[i];
                const nextY = currentPos.y + this.y_dir[i];
                
                if (this.getGame().map.isValid(nextX, nextY)) {
                    const nextPos = this.getGame().map.positions[nextX][nextY];
                    const nextTile = this.getGame().map.getTile(nextX, nextY);
                    const mpCost = UnitToolkit.getMovementPointCost(unit, nextTile);
                    const mpLeft = currentStep.movementPoint - mpCost;
                    
                    if (mpCost <= currentStep.movementPoint && mpLeft > this.move_mark_map[nextX][nextY]) {
                        const targetUnit = this.getGame().map.units.get(nextPos);
                        if (this.canMoveThrough(unit, targetUnit)) {
                            this.move_mark_map[nextX][nextY] = mpLeft;
                            parentMap.set(nextPos, currentPos);
                            openSet.push(new Step(nextPos, mpLeft));
                        }
                    }
                }
            }
        }
        
        if (found) {
            const path = [];
            let curr = targetPos;
            while (curr !== startPos) {
                path.unshift(curr);
                curr = parentMap.get(curr);
            }
            return path;
        }
        return [targetPos]; // Fallback
    }

    canUnitMove(unit, x, y) {
        // Can the unit end its turn at x,y?
        // 1. Must be valid terrain (handled by cost check usually, but cost might be 99)
        // 2. Must not be occupied by another unit (unless it's the unit itself)
        const targetUnit = this.getGame().map.units.get(this.getGame().map.positions[x][y]);
        if (targetUnit && targetUnit !== unit) return false;
        return true;
    }

    canMoveThrough(unit, targetUnit) {
        // Can move through empty space or allies
        if (!targetUnit) return true;
        return !this.getGame().isEnemy(unit.team, targetUnit.team);
    }
    
    createAttackablePositions(unit, movedPos) {
        // Calculate attack range from the moved position (or current position)
        const positions = new Set();
        const minRange = unit.attackRange[0];
        const maxRange = unit.attackRange[1];
        const startX = movedPos ? movedPos.x : unit.x;
        const startY = movedPos ? movedPos.y : unit.y;
        
        const width = this.getGame().map.getWidth();
        const height = this.getGame().map.getHeight();

        // Simple bounding box iteration for range
        for (let x = Math.max(0, startX - maxRange); x <= Math.min(width - 1, startX + maxRange); x++) {
            for (let y = Math.max(0, startY - maxRange); y <= Math.min(height - 1, startY + maxRange); y++) {
                const dist = Math.abs(x - startX) + Math.abs(y - startY);
                if (dist >= minRange && dist <= maxRange) {
                    positions.add(this.getGame().map.positions[x][y]);
                }
            }
        }
        return positions;
    }
}
