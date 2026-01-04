import { Unit } from './Unit.js';
import { TEAMS, TERRAIN, TERRAIN_DEFENSE, UNIT_STATS, ATTACK_TYPES, MOVE_TYPES, UNIT_TYPES, ABILITIES, TERRAIN_STATS } from './constants.js';

export class GameState {
  constructor(grid, levelData = {}) {
    this.grid = grid;
    this.units = [];
    this.currentTurn = TEAMS.BLUE;
    this.winner = null;
    this.money = levelData.money || { [TEAMS.BLUE]: 150, [TEAMS.RED]: 150 }; // Starting gold
    this.populationLimit = levelData.populationLimit || 50; // Default limit
    this.buildings = []; // [{x, y, team, type}]
    this.initializeBuildings(levelData.buildings);

    this.selectedUnit = null;
    this.selectedBuilding = null; // For buy menu
    this.reachableTiles = []; // [{x, y}]
    this.attackableTiles = []; // [{x, y, targetUnit}]
    this.skillTargets = []; // [{x, y, type}]
    this.floatingTexts = []; // [{x, y, text, color, life}]
    this.tombstones = []; // [{x, y, team, life}]
    
    this.onEvent = null; // Callback for UI animations
    
    this.commanderDeaths = { [TEAMS.BLUE]: 0, [TEAMS.RED]: 0 };
    this.winCondition = levelData.winCondition || 'annihilation'; // 'annihilation' or 'commander_death'
    this.alliances = {}; // { [team]: allianceId }
  }

  initializeBuildings(predefinedBuildings) {
      const buildingMap = new Map();
      if (predefinedBuildings) {
          predefinedBuildings.forEach(b => {
              buildingMap.set(`${b.x},${b.y}`, b);
          });
      }

      for (let y = 0; y < this.grid.height; y++) {
          for (let x = 0; x < this.grid.width; x++) {
              const terrain = this.grid.getTerrainAt(x, y);
              if (terrain === TERRAIN.CASTLE || terrain === TERRAIN.VILLAGE || terrain === TERRAIN.TOWN) {
                  const key = `${x},${y}`;
                  const predefined = buildingMap.get(key);
                  
                  let team = null;
                  let type = 'village';
                  if (terrain === TERRAIN.CASTLE) type = 'castle';
                  else if (terrain === TERRAIN.TOWN) type = 'town';

                  if (predefined) {
                      team = predefined.team;
                      // type = predefined.type; // Trust terrain type over predefined type?
                  } else {
                      // Fallback heuristic for maps without building data
                      if (terrain === TERRAIN.CASTLE) {
                          if (x < 3) team = TEAMS.BLUE;
                          else if (x >= this.grid.width - 3) team = TEAMS.RED;
                      }
                  }
                  
                  this.buildings.push({ x, y, team, type });
              }
          }
      }
  }

  getBuildingAt(x, y) {
      return this.buildings.find(b => b.x === x && b.y === y);
  }

  addUnit(unit) {
    this.units.push(unit);
  }

  getUnitAt(x, y) {
    return this.units.find(u => u.x === x && u.y === y && u.hp > 0);
  }

  async selectTile(x, y, actingTeam = null) {
    const unit = this.getUnitAt(x, y);
    const effectiveActingTeam = actingTeam || this.currentTurn;

    // Case 0: Attack an enemy
    const attackTarget = this.attackableTiles.find(t => t.x === x && t.y === y);
    if (this.selectedUnit && attackTarget && this.selectedUnit.team === effectiveActingTeam) {
        if (attackTarget.targetUnit) {
            const damage = await this.attackUnit(this.selectedUnit, attackTarget.targetUnit);
            this.deselect();
            return { action: 'attack', damage };
        } else {
            return { action: 'invalid_target' };
        }
    }

    // Case 0.5: Click on self when moved -> Show Menu (Keep selection)
    if (this.selectedUnit && this.selectedUnit === unit && this.selectedUnit.state === 'moved') {
        return { action: 'select', unit };
    }

    // If a unit is in 'moved' state, it is locked until it attacks or waits.
    // If we click anywhere else (not attack target, not self), we CANCEL the move.
    if (this.selectedUnit && this.selectedUnit.state === 'moved') {
        this.cancelMove();
        return { action: 'cancel_move' };
    }

    // Case 1: Select a unit (Friendly or Enemy)
    if (unit) {
      // If we have a mustMove unit selected, and we are clicking something else (or the unit underneath),
      // we must cancel the recruit.
      if (this.selectedUnit && this.selectedUnit.mustMove && this.selectedUnit !== unit) {
          this.cancelRecruit(this.selectedUnit);
          this.selectedUnit = null;
          // Continue to select 'unit'
      }

      // If clicking on the ALREADY selected unit, and it is ready, treat as move to self (skip selection logic to fall through to Case 2)
      if (this.selectedUnit === unit && unit.state === 'ready') {
          // Fall through to Case 2
      } else {
          this.selectedUnit = unit;
          
          // Special Case: King on Castle
          // If the unit is a King (Commander) AND is on a Castle of their own team
          const building = this.getBuildingAt(unit.x, unit.y);
          const isKingOnCastle = unit.type === UNIT_TYPES.KING && building && building.type === 'castle' && building.team === unit.team;

          // Calculate ranges
          // If it's a friendly unit:
          // - If King on Castle: Do NOT show move range (wait for menu with Buy option)
          // - Otherwise: Show move range immediately (Standard behavior)
          // If it's an enemy unit, always show move range (to see threat).
          
          if (unit.team === this.currentTurn) {
              if (isKingOnCastle) {
                  this.reachableTiles = [];
                  this.threatTiles = [];
              } else {
                  this.reachableTiles = this.calculateReachableTiles(unit);
                  this.threatTiles = this.calculateThreatTiles(unit);
              }
          } else {
              // Enemy
              this.reachableTiles = this.calculateReachableTiles(unit);
              this.threatTiles = this.calculateThreatTiles(unit);
          }

          this.attackableTiles = this.calculateAttackableTiles(unit);
          return { action: 'select', unit, isKingOnCastle };
      }
    }

    // Case 2: Move selected unit
    if (this.selectedUnit && this.selectedUnit.state === 'ready' && this.isReachable(x, y) && this.selectedUnit.team === effectiveActingTeam) {
      // Check if tile is occupied
      const occupant = this.getUnitAt(x, y);
      if (occupant && occupant !== this.selectedUnit) return null; // Cannot move to occupied tile (unless self)

      this.moveUnit(this.selectedUnit, x, y);
      
      // Post-move state: Clear movement, recalc attack
      this.reachableTiles = [];
      this.threatTiles = [];
      this.attackableTiles = this.calculateAttackableTiles(this.selectedUnit);
      
      return { action: 'move' };
    }

    // Case 2.5: Select a building (Castle) to buy units
    const building = this.getBuildingAt(x, y);
    if (!unit && building && building.team === effectiveActingTeam && building.type === 'castle') {
        this.selectedBuilding = building;
        return { action: 'select_building', building };
    }

    // Case 3: Deselect
    this.deselect();
    return { action: 'deselect' };
  }

