import UnitFactory from '../utils/UnitFactory.js';
import UnitToolkit from '../utils/UnitToolkit.js';

class Step {
    constructor(position, movementPoint) {
        this.position = position;
        this.movementPoint = movementPoint;
    }
}

export default class PositionGenerator {
    constructor(manager) {
        this.manager = manager;
        this.move_path = [];
        this.movable_positions = new Set();
        
        this.x_dir = [1, -1, 0, 0];
        this.y_dir = [0, 0, 1, -1];
        
        this.current_unit = null;
        this.move_mark_map = null;
    }

    reset() {
        this.current_unit = null;
    }

    getGame() {
        return this.manager.getGame();
    }

    getPosition(unit) {
        return this.getGame().getMap().getPosition(unit.getX(), unit.getY());
    }

    createStartStep(unit) {
        // Step(position, mp)
        const pos = this.getPosition(unit);
        return [ new Step(pos, unit.getCurrentMovementPoint()) ];
    }

    initializeMoveMarkMap() {
        const width = this.getGame().getMap().getWidth();
        const height = this.getGame().getMap().getHeight();
        this.move_mark_map = Array.from({ length: width }, () => new Int32Array(height).fill(-999999));
    }

    createMovablePositions(unit, preview = false) {
        this.movable_positions.clear();
        if (!unit) return new Set();

        this.current_unit = UnitFactory.cloneUnit(unit);
        this.initializeMoveMarkMap();
        
        const startSteps = this.createStartStep(unit);
        this.processSteps(startSteps, unit, preview);
        
        return new Set(this.movable_positions); // Return shallow copy
    }

    createAttackablePositions(unit) {
        const attackable = new Set();
        const map = this.getGame().getMap();
        const minRange = unit.getMinAttackRange();
        const maxRange = unit.getMaxAttackRange();
        const startX = unit.getX();
        const startY = unit.getY();

        for (let x = startX - maxRange; x <= startX + maxRange; x++) {
            for (let y = startY - maxRange; y <= startY + maxRange; y++) {
                if (map.isWithinMap(x, y)) {
                    const dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist >= minRange && dist <= maxRange) {
                        const targetUnit = map.getUnit(x, y);
                         if (targetUnit && targetUnit.getTeam() !== unit.getTeam()) {
                             attackable.add(map.getPosition(x, y));
                        }
                    }
                }
            }
        }
        return attackable;
    }

    processSteps(currentSteps, unit, preview) {
        const nextSteps = []; // Not used? Java uses recursive call or loops?
        // Java code:
        // createMovablePositions(Queue<Step> current_steps, ...)
        // while (!current_steps.isEmpty()) ...
        //   recurse? No, it pushes to queue?
        // Java uses BFS probably.
        
        // Wait, standard BFS would use a single queue.
        // Java snippet read earlier:
        /*
        private void createMovablePositions(Queue<Step> current_steps, Unit unit, boolean preview) {
            Queue<Step> next_steps = new LinkedList<Step>();
            while (!current_steps.isEmpty()) {
                 ...
                 // logic adds to movable_positions and if remaining MP, adds to ... next_steps? maybe implied?
                 // Wait, snippet ended at "int movement_point_cost = UnitToolkit..."
            }
        */
        
        // Typical BFS logic for turn based strategy:
        // Queue = start
        // while queue not empty:
        //   pop current
        //   check neighbors
        //   calc cost
        //   if cost <= remaining MP AND better path found:
        //      push neighbor to queue
        
        const queue = [...currentSteps];
        
        while (queue.length > 0) {
            const currentStep = queue.shift();
            const stepPos = currentStep.position;
            const currentMp = currentStep.movementPoint;
            
            // Note: Java uses move_mark_map to prune suboptimal paths (Dijkstra-ish)
            if (currentMp > this.move_mark_map[stepPos.x][stepPos.y]) {
                this.move_mark_map[stepPos.x][stepPos.y] = currentMp;
                
                // Can we stop (stand) here?
                // If preview, yes (ignore unit collision).
                // If not preview, check unit collision.
                // canUnitMove checks occupancy?
                if (preview || this.getGame().canUnitMove(unit, stepPos.x, stepPos.y)) {
                     this.movable_positions.add(stepPos);
                }
                
                // Neighbors
                for (let i = 0; i < 4; i++) {
                    const nextX = stepPos.x + this.x_dir[i];
                    const nextY = stepPos.y + this.y_dir[i];
                    
                    if (this.getGame().getMap().isWithinMap(nextX, nextY)) {
                        const nextPos = this.getGame().getMap().getPosition(nextX, nextY);
                        const nextTile = this.getGame().getMap().getTile(nextX, nextY);
                        
                        const cost = UnitToolkit.getMovementPointCost(unit, nextTile);
                        
                        // Check if passable
                        // Usually cost < 99.
                        // And check Enemy Unit blocking (Zone of Control or just blocked)
                        
                        // Check for enemy unit blocking passage?
                        // "canPass" logic usually checks unit layer.
                        
                        // If tile cost large, cannot move.
                        if (cost <= currentMp) {
                             // Check for unit blocking?
                             // Generally in AEII, you cannot move THROUGH enemies unless flying/stealth.
                             // Passable check:
                             if (this.canPass(unit, nextX, nextY)) {
                                 queue.push(new Step(nextPos, currentMp - cost));
                             }
                        }
                    }
                }
            }
        }
    }
    
    canPass(unit, x, y) {
        // Check unit at x,y
        // If enemy, return false (unless special ability)
        // If ally, return true (can pass through, but maybe not stand?)
        const targetUnit = this.getGame().getMap().getUnit(x, y);
        if (!targetUnit) return true;
        
        if (this.getGame().isEnemy(unit.getTeam(), targetUnit.getTeam())) {
            // Cannot pass enemy?
            // Unless "Conqueror" or Flying?
            // Usually blocked.
            return false;
        }
        return true;
    }
}
