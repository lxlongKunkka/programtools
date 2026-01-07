import GameCore from '../entity/GameCore.js';
import PositionGenerator from './PositionGenerator.js';
import UnitToolkit from '../utils/UnitToolkit.js';
import Position from '../entity/Position.js';
import UnitFactory from '../utils/UnitFactory.js';
import Ability from '../entity/Ability.js';

export default class GameManager {
    static STATE_SELECT = 0x1;
    static STATE_MOVE = 0x2;
    static STATE_REMOVE = 0x3;
    static STATE_ACTION = 0x4;
    static STATE_ATTACK = 0x5;
    static STATE_SUMMON = 0x6;
    static STATE_HEAL = 0x7;
    static STATE_PREVIEW = 0x8;
    static STATE_BUY = 0x9;

    constructor() {
        this.state = GameManager.STATE_SELECT;
        this.game = null;
        
        // Components
        this.positionGenerator = new PositionGenerator(this);
        
        // Selection State
        this.selectedUnit = null;
        this.lastPosition = null;
        
        // Cache
        this.movePath = []; // Array<Position>
        this.movablePositions = new Set(); // ObjectSet<Position>
        this.attackablePositions = new Set(); // ObjectSet<Position>
        
        // Listeners
        this.onStateChange = null; // Callback for UI
    }
    
    setListener(listener) {
        this.onStateChange = listener;
    }
    
    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    setGame(game) {
        this.game = game;
        this.updateState(GameManager.STATE_SELECT);
        this.positionGenerator.reset();
        this.selectedUnit = null;
        this.lastPosition = null;
        this.movePath = [];
        this.movablePositions.clear();
        this.attackablePositions.clear();
    }
    
    updateState(newState) {
        this.state = newState;
        this.notifyStateChange();
    }

    getGame() {
        return this.game;
    }
    
    getState() {
        return this.state;
    }
    
    setState(state) {
        this.updateState(state);
    }
    
    getAvailableActions() {
        if (this.state !== GameManager.STATE_ACTION || !this.selectedUnit) {
            return [];
        }
        
        const actions = [];
        const unit = this.selectedUnit;
        const x = unit.getX();
        const y = unit.getY();
        const tile = this.game.getMap().getTile(x, y);
        
        // Attack
        if (unit.getAttack() > 0) {
             // Optional: Check if any target is actually available? 
             // For now always allow, clicking it might show "No targets"
             actions.push({ id: 'attack', label: 'Attack' });
        }
        
        // Capture (Occupy)
        if (unit.hasAbility(Ability.CONQUEROR)) { 
             // Check tile type
             if ((tile.isCastle || tile.isVillage) && tile.getTeam() !== unit.getTeam()) {
                  actions.push({ id: 'occupy', label: 'Occupy' });
             }
        }
        
        // Repair (if Skeleton/Worker) on tomb
        if (unit.hasAbility(Ability.REPAIRER)) {
              // Check tomb
        }

        // Wait (Always available)
        actions.push({ id: 'wait', label: 'Wait' });
        
        // Cancel (Undo move)
        actions.push({ id: 'cancel', label: 'Cancel' });
        
        return actions;
    }
    
    // Actions Execution
    doWait() {
        if (this.selectedUnit) {
            this.selectedUnit.setStandby(true);
            this.selectedUnit = null;
            this.updateState(GameManager.STATE_SELECT);
        }
    }

    beginAttack() {
        if (this.selectedUnit) {
            this.attackablePositions = this.positionGenerator.createAttackablePositions(this.selectedUnit);
            if (this.attackablePositions.size > 0) {
                 this.updateState(GameManager.STATE_ATTACK);
            } else {
                 console.log("No targets in range.");
            }
        }
    }
    
    doOccupy() {
        if (this.selectedUnit) {
            const x = this.selectedUnit.getX();
            const y = this.selectedUnit.getY();
            const tile = this.game.getMap().getTile(x, y);
            const unit = this.selectedUnit;
            
            // Simplified occupancy logic
            // Capture: Set tile team, reduce building HP to 0 (if valid), then restore?
            // AEII logic: Conquer reduces building HP. If <= 0, changes team.
            // Simplified: Instant capture for now or set HP.
            
            // Check if Conqueror
             if (unit.hasAbility(Ability.CONQUEROR)) {
                 // Assume instant capture for now
                 tile.setTeam(unit.getTeam());
                 // Restore building HP?
             }
             
             unit.setStandby(true);
             this.selectedUnit = null;
             this.updateState(GameManager.STATE_SELECT);
        }
    }
    
    doCancel() {
        if (this.selectedUnit && this.lastPosition) {
            this.game.getMap().moveUnit(this.selectedUnit, this.lastPosition.x, this.lastPosition.y);
            this.selectedUnit.setStandby(false); 
            this.updateState(GameManager.STATE_MOVE);
            this.movablePositions = this.positionGenerator.createMovablePositions(this.selectedUnit);
            this.attackablePositions.clear();
        }
    }