  cancelRecruit(unit) {
      if (unit && unit.mustMove) {
          const stats = UNIT_STATS[unit.type];
          if (stats) {
              this.money[unit.team] += stats.cost;
          }
          const idx = this.units.indexOf(unit);
          if (idx !== -1) {
              this.units.splice(idx, 1);
          }
          return true;
      }
      return false;
  }

  deselect() {
      // If the selected unit was just spawned on top of the King (mustMove), refund and remove it.
      this.cancelRecruit(this.selectedUnit);

      this.selectedUnit = null;
      this.selectedBuilding = null;
      this.reachableTiles = [];
      this.threatTiles = [];
      this.attackableTiles = [];
      this.skillTargets = []; // [{x, y, type}]
      this.undoState = null;
  }

  showMoveRange(unit) {
      if (!unit) return;
      this.reachableTiles = this.calculateReachableTiles(unit);
      this.threatTiles = this.calculateThreatTiles(unit);
      this.attackableTiles = []; // Clear attack tiles when showing move
  }

  showAttackRange(unit) {
      if (!unit) return;
      this.reachableTiles = []; // Clear move tiles
      this.threatTiles = [];
      this.attackableTiles = this.calculateAttackableTiles(unit, true);
  }

  cancelMove() {
      if (this.undoState && this.undoState.unit.state === 'moved') {
          const unit = this.undoState.unit;
          
          // Verify if this is the unit we want to cancel (if selectedUnit is set)
          if (this.selectedUnit && this.selectedUnit !== unit) return false;

          unit.x = this.undoState.x;
          unit.y = this.undoState.y;
          unit.hp = this.undoState.hp; // Revert HP (tombstone check)
          unit.state = 'ready';
          unit.hasMoved = false;
          
          // Restore mustMove if it was present
          if (this.undoState.mustMove) {
              unit.mustMove = true;
          }
          
          this.undoState = null;
          
          // Back to ready state.
          if (this.selectedUnit) {
              if (unit.mustMove) {
                  // If it must move, show move range immediately
                  this.showMoveRange(unit);
              } else {
                  // Do NOT show ranges yet (wait for menu).
                  this.reachableTiles = [];
                  this.threatTiles = [];
                  this.attackableTiles = this.calculateAttackableTiles(unit);
              }
          }
          
          return true;
      }
      return false;
  }

  moveUnit(unit, x, y) {
    // Save state for undo
    this.undoState = {
        unit: unit,
        x: unit.x,
        y: unit.y,
        hp: unit.hp,
        mustMove: unit.mustMove // Save mustMove flag
    };

    const oldX = unit.x;
    const oldY = unit.y;
    
    unit.x = x;
    unit.y = y;
    unit.state = 'moved'; 
    unit.hasMoved = true;
    
    // Clear mustMove flag if it exists (for units spawned on King)
    if (unit.mustMove) {
        delete unit.mustMove;
    }

    // Check Tombstone
    const tombstoneIndex = this.tombstones.findIndex(t => t.x === x && t.y === y);
    if (tombstoneIndex !== -1) {
        const tombstone = this.tombstones[tombstoneIndex];
        // Undead: Heal 10
        if (unit.abilities.includes(ABILITIES.UNDEAD)) {
            if (unit.hp < unit.maxHp) {
                unit.hp = Math.min(unit.maxHp, unit.hp + 10);
                this.addFloatingText(x, y, "+10", "green");
            }
        } else {
            // Non-Undead: Damage 10
            unit.hp = Math.max(1, unit.hp - 10); 
            this.addFloatingText(x, y, "-10", "purple");
        }
        // Remove tombstone for everyone
        this.tombstones.splice(tombstoneIndex, 1);
    }
    
    if (this.onEvent) {
        this.onEvent('move', { unit, fromX: oldX, fromY: oldY, toX: x, toY: y });
    }
  }

  waitUnit(x, y) {
      const unit = this.getUnitAt(x, y);
      if (unit) {
          unit.state = 'done';
          if (unit.hp > unit.maxHp) unit.hp = unit.maxHp;
          this.checkCapture(unit);
          this.applyEndTurnAbilities(unit);
          this.deselect();
      }
  }

  hasAnyStatus(unit) {
      return unit.status.poison > 0 || 
             unit.status.blind > 0 || 
             unit.status.weak > 0 || 
             unit.status.attack_boost > 0 || 
             unit.status.defense_boost > 0 ||
             (unit.status.move_down && unit.status.move_down > 0);
  }

  applyEndTurnAbilities(unit) {
      // Purification Aura (12)
      if (unit.abilities.includes(ABILITIES.PURIFICATION_AURA)) {
          this.applyAura(unit, 2, (target) => {
              if (target.team === unit.team) {
                  // Heal +10 (+5 per level)
                  const heal = 10 + (unit.level * 5);
                  if (target.hp < target.maxHp) {
                      target.hp = Math.min(target.maxHp, target.hp + heal);
                      this.addFloatingText(target.x, target.y, `+${heal}`, 'green');
                  }
                  // Remove debuffs
                  target.status.poison = 0;
                  target.status.blind = 0;
                  target.status.weak = 0;
              } else {
                  // Damage Undead
                  if (target.abilities.includes(ABILITIES.UNDEAD)) {
                      const dmg = 10 + (unit.level * 5);
                      target.hp -= dmg;
                      this.addFloatingText(target.x, target.y, `-${dmg}`, 'gold');
                      if (target.hp <= 0) this.handleUnitDeath(target);
                  }
              }
          });
      }

      // Weakness Aura (16)
      if (unit.abilities.includes(ABILITIES.WEAKNESS_AURA)) {
          this.applyAura(unit, 2, (target) => {
              if (target.team !== unit.team && !target.abilities.includes(ABILITIES.WEAKNESS_AURA)) {
                  if (!this.hasAnyStatus(target)) {
                      target.status.weak = 1; // Lasts 1 turn
                      this.addFloatingText(target.x, target.y, "WEAK", 'gray');
                  }
              }
          });
      }

      // Attack Aura (25)
      if (unit.abilities.includes(ABILITIES.ATTACK_AURA)) {
          this.applyAura(unit, 2, (target) => {
              if (target.team === unit.team) {
                  if (!this.hasAnyStatus(target)) {
                      target.status.attack_boost = 1;
                      // this.addFloatingText(target.x, target.y, "ATK UP", 'orange');
                  }
              }
          });
      }
  }

