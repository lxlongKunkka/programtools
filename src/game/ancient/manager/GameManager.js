import { PositionGenerator } from './PositionGenerator.js';
import { UnitToolkit } from '../utils/UnitToolkit.js';
import { TILE_SIZE, UNIT_TYPES, TERRAIN } from '../constants.js';
import { Tomb } from '../entity/Tomb.js';
import { ActionMenu } from '../ui/ActionMenu.js';
import { UnitInfoMenu } from '../ui/UnitInfoMenu.js';
import { UnitFactory } from '../utils/UnitFactory.js';
import { TileFactory } from '../utils/TileFactory.js';
import { SystemMenu } from '../ui/SystemMenu.js';
import { GameCore } from '../entity/GameCore.js';
import { AI } from '../ai/AI.js';
import { OperationExecutor, OPERATIONS } from './OperationExecutor.js';
import { GameEventExecutor } from './GameEventExecutor.js';
import { AnimationManager } from './AnimationManager.js';

export class GameManager {
    static STATE_SELECT = 0x1;
    static STATE_MOVE = 0x2;
    static STATE_ACTION = 0x4; // Menu or Attack selection
    static STATE_ATTACK = 0x5; // Selecting target
    static STATE_ANIMATING = 0x6; // Unit is moving or attacking
    static STATE_HEAL = 0x7; // Selecting target to heal
    static STATE_SUMMON = 0x8; // Selecting target to summon