    // Input Handling
    onTileClicked(x, y) {
        if (!this.game) return;
        
        console.log(`Clicked ${x}, ${y}, State: ${this.state}`);

        switch (this.state) {
            case GameManager.STATE_SELECT:
                this.handleSelectState(x, y);
                break;
            case GameManager.STATE_MOVE:
                 this.handleMoveState(x, y);
                 break;
            case GameManager.STATE_ATTACK:
                 this.handleAttackState(x, y);
                 break;
            case GameManager.STATE_ACTION:
                break;
        }
    }
    
    handleSelectState(x, y) {
        const unit = this.game.getMap().getUnit(x, y);
        if (unit) {
            if (unit.getTeam() === this.game.getCurrentTeam() && !unit.isStandby()) {
                this.selectedUnit = unit;
                this.lastPosition = this.game.getMap().getPosition(x, y);
                
                const positions = this.positionGenerator.createMovablePositions(unit);
                this.movablePositions = positions;
                
                this.updateState(GameManager.STATE_MOVE);
                console.log(`Selected Unit ${unit.getUnitCode()} at ${x},${y}. Movable: ${positions.size}`);
            }
        }
    }
    
    handleMoveState(x, y) {
        let targetPos = null;
        for (const pos of this.movablePositions) {
            if (pos.x === x && pos.y === y) {
                targetPos = pos;
                break;
            }
        }
        
        if (targetPos) {
            this.game.getMap().moveUnit(this.selectedUnit, x, y);
            this.updateState(GameManager.STATE_ACTION);
            this.movablePositions.clear();
        } else {
            if (this.selectedUnit && this.selectedUnit.getX() === x && this.selectedUnit.getY() === y) {
                 this.updateState(GameManager.STATE_ACTION);
                 this.movablePositions.clear();
            } else {
                 this.updateState(GameManager.STATE_SELECT);
                 this.selectedUnit = null;
                 this.movablePositions.clear();
            }
        }
    }

    handleAttackState(x, y) {
        let targetPos = null;
        for (const pos of this.attackablePositions) {
            if (pos.x === x && pos.y === y) {
                targetPos = pos;
                break;
            }
        }
        
        if (targetPos) {
             const targetUnit = this.game.getMap().getUnit(x, y);
             if (targetUnit) {
                 this.executeAttack(this.selectedUnit, targetUnit);
             }
        } else {
             // Cancel attack mode, go back to Action Menu?
             this.updateState(GameManager.STATE_ACTION);
             this.attackablePositions.clear();
        }
    }

    executeAttack(attacker, defender) {
        // Strict logic port from OperationExecutor.java
        
        // 1. Calculate Attack Damage
        const dmg = UnitToolkit.getDamage(this.game, attacker, defender, true);
        
        // 2. Apply Damage
        defender.setCurrentHp(defender.getCurrentHp() - dmg);
        console.log(`Attack: ${dmg} dmg. Defender HP: ${defender.getCurrentHp()}`);
        
        // 3. Handle Death or Survival
        if (defender.getCurrentHp() <= 0) {
            // Defender Died
            this.game.destroyUnit(defender.getX(), defender.getY());
            // Kill XP
            attacker.gainExperience(this.game.getRule().getInteger(Rule.KILL_EXPERIENCE));
        } else {
            // Defender Survived
            // Attack XP
            attacker.gainExperience(this.game.getRule().getInteger(Rule.ATTACK_EXPERIENCE));
            
             // 4. Counter Attack
             if (this.game.canCounter(attacker, defender)) {
                  const counterDmg = UnitToolkit.getDamage(this.game, defender, attacker, true);
                  attacker.setCurrentHp(attacker.getCurrentHp() - counterDmg);
                  console.log(`Counter: ${counterDmg} dmg`);
                  
                  if (attacker.getCurrentHp() <= 0) {
                       // Attacker Died from Counter
                       this.game.destroyUnit(attacker.getX(), attacker.getY());
                       // Kill XP for Defender
                       defender.gainExperience(this.game.getRule().getInteger(Rule.KILL_EXPERIENCE));
                  } else {
                       // Attacker Survived Counter
                       // Counter XP for Defender
                       defender.gainExperience(this.game.getRule().getInteger(Rule.COUNTER_EXPERIENCE));
                  }
             }
        }
        
        if (attacker.getCurrentHp() > 0) {
             attacker.setStandby(true);
        }
        this.selectedUnit = null;
        this.attackablePositions.clear();
        this.updateState(GameManager.STATE_SELECT);
    }
    
    getMovablePositions() {
        return this.movablePositions;
    }
    
    getAttackablePositions() {
        return this.attackablePositions;
    }
    
    getSelectedUnit() {
        return this.selectedUnit;
    }
}