  applyAura(sourceUnit, range, effectFn) {
      this.units.forEach(target => {
          if (target.hp > 0) {
              const dist = Math.abs(target.x - sourceUnit.x) + Math.abs(target.y - sourceUnit.y);
              if (dist <= range) {
                  effectFn(target);
              }
          }
      });
  }

  checkCapture(unit) {
      const building = this.getBuildingAt(unit.x, unit.y);
      if (building && building.team !== unit.team) {
          // Check abilities
          // Villages cannot be captured. Only Towns and Castles.
          if (building.type === 'village') return;

          // Check if unit can capture (Castle or Town)
          let canCapture = false;
          if (building.type === 'castle') {
              canCapture = unit.abilities.includes(ABILITIES.CASTLE_CAPTURER);
          } else {
              // Town
              canCapture = unit.abilities.includes(ABILITIES.CASTLE_CAPTURER) || 
                           unit.abilities.includes(ABILITIES.VILLAGE_CAPTURER);
          }

          if (!canCapture) return;

          if (building.type === 'castle' || building.type === 'town' || building.type === 136) { // 136 is TOWN
              building.team = unit.team;
              this.addFloatingText(unit.x, unit.y, "CAPTURED!", 'gold', 0.5); // Short life (0.5s)
          }
      }
  }

  buyUnit(type, x, y) {
      let cost = UNIT_STATS[type].cost;
      
      // Commander cost scaling
      if (type === UNIT_TYPES.KING) { // Assuming King is Commander
          // Check if commander already exists
          const existingCommander = this.units.find(u => u.team === this.currentTurn && u.type === UNIT_TYPES.KING && u.hp > 0);
          if (existingCommander) return false; // Only one commander

          cost = 400 + (this.commanderDeaths[this.currentTurn] * 100);
      }

      // Check if castle is occupied by enemy (actually, any unit blocks spawn usually, but rule says "non-friendly unit")
      // But standard logic is: cannot spawn on occupied tile.
      if (this.getUnitAt(x, y)) return false;

      if (this.money[this.currentTurn] >= cost) {
          this.money[this.currentTurn] -= cost;
          const newUnit = new Unit(type, this.currentTurn, x, y);
          newUnit.state = 'ready'; // Can move immediately
          this.addUnit(newUnit);
          
          if (this.onEvent) {
              this.onEvent('buy', { unit: newUnit });
          }

          this.deselect();
          return true;
      }
      return false;
  }

  isAlly(team1, team2) {
      if (team1 === team2) return true;
      if (this.alliances[team1] && this.alliances[team2]) {
          return this.alliances[team1] === this.alliances[team2];
      }
      return false;
  }