    constructor(gameCore, renderer, soundManager, recruitmentMenu) {
        this.game = gameCore;
        this.renderer = renderer;
        this.soundManager = soundManager;
        this.recruitmentMenu = recruitmentMenu;
        this.actionMenu = new ActionMenu(gameCore, renderer, (action, data) => this.onAction(action, data));
        this.unitInfoMenu = new UnitInfoMenu(gameCore);
        this.systemMenu = new SystemMenu(this);
        this.positionGenerator = new PositionGenerator(gameCore);
        this.ai = new AI(this);
        
        // New Managers
        this.operationExecutor = new OperationExecutor(this);
        this.eventExecutor = new GameEventExecutor(this);
        this.animationManager = new AnimationManager();

        this.state = GameManager.STATE_SELECT;
        this.selectedUnit = null;
        this.movablePositions = new Set();
        this.attackablePositions = new Set();
        this.movePath = []; // To draw arrow
        this.active = false;
        
        this.previewDamage = null;
        this.previewTarget = null;
        
        // Bind input (assuming renderer.canvas is available)
        if (this.renderer && this.renderer.canvas) {
            this.renderer.canvas.addEventListener('click', (e) => this.onClick(e));
            this.renderer.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            
            // Key listener for System Menu
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (this.systemMenu.active) {
                        this.systemMenu.hide();
                    } else {
                        this.systemMenu.show();
                    }
                }
            });
        }
    }

    loadGame(json) {
        // Create new GameCore from JSON
        const newGame = new GameCore(json);
        this.game = newGame;
        
        // Update references
        this.positionGenerator = new PositionGenerator(newGame);
        this.actionMenu.game = newGame;
        if (this.recruitmentMenu) this.recruitmentMenu.game = newGame;
        
        // Reset state
        this.setState(GameManager.STATE_SELECT);
        this.renderer.draw(this.game.map, this);
        
        console.log("Game Loaded!");
    }

    setState(state) {
        this.state = state;
        // Clear highlights when changing state, unless moving to a state that needs them
        if (state === GameManager.STATE_SELECT) {
            this.movablePositions.clear();
            this.attackablePositions.clear();
            this.selectedUnit = null;
        }
        this.previewDamage = null;
        this.previewTarget = null;
    }

    update(deltaTime) {
        // 1. Animation Priority
        if (this.animationManager.isAnimating()) {
            this.animationManager.update(deltaTime);
            if (this.renderer) this.renderer.draw(this.game.map, this); // Redraw for animation
            return; // Block other updates
        }

        // 2. Event Priority
        if (this.eventExecutor.isProcessing()) {
            this.eventExecutor.dispatch();
            return;
        }

        // 3. Operation Priority
        this.operationExecutor.operate();

        // Legacy Animation Handling (Movement) - To be migrated to AnimationManager
        if (this.state === GameManager.STATE_ANIMATING && this.selectedUnit) {
            const unit = this.selectedUnit;
            
            // Movement Animation
            if (unit.isMoving && unit.movePath.length > 0) {
                const target = unit.movePath[0];
                const targetX = target.x * TILE_SIZE;
                const targetY = target.y * TILE_SIZE;
                
                const speed = 0.3 * deltaTime; // Pixels per ms
                
                const dx = targetX - unit.pixelX;
                const dy = targetY - unit.pixelY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < speed) {
                    // Reached step
                    unit.pixelX = targetX;
                    unit.pixelY = targetY;
                    unit.movePath.shift();
                    
                    if (unit.movePath.length === 0) {
                        unit.isMoving = false;
                        this.onMoveComplete();
                    }
                } else {
                    unit.pixelX += (dx / dist) * speed;
                    unit.pixelY += (dy / dist) * speed;
                }
            }
            
            // Attack Animation (Bump)
            // We need to animate the unit that is currently attacking.
            // In handleAttack, we set animOffset on selectedUnit.
            // In counter attack, we set animOffset on the defender.
            // So we should iterate all units or track the animating unit.
            // For simplicity, let's check selectedUnit and the unit it's interacting with?
            // Or better: The update loop iterates all units for animation?
            // Currently update() only checks selectedUnit. This is a limitation if we want defender to animate.
            
            // Quick fix: Iterate all units for animation updates
            for (const u of this.game.map.units.values()) {
                if (u.animOffsetX !== 0 || u.animOffsetY !== 0) {
                    const decay = 0.1 * deltaTime;
                    if (Math.abs(u.animOffsetX) < decay) u.animOffsetX = 0;
                    else u.animOffsetX -= Math.sign(u.animOffsetX) * decay;
                    
                    if (Math.abs(u.animOffsetY) < decay) u.animOffsetY = 0;
                    else u.animOffsetY -= Math.sign(u.animOffsetY) * decay;
                    
                    if (u.animOffsetX === 0 && u.animOffsetY === 0) {
                        this.onAttackComplete();
                    }
                }
            }
        }
    }

    onClick(event) {
        if (!this.active) return;
        if (this.state === GameManager.STATE_ANIMATING) return; // Block input during animation
        if (this.ai.isCalculating) return; // Block input during AI turn

        // If menu is active, let it handle clicks (or close it if clicked outside)
        if (this.recruitmentMenu && this.recruitmentMenu.active) {
            // Simple check: if we clicked on map, close menu. 
            // The menu itself handles its own clicks.
            // But since the menu is a DOM element on top of canvas, canvas click means "outside menu".
            this.recruitmentMenu.hide();
            this.setState(GameManager.STATE_SELECT);
            return;
        }

        if (this.actionMenu && this.actionMenu.active) {
            // Clicking outside action menu
            // For now, do nothing, let user click menu options.
            // Or maybe cancel?
            return;
        }

        if (this.systemMenu && this.systemMenu.active) {
            return;
        }

        const rect = this.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const gridX = Math.floor(x / this.renderer.tileSize);
        const gridY = Math.floor(y / this.renderer.tileSize);
        
        if (!this.game.map.isValid(gridX, gridY)) return;

        switch (this.state) {
            case GameManager.STATE_SELECT:
                this.handleSelect(gridX, gridY);
                break;
            case GameManager.STATE_MOVE:
                this.handleMove(gridX, gridY);
                break;
            case GameManager.STATE_ATTACK:
                this.handleAttack(gridX, gridY);
                break;
            case GameManager.STATE_HEAL:
                this.handleHeal(gridX, gridY);
                break;
            case GameManager.STATE_SUMMON:
                this.handleSummon(gridX, gridY);
                break;
        }
        
        // Trigger re-render
        this.renderer.draw(this.game.map, this); // Pass GameManager to renderer to draw highlights
    }
    
    onMouseMove(event) {
        if (this.state !== GameManager.STATE_ATTACK) {
            if (this.previewDamage !== null) {
                this.previewDamage = null;
                this.previewTarget = null;
                this.renderer.draw(this.game.map, this);
            }
            return;
        }

        const rect = this.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const gridX = Math.floor(x / this.renderer.tileSize);
        const gridY = Math.floor(y / this.renderer.tileSize);
        
        if (!this.game.map.isValid(gridX, gridY)) return;

        const targetPos = this.game.map.positions[gridX][gridY];
        
        if (this.attackablePositions.has(targetPos)) {
            const targetUnit = this.game.map.units.get(targetPos);
            if (targetUnit) {
                // Only update if target changed to avoid excessive redraws
                // But wait, if we move mouse within the same tile, we don't want to redraw.
                // But if we move to another tile with same unit (big unit?), well units are 1x1.
                
                if (targetUnit !== this.previewTarget) {
                    const unitToolkit = new UnitToolkit(this.game);
                    // Calculate damage without RNG for preview
                    const damage = unitToolkit.getDamage(this.selectedUnit, targetUnit, false);
                    
                    this.previewDamage = damage;
                    this.previewTarget = targetUnit;
                    this.renderer.draw(this.game.map, this);
                }
            }
        } else {
            if (this.previewDamage !== null) {
                this.previewDamage = null;
                this.previewTarget = null;
                this.renderer.draw(this.game.map, this);
            }
        }
    }

    handleSelect(x, y) {
        // Compatibility with GameState
        if (!this.game.map && this.game.selectTile) {
            this.game.selectTile(x, y);
            return;
        }

        const unit = this.game.map.units.get(this.game.map.positions[x][y]);
        const tile = this.game.map.getTile(x, y);
        
        // Unit Selection
        if (unit && unit.team === this.game.current_team && unit.state === 'ready') {
            this.selectedUnit = unit;
            this.movablePositions = this.positionGenerator.createMovablePositions(unit);
            this.setState(GameManager.STATE_MOVE);
            if (this.soundManager) this.soundManager.playSound('prompt');
            return;
        }
        
        // Castle Recruitment Selection
        // Condition: Is Castle, Is Owned by Current Team, Is Empty (no unit)
        if (tile.is_castle && tile.team === this.game.current_team && !unit) {
            if (this.recruitmentMenu) {
                this.recruitmentMenu.show(x, y, this.game.map.positions[x][y]);
                this.setState(GameManager.STATE_ACTION); // Block other inputs
            }
        }
    }

    handleMove(x, y) {
        const targetPos = this.game.map.positions[x][y];
        
        // Check if clicked position is in movable positions
        if (this.movablePositions.has(targetPos)) {
            // Start Animation
            // Use BFS path reconstruction.
            const path = this.positionGenerator.findPath(this.selectedUnit, targetPos);
            
            this.selectedUnit.movePath = path; // Queue of positions to visit
            this.selectedUnit.isMoving = true;
            this.setState(GameManager.STATE_ANIMATING);
            
            // Logic update happens AFTER animation in onMoveComplete
        } else {
            // Cancel selection
            this.setState(GameManager.STATE_SELECT);
        }
    }

    onMoveComplete() {
        const unit = this.selectedUnit;
        // Finalize position in logic
        // 1. Remove from old position
        const oldPos = this.game.map.positions[unit.x][unit.y];
        this.game.map.units.delete(oldPos);
        
        // 2. Update unit coordinates (pixel coords are already at target)
        unit.x = Math.round(unit.pixelX / TILE_SIZE);
        unit.y = Math.round(unit.pixelY / TILE_SIZE);
        
        // 3. Add to new position
        const newPos = this.game.map.positions[unit.x][unit.y];
        this.game.map.units.set(newPos, unit);
        
        // Check for capture
        const tile = this.game.map.getTile(unit.x, unit.y);
        if (tile.can_be_captured && tile.team !== unit.team) {
            if (tile.captured_tile_list && tile.captured_tile_list.length > unit.team) {
                const newTileId = tile.captured_tile_list[unit.team];
                this.game.map.setTile(newTileId, unit.x, unit.y);
                console.log(`Unit captured tile at ${unit.x}, ${unit.y}. New ID: ${newTileId}`);
                if (this.soundManager) this.soundManager.playSound('prompt'); // Use prompt sound for now
            }
        }

        // 4. Transition to Action/Attack phase
        this.attackablePositions = this.positionGenerator.createAttackablePositions(unit, newPos);
        
        const enemiesInRange = [];
        for (const pos of this.attackablePositions) {
            const target = this.game.map.units.get(pos);
            if (target && this.game.isEnemy(unit.team, target.team)) {
                enemiesInRange.push(pos);
            }
        }
        
        if (enemiesInRange.length > 0) {
            // this.setState(GameManager.STATE_ATTACK);
            // this.attackablePositions = new Set(enemiesInRange);
        } else {
            // unit.state = 'done';
            // this.setState(GameManager.STATE_SELECT);
        }
        
        this.enemiesInRange = enemiesInRange;
        this.setState(GameManager.STATE_ACTION);
        this.actionMenu.show(unit.x, unit.y, unit, enemiesInRange.length > 0);
        
        this.renderer.draw(this.game.map, this);
    }

    onAction(action, data) {
        if (action === 'wait') {
            this.selectedUnit.state = 'done';
            this.setState(GameManager.STATE_SELECT);
            this.renderer.draw(this.game.map, this);
        } else if (action === 'attack') {
            this.setState(GameManager.STATE_ATTACK);
            this.attackablePositions = new Set(this.enemiesInRange);
            this.renderer.draw(this.game.map, this);
        } else if (action === 'info') {
            this.unitInfoMenu.show(this.selectedUnit, () => {
                this.actionMenu.show(this.selectedUnit.x, this.selectedUnit.y, this.selectedUnit, this.enemiesInRange.length > 0);
            });
        } else if (action === 'skill') {
            if (data === 'raise_dead') {
                this.handleRaiseDead();
            } else if (data === 'heal') {
                this.prepareHeal();
            } else if (data === 'summon') {
                this.prepareSummon();
            } else if (data === 'repair') {
                this.handleRepair();
            }
        }
    }

    handleRepair() {
        const unit = this.selectedUnit;
        const tile = this.game.map.getTile(unit.x, unit.y);
        
        if (tile.can_be_repaired) {
            let newTileId = tile.repaired_index;
            const repairedTile = TileFactory.getTile(newTileId);
            
            if (repairedTile.captured_tile_list && repairedTile.captured_tile_list.length > unit.team) {
                newTileId = repairedTile.captured_tile_list[unit.team];
            }
            
            this.game.map.setTile(newTileId, unit.x, unit.y);
            console.log(`Repaired village at ${unit.x},${unit.y} to ID ${newTileId}`);
            if (this.soundManager) this.soundManager.playSound('prompt');
            
            this.endAction(unit);
        }
    }

    prepareSummon() {
        const unit = this.selectedUnit;
        const range = 1;
        const summonablePositions = new Set();
        
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > range) continue;
                const tx = unit.x + dx;
                const ty = unit.y + dy;
                
                if (this.game.map.isValid(tx, ty)) {
                    const targetPos = this.game.map.positions[tx][ty];
                    const targetUnit = this.game.map.units.get(targetPos);
                    const tile = this.game.map.getTile(tx, ty);
                    
                    // Can summon on empty land (not water unless bridge/flying?)
                    // Skeletons are land units.
                    if (!targetUnit && tile.type !== TERRAIN.WATER) {
                        summonablePositions.add(targetPos);
                    }
                }
            }
        }
        
        if (summonablePositions.size > 0) {
            this.setState(GameManager.STATE_SUMMON);
            this.summonablePositions = summonablePositions;
            this.attackablePositions = summonablePositions; // Reuse for highlight
            this.renderer.draw(this.game.map, this);
        } else {
            console.log("No space to summon!");
            this.actionMenu.show(unit.x, unit.y, unit, this.enemiesInRange.length > 0);
        }
    }

    handleSummon(x, y) {
        const targetPos = this.game.map.positions[x][y];
        if (this.summonablePositions.has(targetPos)) {
            const skeleton = UnitFactory.createUnit(UNIT_TYPES.SKELETON, this.selectedUnit.team);
            skeleton.x = x;
            skeleton.y = y;
            skeleton.state = 'done';
            
            this.game.map.units.set(targetPos, skeleton);
            console.log(`Summoned Skeleton at ${x},${y}`);
            if (this.soundManager) this.soundManager.playSound('prompt');
            
            this.endAction(this.selectedUnit);
        } else {
            // Cancel
            this.actionMenu.show(this.selectedUnit.x, this.selectedUnit.y, this.selectedUnit, this.enemiesInRange.length > 0);
        }
    }

    prepareHeal() {
        const unit = this.selectedUnit;
        const range = 1; // Adjacent
        const healablePositions = new Set();
        
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > range) continue;
                const tx = unit.x + dx;
                const ty = unit.y + dy;
                
                if (this.game.map.isValid(tx, ty)) {
                    const targetPos = this.game.map.positions[tx][ty];
                    const targetUnit = this.game.map.units.get(targetPos);
                    
                    // Can heal allies (including self?) usually not self if range 1, but let's assume allies.
                    // And must be damaged.
                    if (targetUnit && targetUnit.team === unit.team && targetUnit.hp < targetUnit.maxHp) {
                        healablePositions.add(targetPos);
                    }
                }
            }
        }
        
        if (healablePositions.size > 0) {
            this.setState(GameManager.STATE_HEAL);
            this.healablePositions = healablePositions;
            // Reuse attackablePositions for highlighting (red) or add new highlight color?
            // Let's use attackablePositions set but maybe renderer can distinguish if state is HEAL.
            // For now, just put them in attackablePositions so they get highlighted red (or we add green).
            this.attackablePositions = healablePositions; 
            this.renderer.draw(this.game.map, this);
        } else {
            console.log("No targets to heal!");
            this.actionMenu.show(unit.x, unit.y, unit, this.enemiesInRange.length > 0);
        }
    }

    handleHeal(x, y) {
        const targetPos = this.game.map.positions[x][y];
        if (this.healablePositions.has(targetPos)) {
            const targetUnit = this.game.map.units.get(targetPos);
            if (targetUnit) {
                const healAmount = 20; // Fixed amount + maybe magic stat?
                const oldHp = targetUnit.hp;
                targetUnit.hp = Math.min(targetUnit.maxHp, targetUnit.hp + healAmount);
                const healed = targetUnit.hp - oldHp;
                
                console.log(`Healed unit at ${x},${y} for ${healed} HP.`);
                
                this.selectedUnit.gainXp(10); // XP for healing
                this.endAction(this.selectedUnit);
            }
        } else {
            // Cancel
            this.actionMenu.show(this.selectedUnit.x, this.selectedUnit.y, this.selectedUnit, this.enemiesInRange.length > 0);
        }
    }

    handleRaiseDead() {
        const unit = this.selectedUnit;
        const range = 1; // Adjacent
        const tombs = [];
        
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > range) continue; // Manhattan distance
                const tx = unit.x + dx;
                const ty = unit.y + dy;
                
                if (this.game.map.isValid(tx, ty)) {
                    for (const tomb of this.game.map.tombs) {
                        if (tomb.x === tx && tomb.y === ty) {
                            tombs.push(tomb);
                        }
                    }
                }
            }
        }
        
        if (tombs.length > 0) {
            // If multiple, maybe select? For now, just pick first.
            const tomb = tombs[0];
            this.raiseSkeleton(tomb);
        } else {
            console.log("No tombs nearby!");
            // Re-show menu?
            this.actionMenu.show(unit.x, unit.y, unit, this.enemiesInRange.length > 0);
        }
    }

    doBuyUnit(index, x, y) {
        const team = this.game.currentTurn;
        // Check if can buy (using GameCore logic)
        // Assuming GameCore has canBuy(index, team)
        // If not, we might need to implement it or check money directly
        if (this.game.canBuy(index, team)) {
            this.operationExecutor.submit(OPERATIONS.BUY, index, team, x, y);
            this.operationExecutor.submit(OPERATIONS.SELECT, x, y);
        }
    }

    raiseSkeleton(tomb) {
        // Remove tomb
        this.game.map.tombs.delete(tomb);
        
        // Spawn Skeleton
        const skeleton = UnitFactory.createUnit(UNIT_TYPES.SKELETON, this.selectedUnit.team);
        skeleton.x = tomb.x;
        skeleton.y = tomb.y;
        
        const pos = this.game.map.positions[tomb.x][tomb.y];
        this.game.map.units.set(pos, skeleton);
        
        this.selectedUnit.state = 'done';
        this.setState(GameManager.STATE_SELECT);
        this.renderer.draw(this.game.map, this);
    }

    onOperationFinished() {
        // Called when operation queue is empty
        // Sync state or check game over
    }

    handleAttack(x, y) {
        const targetPos = this.game.map.positions[x][y];
        if (this.attackablePositions.has(targetPos)) {
            const targetUnit = this.game.map.units.get(targetPos);
            if (targetUnit) {
                // Submit Operations instead of direct execution
                this.operationExecutor.submit(OPERATIONS.ATTACK, this.selectedUnit.x, this.selectedUnit.y, x, y);
                this.operationExecutor.submit(OPERATIONS.COUNTER, this.selectedUnit.x, this.selectedUnit.y, x, y);
                this.operationExecutor.submit(OPERATIONS.ACTION_FINISH, this.selectedUnit.x, this.selectedUnit.y);
                
                this.setState(GameManager.STATE_ANIMATING); // Block input
            }
        } else {
             this.selectedUnit.state = 'done'; 
             this.setState(GameManager.STATE_SELECT);
        }
    }

    performAttackAnimation(attacker, defender, onComplete) {
        // Deprecated: Use AnimationManager
    }

    onAttackComplete() {
        // Deprecated
    }

    resolveCombat(attacker, defender) {
        // Deprecated: Logic moved to OperationExecutor
    }

    resolveCounter(defender, attacker) {
        // Deprecated: Logic moved to OperationExecutor
    }

    handleUnitDeath(victim, killer) {
        const pos = this.game.map.positions[victim.x][victim.y];
        this.game.map.units.delete(pos);

        // Create Tomb
        const tomb = new Tomb(victim.x, victim.y, victim.team);
        this.game.map.tombs.add(tomb);
        
        // Bonus XP for killer
        if (killer) {
            killer.gainXp(30); // Kill bonus
        }

        this.checkGameOver();
    }

    endTurn() {
        // Cycle to next team
        let nextTeam = this.game.current_team + 1;
        if (nextTeam >= 4) {
            nextTeam = 0;
            this.game.turn++;
        }
        
        // Skip destroyed teams
        let loopCount = 0;
        while (this.game.team_destroy[nextTeam] && loopCount < 4) {
            nextTeam++;
            if (nextTeam >= 4) {
                nextTeam = 0;
                this.game.turn++;
            }
            loopCount++;
        }
        
        if (loopCount >= 4) {
            console.log("All teams destroyed? Game Over.");
            return;
        }

        this.game.setCurrentTeam(nextTeam);
        this.game.startTurn();
        
        // Check if AI
        const player = this.game.getPlayer(nextTeam);
        if (player && player.type === 1) { // 1 = AI
            this.ai.startTurn();
        }
        
        this.setState(GameManager.STATE_SELECT);
        this.renderer.draw(this.game.map, this);
    }

    endAction(unit) {
        if (unit.hp > 0) {
            unit.state = 'done';
        }
        this.setState(GameManager.STATE_SELECT);
        this.renderer.draw(this.game.map, this);
    }

    checkGameOver() {
        // Victory Conditions:
        // 1. Enemy Commander (King) is killed.
        // 2. Enemy has NO units AND NO castles (cannot produce).
        
        // We check all teams. If only one team (or alliance) remains, they win.
        // For now, assume 2 teams: 0 and 1.
        
        const teamsAlive = new Set();
        
        // Check units
        for (const unit of this.game.map.units.values()) {
            teamsAlive.add(unit.team);
        }
        
        // Check castles (if a team has castles, they are still in game, unless they have no King in a King-mode)
        // But standard Ancient Empires logic:
        // - If you have a King unit, losing it means instant defeat.
        // - If you don't have a King unit (skirmish without king), you lose if you have no units and no castles.
        
        // Let's refine:
        // Iterate all 4 potential teams
        for (let team = 0; team < 4; team++) {
            if (this.game.team_destroy[team]) continue; // Already dead
            
            let hasKing = false;
            let kingAlive = false;
            let hasUnits = false;
            let hasCastles = false;
            
            // Check Units
            for (const unit of this.game.map.units.values()) {
                if (unit.team === team) {
                    hasUnits = true;
                    if (unit.type === UNIT_TYPES.KING) {
                        hasKing = true;
                        kingAlive = true;
                    }
                }
            }
            
            // Check Castles
            // We need to iterate map tiles to find castles owned by team
            // Optimization: Map could cache castle owners, but for now iterate.
            // Actually Map.js has castle_positions, we can check those.
            // But we need to know who owns them.
            // Let's iterate map data or assume we can check this efficiently.
            // For now, full scan is okay for small maps, but let's try to be smarter if possible.
            // Map.js doesn't track ownership easily without scanning.
            // Let's scan castle_positions if available, or just full scan.
            // Map.js: this.castle_positions = new Set();
            
            if (this.game.map.castle_positions) {
                for (const pos of this.game.map.castle_positions) {
                    const tile = this.game.map.getTile(pos.x, pos.y);
                    if (tile && tile.team === team) {
                        hasCastles = true;
                        break;
                    }
                }
            }
            
            // Determine status
            let isDead = false;
            
            // Condition 1: Had a King, but King is dead? 
            // Wait, how do we know if they "Had" a King? 
            // We check if they have a King NOW. If they don't, did they start with one?
            // GameCore has `this.commanders`. If `this.commanders[team]` is set, they started with a King.
            
            if (this.game.commanders[team]) {
                // Started with King. Is King alive?
                // We scanned units and found `kingAlive`.
                if (!kingAlive) {
                    isDead = true;
                    console.log(`Team ${team} lost their King!`);
                }
            } else {
                // No King mode. Lose if no units and no castles.
                if (!hasUnits && !hasCastles) {
                    isDead = true;
                    console.log(`Team ${team} has no units and no castles!`);
                }
            }
            
            if (isDead) {
                this.game.setTeamDestroyed(team, true);
                // Remove all units of this team? Or they become neutral? Usually they vanish.
                // Let's remove them to be safe.
                const toRemove = [];
                for (const unit of this.game.map.units.values()) {
                    if (unit.team === team) toRemove.push(unit);
                }
                for (const u of toRemove) {
                    const pos = this.game.map.positions[u.x][u.y];
                    this.game.map.units.delete(pos);
                    this.game.map.addTomb(new Tomb(u.x, u.y, u.team));
                }
            } else {
                teamsAlive.add(team);
            }
        }
        
        // Check Winner
        // If only one team (or alliance) left
        // Simplified: If only Team 0 or Team 1 is left.
        
        const activeTeams = Array.from(teamsAlive);
        if (activeTeams.length === 1) {
            const winner = activeTeams[0];
            alert(`Game Over! Team ${winner === 0 ? 'Blue' : 'Red'} Wins!`);
            this.game.game_over = true;
        } else if (activeTeams.length === 0) {
             // Draw?
             alert('Game Over! Draw?');
             this.game.game_over = true;
        }
    }
}