  getEnemyAroundCount(unit, range) {
      let count = 0;
      this.units.forEach(u => {
          if (u.hp > 0 && !this.isAlly(u.team, unit.team)) {
              const dist = Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y);
              if (dist <= range) count++;
          }
      });
      return count;
  }

  getTileDefenceBonus(unit, x, y) {
      let bonus = 0;
      const terrain = this.grid.getTerrainAt(x, y);
      
      if (!unit.abilities.includes(ABILITIES.AIR_UNIT)) {
          bonus += (TERRAIN_STATS[terrain] ? TERRAIN_STATS[terrain].defense : 0);
      }

      if (unit.abilities.includes(ABILITIES.GUARDIAN)) {
          const building = this.getBuildingAt(x, y);
          if (building && building.team === unit.team) {
              bonus += 5;
          }
      }

      if (unit.abilities.includes(ABILITIES.FOREST_CHILD) && terrain === TERRAIN.FOREST) bonus += 10;
      if (unit.abilities.includes(ABILITIES.MOUNTAIN_CHILD) && terrain === TERRAIN.MOUNTAIN) bonus += 10;
      if (unit.abilities.includes(ABILITIES.WATER_CHILD) && terrain === TERRAIN.WATER) bonus += 10;
      
      return bonus;
  }

  getPhysicalDefenceBonus(attacker, defender, x, y) {
      let bonus = this.getTileDefenceBonus(defender, x, y);
      if (defender.abilities.includes(ABILITIES.BATTLE_WILL)) {
          bonus += 5 * this.getEnemyAroundCount(defender, 2);
      }
      if (defender.status.defense_boost > 0) bonus += 10;
      if (defender.status.weak > 0) bonus -= 5;
      return bonus;
  }

  getMagicDefenceBonus(attacker, defender, x, y) {
      let bonus = this.getTileDefenceBonus(defender, x, y);
      if (defender.status.defense_boost > 0) bonus += 10;
      if (defender.status.weak > 0) bonus -= 5;
      return bonus;
  }

  getAttackBonus(attacker, defender, x, y) {
      let bonus = 0;
      const terrain = this.grid.getTerrainAt(x, y);

      if (attacker.abilities.includes(ABILITIES.MOUNTAIN_CHILD) && terrain === TERRAIN.MOUNTAIN) bonus += 10;
      if (attacker.abilities.includes(ABILITIES.FOREST_CHILD) && terrain === TERRAIN.FOREST) bonus += 10;
      if (attacker.abilities.includes(ABILITIES.WATER_CHILD) && terrain === TERRAIN.WATER) bonus += 10;

      if (attacker.abilities.includes(ABILITIES.MARKSMAN) && defender.abilities.includes(ABILITIES.AIR_UNIT)) {
          bonus += 15;
      }

      if (attacker.abilities.includes(ABILITIES.BATTLE_WILL)) {
          bonus += 10 * this.getEnemyAroundCount(attacker, 2);
      }

      if (attacker.status.attack_boost > 0) bonus += 10;

      return bonus;
  }

  calculateBaseDamage(attacker, defender) {
      const x = attacker.x;
      const y = attacker.y;
      const dx = defender.x;
      const dy = defender.y;
      const dist = Math.abs(x - dx) + Math.abs(y - dy);

      let attack = attacker.attack + this.getAttackBonus(attacker, defender, x, y);
      let defense = 0;
      
      if (attacker.attackType === ATTACK_TYPES.PHYSICAL) {
          defense = defender.physDef + this.getPhysicalDefenceBonus(attacker, defender, dx, dy);
      } else {
          defense = defender.magDef + this.getMagicDefenceBonus(attacker, defender, dx, dy);
      }

      let damage = attack - defense;
      
      damage = damage * (attacker.hp / attacker.maxHp);

      if (attacker.abilities.includes(ABILITIES.DEATH_REAPER) && dist === 1) {
          if (!defender.abilities.includes(ABILITIES.DEATH_REAPER)) {
              damage *= 1.5;
          }
      }

      if (defender.abilities.includes(ABILITIES.HARD_SKIN) && dist > 1) {
          damage *= 0.5;
      }
      
      return damage;
  }

  calculateDamage(attacker, defender) {
      let damage = this.calculateBaseDamage(attacker, defender);
      // Removed RNG as per user request to match their memory of the original game
      // damage += (Math.floor(Math.random() * 5) - 2);
      return Math.max(0, Math.floor(damage));
  }

  getDamagePreview(attacker, defender) {
      let damage = this.calculateBaseDamage(attacker, defender);
      damage = Math.max(0, Math.floor(damage));
      return {
          min: damage,
          max: damage
      };
  }

  async attackUnit(attacker, defender, damageOverride = null) {
      let damage = damageOverride !== null ? damageOverride : this.calculateDamage(attacker, defender);
      
      defender.hp -= damage;
      
      // Apply Status Effects
      if (attacker.abilities.includes(ABILITIES.POISONER) && !defender.abilities.includes(ABILITIES.POISONER)) {
          if (!this.hasAnyStatus(defender)) {
              defender.status.poison = 2; // 2 turns
              // this.addFloatingText(defender.x, defender.y, "POISON", "purple");
          }
      }
      if (attacker.abilities.includes(ABILITIES.BLINDER) && !defender.abilities.includes(ABILITIES.BLINDER)) {
          if (!this.hasAnyStatus(defender)) {
              defender.status.blind = 1; // 1 turn
              // this.addFloatingText(defender.x, defender.y, "BLIND", "gray");
          }
      }

      // XP Gain
      attacker.gainXp(30);
      if (defender.hp <= 0) {
          this.handleUnitDeath(defender, attacker);
      }
      
      if (this.onEvent) {
          this.onEvent('attack', { attacker, defender, damage });
      }

      this.addFloatingText(defender.x, defender.y, `-${damage}`, 'red');
      
      // Counter Attack Logic
      if (defender.hp > 0 && !this.isAlly(defender.team, attacker.team) && defender.status.blind === 0) {
          const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
          
          let canCounter = false;
          const minRange = Array.isArray(defender.attackRange) ? defender.attackRange[0] : 1;
          const maxRange = Array.isArray(defender.attackRange) ? defender.attackRange[1] : defender.attackRange;
          
          if (dist >= minRange && dist <= maxRange) canCounter = true;
          if (defender.abilities.includes(ABILITIES.COUNTER_STORM) && dist <= 2) canCounter = true;

          if (canCounter) {
              await new Promise(resolve => setTimeout(resolve, 600));
              this.performCounterAttack(defender, attacker);
          }
      }

      if (defender.hp <= 0) {
          defender.hp = 0;
          // this.addFloatingText(defender.x, defender.y, "DEAD", 'black');
      }

      attacker.state = 'done';
      if (attacker.hp > attacker.maxHp) attacker.hp = attacker.maxHp;
      this.checkCapture(attacker);
      this.checkWinCondition();

      return damage;
  }

  handleUnitDeath(unit, killer = null) {
      unit.hp = 0;
      if (this.onEvent) this.onEvent('die', { unit });

      if (killer) {
          killer.gainXp(60);
          if (unit.type === UNIT_TYPES.KING) {
              this.commanderDeaths[unit.team]++;
          }
      }
      
      // Tombstone Logic
      if (!unit.abilities.includes(ABILITIES.UNDEAD)) {
          this.tombstones.push({ x: unit.x, y: unit.y, team: unit.team, life: 2 }); // Lasts 2 turns
      }

      // Campaign Hook: onUnitDestroyed
      if (this.stageScript && this.stageScript.onUnitDestroyed) {
          this.stageScript.onUnitDestroyed(this.campaignContext, unit);
      }

      this.checkWinCondition();
  }

  performCounterAttack(attacker, defender) {
      const damage = this.calculateDamage(attacker, defender);
      
      defender.hp -= damage;
      this.addFloatingText(defender.x, defender.y, `-${damage}`, 'red');
      
      attacker.gainXp(10); // Counter XP

      // Apply Status Effects on Counter
      if (attacker.abilities.includes(ABILITIES.POISONER) && !defender.abilities.includes(ABILITIES.POISONER)) {
          if (!this.hasAnyStatus(defender)) {
              defender.status.poison = 2;
              // this.addFloatingText(defender.x, defender.y, "POISON", "purple");
          }
      }
      if (attacker.abilities.includes(ABILITIES.BLINDER) && !defender.abilities.includes(ABILITIES.BLINDER)) {
          if (!this.hasAnyStatus(defender)) {
              defender.status.blind = 1;
              // this.addFloatingText(defender.x, defender.y, "BLIND", "gray");
          }
      }

      if (defender.hp <= 0) {
          this.handleUnitDeath(defender, attacker);
          // this.addFloatingText(defender.x, defender.y, "DEAD", 'black');
      }
      
      if (this.onEvent) {
          this.onEvent('attack', { attacker, defender, damage, isCounter: true });
      }
  }

  checkWinCondition() {
      const blueAlive = this.units.some(u => u.team === TEAMS.BLUE && u.hp > 0);
      const redAlive = this.units.some(u => u.team === TEAMS.RED && u.hp > 0);

      if (this.winCondition === 'commander_death') {
          const blueKing = this.units.find(u => u.team === TEAMS.BLUE && u.type === UNIT_TYPES.KING && u.hp > 0);
          const redKing = this.units.find(u => u.team === TEAMS.RED && u.type === UNIT_TYPES.KING && u.hp > 0);

          if (!blueKing) {
              this.winner = TEAMS.RED;
              return;
          } else if (!redKing) {
              this.winner = TEAMS.BLUE;
              return;
          }
      }

      // Annihilation check (applies to both modes as a fallback or primary condition)
      if (!blueAlive) this.winner = TEAMS.RED;
      else if (!redAlive) this.winner = TEAMS.BLUE;
  }

  addFloatingText(x, y, text, color, durationSeconds = 1.0) {
      // Assume 60fps update loop
      const life = Math.floor(durationSeconds * 60);
      this.floatingTexts.push({
          x, y, text, color, life: life, offsetY: 0
      });
  }

  updateEffects() {
      // Update floating texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          const ft = this.floatingTexts[i];
          ft.life--;
          ft.offsetY -= 0.5; // Float up
          if (ft.life <= 0) {
              this.floatingTexts.splice(i, 1);
          }
      }
  }

  isReachable(x, y) {
    return this.reachableTiles.some(t => t.x === x && t.y === y);
  }

  calculateAttackableTiles(unit, includeEmpty = false) {
      if (unit.status.blind > 0) return [];

      const targets = [];
      const minRange = Array.isArray(unit.attackRange) ? unit.attackRange[0] : 1;
      const maxRange = Array.isArray(unit.attackRange) ? unit.attackRange[1] : unit.attackRange;

      if (includeEmpty) {
          // Iterate grid area around unit
          for (let dy = -maxRange; dy <= maxRange; dy++) {
              for (let dx = -maxRange; dx <= maxRange; dx++) {
                  const dist = Math.abs(dx) + Math.abs(dy);
                  if (dist >= minRange && dist <= maxRange) {
                      const tx = unit.x + dx;
                      const ty = unit.y + dy;
                      if (tx >= 0 && tx < this.grid.width && ty >= 0 && ty < this.grid.height) {
                          const targetUnit = this.getUnitAt(tx, ty);
                          if (targetUnit && !this.isAlly(targetUnit.team, unit.team) && targetUnit.hp > 0) {
                              targets.push({ x: tx, y: ty, targetUnit });
                          } else {
                              targets.push({ x: tx, y: ty, targetUnit: null });
                          }
                      }
                  }
              }
          }
      } else {
          // Iterate all units to find enemies in range
          this.units.forEach(target => {
              if (!this.isAlly(target.team, unit.team) && target.hp > 0) {
                  const dist = Math.abs(target.x - unit.x) + Math.abs(target.y - unit.y); // Manhattan distance
                  if (dist >= minRange && dist <= maxRange) {
                      targets.push({ x: target.x, y: target.y, targetUnit: target });
                  }
              }
          });
      }
      return targets;
  }

  getMovementCost(unit, x, y) {
    const terrain = this.grid.getTerrainAt(x, y);
    const stats = TERRAIN_STATS[terrain];
    if (!stats) return 99;

    let cost = stats.cost;
    const type = stats.type; // 0: Land, 1: Water, 2: Forest, 3: Mountain

    // Abilities
    if (unit.abilities.includes(ABILITIES.AIR_UNIT)) return 1;
    
    if (unit.abilities.includes(ABILITIES.EARTH_CHILD) && (type === 0 || type === 2 || type === 3)) return 1;
    
    if (unit.abilities.includes(ABILITIES.WATER_CHILD) && type === 1) return 1;
    
    if (unit.abilities.includes(ABILITIES.FOREST_CHILD) && type === 2) return 1;
    
    if (unit.abilities.includes(ABILITIES.MOUNTAIN_CHILD) && type === 3) return 1;

    return cost;
  }

  calculateReachableTiles(unit) {
    const startNode = { x: unit.x, y: unit.y, cost: 0 };
    const queue = [startNode];
    const visited = new Map();
    // Include current position as reachable (cost 0), unless unit MUST move (e.g. spawned on King)
    const reachable = unit.mustMove ? [] : [{ x: unit.x, y: unit.y }];

    visited.set(`${unit.x},${unit.y}`, 0);

    while (queue.length > 0) {
      const current = queue.shift();

      // Directions: Up, Down, Left, Right
      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y }
      ];

      for (const n of neighbors) {
        // Check bounds
        if (n.x < 0 || n.x >= this.grid.width || n.y < 0 || n.y >= this.grid.height) continue;

        const moveCost = this.getMovementCost(unit, n.x, n.y);
        
        // Check units
        const occupant = this.getUnitAt(n.x, n.y);
        let canPass = true;
        
        if (occupant && !this.isAlly(occupant.team, unit.team)) {
             // Enemy unit
             if (!unit.abilities.includes(ABILITIES.AIR_UNIT)) {
                 canPass = false;
             }
        }

        if (!canPass) continue;

        const newCost = current.cost + moveCost;

        if (newCost <= unit.moveRange) {
          const key = `${n.x},${n.y}`;
          if (!visited.has(key) || visited.get(key) > newCost) {
            visited.set(key, newCost);
            queue.push({ x: n.x, y: n.y, cost: newCost });
            reachable.push({ x: n.x, y: n.y });
          }
        }
      }
    }
    return reachable;
  }

  calculateThreatTiles(unit) {
      const reachable = this.calculateReachableTiles(unit);
      // Include current position as reachable for attack calculation (can attack without moving)
      reachable.push({ x: unit.x, y: unit.y });

      const threatTiles = new Set();
      const minRange = Array.isArray(unit.attackRange) ? unit.attackRange[0] : 1;
      const maxRange = Array.isArray(unit.attackRange) ? unit.attackRange[1] : unit.attackRange;

      reachable.forEach(pos => {
          // For each reachable tile, find tiles within attack range
          // Optimization: Iterate bounding box around pos
          for (let dy = -maxRange; dy <= maxRange; dy++) {
              for (let dx = -maxRange; dx <= maxRange; dx++) {
                  const dist = Math.abs(dx) + Math.abs(dy);
                  if (dist >= minRange && dist <= maxRange) {
                      const tx = pos.x + dx;
                      const ty = pos.y + dy;
                      
                      // Check bounds
                      if (tx >= 0 && tx < this.grid.width && ty >= 0 && ty < this.grid.height) {
                          threatTiles.add(`${tx},${ty}`);
                      }
                  }
              }
          }
      });

      // Convert back to array of objects
      return Array.from(threatTiles).map(key => {
          const [x, y] = key.split(',').map(Number);
          return { x, y };
      });
  }
  
  getAvailableActions(unit) {
      const actions = [];
      if (unit.state === 'done') return actions;

      // HEALER (Mermaid, Druid, Paladin)
      if (unit.abilities.includes(ABILITIES.HEALER)) {
          const neighbors = this.getNeighbors(unit.x, unit.y);
          // Include self
          neighbors.push({ x: unit.x, y: unit.y });
          
          const hasTarget = neighbors.some(n => {
              const u = this.getUnitAt(n.x, n.y);
              // Heal allies OR enemy Undead
              // Condition: Not healed this turn AND (Undead OR (Ally AND HP <= MaxHP))
              if (!u || u.healedThisTurn) return false;
              
              if (u.abilities.includes(ABILITIES.UNDEAD)) return true; // Can always target Undead (damage)
              
              return u.team === unit.team && u.hp <= u.maxHp; // Ally not overhealed
          });
          if (hasTarget) actions.push('heal');
      }

      // REPAIRER (King)
      if (unit.abilities.includes(ABILITIES.REPAIRER)) {
          const neighbors = this.getNeighbors(unit.x, unit.y);
          const hasTarget = neighbors.some(n => {
              const u = this.getUnitAt(n.x, n.y);
              // Repair mechanical allies (Catapult, Stone Golem)
              return u && u.team === unit.team && 
                     (u.type === UNIT_TYPES.CATAPULT || u.type === UNIT_TYPES.STONE_GOLEM);
          });
          if (hasTarget) actions.push('repair');
      }

      // RAISE DEAD (Necromancer - not assigned yet, but logic ready)
      if (unit.abilities.includes(ABILITIES.RAISE_DEAD)) {
          const neighbors = this.getNeighbors(unit.x, unit.y);
          const hasTombstone = neighbors.some(n => {
              return this.tombstones.some(t => t.x === n.x && t.y === n.y);
          });
          if (hasTombstone) actions.push('raise_dead');
      }
      
      // SUMMONER (Dark Mage, Sorceress) - Summon Skeleton
      if (unit.abilities.includes(ABILITIES.SUMMONER)) {
           const skeletonCost = UNIT_STATS[UNIT_TYPES.SKELETON].cost;
           if (this.money[unit.team] >= skeletonCost) {
               // Check for tombstones in 2 range
               let hasTarget = false;
               for (let dy = -2; dy <= 2; dy++) {
                   for (let dx = -2; dx <= 2; dx++) {
                       if (Math.abs(dx) + Math.abs(dy) <= 2) {
                           const tx = unit.x + dx;
                           const ty = unit.y + dy;
                           if (tx >= 0 && tx < this.grid.width && ty >= 0 && ty < this.grid.height) {
                               const hasTombstone = this.tombstones.some(t => t.x === tx && t.y === ty);
                               const u = this.getUnitAt(tx, ty);
                               if (hasTombstone && !u) {
                                   hasTarget = true;
                                   break;
                               }
                           }
                       }
                   }
                   if (hasTarget) break;
               }
               if (hasTarget) actions.push('summon');
           }
      }

      // SUPPORTER (Druid)
      if (unit.abilities.includes(ABILITIES.SUPPORTER)) {
          // Check for valid targets in 2 range
          let hasTarget = false;
          for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                  if (Math.abs(dx) + Math.abs(dy) <= 2) {
                      const tx = unit.x + dx;
                      const ty = unit.y + dy;
                      if (tx >= 0 && tx < this.grid.width && ty >= 0 && ty < this.grid.height) {
                          const u = this.getUnitAt(tx, ty);
                          if (u && u.team === unit.team && u.state === 'done' && !u.supportedThisTurn) {
                              // Check restrictions
                              if (u.abilities.includes(ABILITIES.ASSAULT_TROOP)) continue;
                              if (u.abilities.includes(ABILITIES.CASTLE_CAPTURER)) continue;
                              if (u.abilities.includes(ABILITIES.SUPPORTER)) continue;
                              if (u.level > unit.level) continue;
                              
                              hasTarget = true;
                              break;
                          }
                      }
                  }
              }
              if (hasTarget) break;
          }
          if (hasTarget) actions.push('support');
      }

      // COMMANDER ON CASTLE (Buy/Recruit)
      if (unit.type === UNIT_TYPES.KING) {
          const building = this.getBuildingAt(unit.x, unit.y);
          if (building && building.type === 'castle' && building.team === unit.team) {
              actions.push('buy');
          }
      }

      return actions;
  }

  waitUnit(x, y) {
      const unit = this.getUnitAt(x, y);
      if (unit) {
          unit.state = 'done';
          this.applyEndTurnAbilities(unit);
          this.deselect();
          
          // Campaign Hook: onUnitStandby
          if (this.stageScript && this.stageScript.onUnitStandby) {
              this.stageScript.onUnitStandby(this.campaignContext, unit);
          }
      }
  }

  calculateSkillTargets(unit, action) {
      const targets = [];
      const neighbors = this.getNeighbors(unit.x, unit.y);

      if (action === 'heal') {
          // Include self
          neighbors.push({ x: unit.x, y: unit.y });
          
          neighbors.forEach(n => {
              const u = this.getUnitAt(n.x, n.y);
              if (u && !u.healedThisTurn) {
                  if (u.abilities.includes(ABILITIES.UNDEAD)) {
                      targets.push({ x: n.x, y: n.y, type: 'heal' });
                  } else if (u.team === unit.team && u.hp <= u.maxHp) {
                      targets.push({ x: n.x, y: n.y, type: 'heal' });
                  }
              }
          });
      } else if (action === 'repair') {
          neighbors.forEach(n => {
              const u = this.getUnitAt(n.x, n.y);
              if (u && u.team === unit.team && 
                  (u.type === UNIT_TYPES.CATAPULT || u.type === UNIT_TYPES.STONE_GOLEM)) {
                  targets.push({ x: n.x, y: n.y, type: 'repair' });
              }
          });
      } else if (action === 'raise_dead') {
          neighbors.forEach(n => {
              const hasTombstone = this.tombstones.some(t => t.x === n.x && t.y === n.y);
              if (hasTombstone) {
                  targets.push({ x: n.x, y: n.y, type: 'raise_dead' });
              }
          });
      } else if (action === 'summon') {
          for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                  if (Math.abs(dx) + Math.abs(dy) <= 2) {
                      const tx = unit.x + dx;
                      const ty = unit.y + dy;
                      if (tx >= 0 && tx < this.grid.width && ty >= 0 && ty < this.grid.height) {
                           const hasTombstone = this.tombstones.some(t => t.x === tx && t.y === ty);
                           const u = this.getUnitAt(tx, ty);
                           if (hasTombstone && !u) {
                               targets.push({ x: tx, y: ty, type: 'summon' });
                           }
                      }
                  }
              }
          }
      } else if (action === 'support') {
          // 2-tile range for support
          for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                  if (Math.abs(dx) + Math.abs(dy) <= 2) {
                      const tx = unit.x + dx;
                      const ty = unit.y + dy;
                      if (tx >= 0 && tx < this.grid.width && ty >= 0 && ty < this.grid.height) {
                          const u = this.getUnitAt(tx, ty);
                          if (u && u.team === unit.team && u.state === 'done' && !u.supportedThisTurn) {
                              // Check restrictions
                              if (u.abilities.includes(ABILITIES.ASSAULT_TROOP)) continue;
                              if (u.abilities.includes(ABILITIES.CASTLE_CAPTURER)) continue;
                              if (u.abilities.includes(ABILITIES.SUPPORTER)) continue;
                              if (u.level > unit.level) continue;

                              targets.push({ x: tx, y: ty, type: 'support' });
                          }
                      }
                  }
              }
          }
      }
      return targets;
  }

  performAction(action, unit, targetX, targetY) {
      if (this.onEvent) this.onEvent('skill', { skillName: action, unit, targetX, targetY });

      if (action === 'heal') {
          const target = this.getUnitAt(targetX, targetY);
          if (target) {
              const baseHeal = 40 + (unit.level * 10);
              
              if (target.abilities.includes(ABILITIES.UNDEAD)) {
                  const damage = Math.floor(baseHeal * 1.5);
                  target.hp -= damage;
                  this.addFloatingText(target.x, target.y, `-${damage}`, "purple");
                  if (target.hp <= 0) {
                      this.handleUnitDeath(target, unit);
                  }
              } else {
                  target.hp += baseHeal;
                  this.addFloatingText(target.x, target.y, `+${baseHeal}`, "green");
              }
              target.healedThisTurn = true;
              unit.state = 'done';
              this.applyEndTurnAbilities(unit);
              unit.gainXp(10);
          }
      } else if (action === 'repair') {
          const target = this.getUnitAt(targetX, targetY);
          if (target) {
              target.hp += 20;
              this.addFloatingText(target.x, target.y, "+20", "green");
              unit.state = 'done';
              this.applyEndTurnAbilities(unit);
              unit.gainXp(10);
          }
      } else if (action === 'support') {
          const target = this.getUnitAt(targetX, targetY);
          if (target) {
              target.state = 'ready'; // Reset to ready
              target.hasMoved = false; // Allow movement again? Usually yes.
              target.hasAttacked = false;
              target.supportedThisTurn = true;
              // this.addFloatingText(target.x, target.y, "AGAIN!", "gold");
              // Effect handled by onEvent('skill')
              unit.state = 'done';
              this.applyEndTurnAbilities(unit);
              unit.gainXp(10);
          }
      } else if (action === 'raise_dead') {
          // Check Population Limit
          const currentPop = this.units.filter(u => u.team === unit.team)
              .reduce((sum, u) => sum + (UNIT_STATS[u.type].population || 1), 0);
          const skeletonPop = UNIT_STATS[UNIT_TYPES.SKELETON].population || 0;

          if (currentPop + skeletonPop > this.populationLimit) {
              this.addFloatingText(unit.x, unit.y, "MAX POP", "red");
              return;
          }

          const tIndex = this.tombstones.findIndex(t => t.x === targetX && t.y === targetY);
          if (tIndex !== -1) {
              this.tombstones.splice(tIndex, 1);
              const skeleton = new Unit(UNIT_TYPES.SKELETON, unit.team, targetX, targetY);
              this.addUnit(skeleton);
              unit.state = 'done';
              this.applyEndTurnAbilities(unit);
              unit.gainXp(20);
          }
      } else if (action === 'summon') {
          // Check Population Limit
          const currentPop = this.units.filter(u => u.team === unit.team)
              .reduce((sum, u) => sum + (UNIT_STATS[u.type].population || 1), 0);
          const skeletonPop = UNIT_STATS[UNIT_TYPES.SKELETON].population || 0;

          if (currentPop + skeletonPop > this.populationLimit) {
              this.addFloatingText(unit.x, unit.y, "MAX POP", "red");
              return;
          }

          const skeletonCost = UNIT_STATS[UNIT_TYPES.SKELETON].cost;
          if (this.money[unit.team] >= skeletonCost) {
              this.money[unit.team] -= skeletonCost;
              
              // Remove tombstone
              const tIndex = this.tombstones.findIndex(t => t.x === targetX && t.y === targetY);
              if (tIndex !== -1) this.tombstones.splice(tIndex, 1);

              const skeleton = new Unit(UNIT_TYPES.SKELETON, unit.team, targetX, targetY);
              // Set level equal to summoner
              for(let i=0; i<unit.level; i++) skeleton.levelUp();
              skeleton.hp = skeleton.maxHp; // Full HP

              this.addUnit(skeleton);
              unit.state = 'done';
              this.applyEndTurnAbilities(unit);
              unit.gainXp(10);
          }
      }

      if (unit.state === 'done' && unit.hp > unit.maxHp) {
          unit.hp = unit.maxHp;
      }
  }
  
  getNeighbors(x, y) {
      return [
          {x: x, y: y-1},
          {x: x, y: y+1},
          {x: x-1, y: y},
          {x: x+1, y: y}
      ].filter(n => n.x >= 0 && n.x < this.grid.width && n.y >= 0 && n.y < this.grid.height);
  }

  endTurn() {
      this.deselect();
      // Reset HP for the ending team
      this.units.forEach(u => {
          if (u.team === this.currentTurn && u.hp > u.maxHp) {
              u.hp = u.maxHp;
          }
      });
      
      // Reset healedThisTurn flag for all units at end of round (or start of next round)
      // Actually, "once per round" usually means once per full round cycle.
      // Let's reset it when the round loops back to BLUE, or just reset everyone every turn?
      // "每回合" usually means "Every Turn" (Player Phase) or "Every Round" (Both Players).
      // If it's "Once per Round", it should reset when Blue starts.
      // If it's "Once per Turn", it resets every turn.
      // Let's assume "Once per Round" (Full Cycle).
      if (this.currentTurn === TEAMS.RED) { // Ending RED turn -> Back to BLUE (Start of Round)
           this.units.forEach(u => u.healedThisTurn = false);
      }
      // Wait, if I heal on Blue turn, can Red heal the same unit on Red turn?
      // "Same unit can be used once per round".
      // If Blue heals Unit A, Unit A is "used". Red turn comes. Can Red heal Unit A?
      // If "Round" means Blue+Red, then no.
      // If "Round" means "Turn", then yes.
      // Let's stick to "Reset at start of Blue turn" for a full round cycle reset.
      
      this.currentTurn = this.currentTurn === TEAMS.BLUE ? TEAMS.RED : TEAMS.BLUE;
      
      // --- START OF TURN LOGIC FOR NEW PLAYER ---

      // Campaign Hook: onTurnStart
      if (this.stageScript && this.stageScript.onTurnStart) {
          this.stageScript.onTurnStart(this.campaignContext, this.currentTurn);
      }

      // 1. Tombstone Decay (Decay every round start, i.e., Blue turn)
      if (this.currentTurn === TEAMS.BLUE) {
          this.units.forEach(u => u.healedThisTurn = false); // Reset at start of Round 1 (Blue)

          for (let i = this.tombstones.length - 1; i >= 0; i--) {
              this.tombstones[i].life--;
              if (this.tombstones[i].life <= 0) {
                  this.tombstones.splice(i, 1);
              }
          }
      }

      // 2. Unit Updates (Status & Passive Healing)
      this.units.forEach(u => {
          // Reset state for ALL units to ensure visuals are correct (no gray units on enemy turn)
          // But only reset flags like hasMoved for the current turn team
          if (u.team === this.currentTurn) {
              u.resetTurn();
              
              // Status Effects Decay & Damage
              if (u.status.poison > 0) {
                  const poisonDamage = 10; 
                  u.hp -= poisonDamage;
                  this.addFloatingText(u.x, u.y, "POISON", "purple");
                  this.addFloatingText(u.x, u.y, `-${poisonDamage}`, "red");
                  u.status.poison--;
                  if (u.hp <= 0) {
                      this.handleUnitDeath(u); 
                  }
              }
              if (u.status.blind > 0) u.status.blind--;
              if (u.status.weak > 0) u.status.weak--;
              if (u.status.attack_boost > 0) u.status.attack_boost--;

              if (u.hp > 0) {
                  // Passive Healing
                  let healed = false;
                  const building = this.getBuildingAt(u.x, u.y);
                  
                  // Building Heal
                  if (building) {
                      const isVillage = building.type === 'village';
                      const isCastleOrTown = (building.type === 'castle' || building.type === 'town');
                      const isOwned = building.team === u.team;

                      if (isVillage || (isCastleOrTown && isOwned)) {
                          if (u.hp < 100) {
                              u.hp = Math.min(100, u.hp + 20);
                              // this.addFloatingText(u.x, u.y, "+20", "green");
                              healed = true;
                          }
                      }
                  } else {
                      // Terrain Heal (Temples)
                      const terrain = this.grid.getTerrainAt(u.x, u.y);
                      const isTemple = [TERRAIN.TEMPLE, TERRAIN.TEMPLE_WATER, TERRAIN.TEMPLE_HEAL].includes(terrain);
                      
                      if (isTemple) {
                          if (u.hp < 100) {
                              u.hp = Math.min(100, u.hp + 20);
                              // this.addFloatingText(u.x, u.y, "+20", "green");
                              healed = true;
                          }
                      }
                  }

                  // Self Repair (Golem)
                  if (!healed && u.abilities.includes(ABILITIES.SELF_REPAIR) && u.hp < 100) {
                       u.hp = Math.min(100, u.hp + 20);
                       // this.addFloatingText(u.x, u.y, "+20", "green");
                       healed = true;
                  }

                  // Water Child (Water Elemental on Water)
                  if (!healed && u.abilities.includes(ABILITIES.WATER_CHILD)) {
                      const terrain = this.grid.getTerrainAt(u.x, u.y);
                      if (terrain === TERRAIN.WATER && u.hp < u.maxHp) {
                           u.hp = Math.min(u.maxHp, u.hp + 10);
                           // this.addFloatingText(u.x, u.y, "+10", "green");
                           healed = true;
                      }
                  }

                  // Forest Child (Elf)
                  if (!healed && u.abilities.includes(ABILITIES.FOREST_CHILD)) {
                      const terrain = this.grid.getTerrainAt(u.x, u.y);
                      if (terrain === TERRAIN.FOREST && u.hp < 100) {
                           u.hp = Math.min(100, u.hp + 20);
                           // this.addFloatingText(u.x, u.y, "+20", "green");
                           healed = true;
                      }
                  }

                  // Mountain Child (Stone Golem)
                  if (!healed && u.abilities.includes(ABILITIES.MOUNTAIN_CHILD)) {
                      const terrain = this.grid.getTerrainAt(u.x, u.y);
                      if (terrain === TERRAIN.MOUNTAIN && u.hp < 100) {
                           u.hp = Math.min(100, u.hp + 20);
                           // this.addFloatingText(u.x, u.y, "+20", "green");
                           healed = true;
                      }
                  }

                  // Earth Child (Not assigned yet)
                  if (!healed && u.abilities.includes(ABILITIES.EARTH_CHILD)) {
                      const terrain = this.grid.getTerrainAt(u.x, u.y);
                      if (terrain === TERRAIN.PLAIN && u.hp < 100) {
                           u.hp = Math.min(100, u.hp + 20);
                           // this.addFloatingText(u.x, u.y, "+20", "green");
                           healed = true;
                      }
                  }
              }
          } else {
              // For other teams, just ensure they are visually ready (not gray)
              u.state = 'ready';
          }
      });

      // Calculate Income
      let income = 0; 
      this.buildings.forEach(b => {
          if (b.team === this.currentTurn) {
              if (b.type === 'castle') income += 100;
              // else if (b.type === 'village') income += 50;
          }
      });
      
      // Commander Income
      const commander = this.units.find(u => u.team === this.currentTurn && u.type === UNIT_TYPES.KING && u.hp > 0);
      if (commander) income += 25;

      this.money[this.currentTurn] += income;

      this.deselect();
  }

  buyUnit(type, x, y) {
      const stats = UNIT_STATS[type];
      if (!stats) return null;
      
      let cost = stats.cost;
      // Commander Cost Logic
      if (type === UNIT_TYPES.KING) {
          const deaths = this.commanderDeaths[this.currentTurn] || 0;
          cost = 400 + (deaths * 100);
      }

      if (this.money[this.currentTurn] < cost) return null;

      // Check Population Limit
      const currentPop = this.units.filter(u => u.team === this.currentTurn)
          .reduce((sum, u) => sum + (UNIT_STATS[u.type].population || 1), 0);
      
      const unitPop = stats.population !== undefined ? stats.population : 1;
      
      if (currentPop + unitPop > this.populationLimit) {
          console.log("Population limit reached");
          return null;
      }

      const occupant = this.getUnitAt(x, y);

      // Check if space is occupied
      if (occupant) {
          // If occupied by King, spawn ON TOP of King and force move
          if (occupant.type === UNIT_TYPES.KING && occupant.team === this.currentTurn) {
              // Pre-check: Can the new unit move anywhere?
              const tempUnit = new Unit(type, this.currentTurn, x, y);
              tempUnit.mustMove = true;
              const potentialMoves = this.calculateReachableTiles(tempUnit);
              // Must find at least one tile that is NOT occupied
              const hasValidMove = potentialMoves.some(p => !this.getUnitAt(p.x, p.y));
              
              if (!hasValidMove) {
                  // No valid moves available, cannot recruit
                  return null;
              }

              this.money[this.currentTurn] -= cost;
              const newUnit = new Unit(type, this.currentTurn, x, y);
              newUnit.state = 'ready';
              newUnit.mustMove = true; // Flag to force move
              this.addUnit(newUnit);
              
              // Auto-select the new unit
              this.selectedUnit = newUnit;
              this.selectedBuilding = null;
              this.showMoveRange(newUnit);
              
              return newUnit;
          }
          return null; // Occupied by other unit
      }

      this.money[this.currentTurn] -= cost;
      const newUnit = new Unit(type, this.currentTurn, x, y);
      newUnit.state = 'ready';
      this.addUnit(newUnit);
      
      // Auto-select normal spawn too (optional, but good UX)
      this.selectedUnit = newUnit;
      this.selectedBuilding = null;
      this.showMoveRange(newUnit);

      return newUnit;
  }
}
