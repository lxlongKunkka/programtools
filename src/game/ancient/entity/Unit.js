import { UNIT_STATS, XP_THRESHOLDS, UNIT_TYPES } from '../constants.js';

export class Unit {
  constructor(type, team, x, y) {
    this.type = type;
    this.team = team;
    this.x = x;
    this.y = y;
    this.hp = 100;
    this.maxHp = 100;
    this.state = 'ready'; // ready, moved, done
    this.variant = Math.floor(Math.random() * 4); // For visual variations (e.g. Commander heads)
    
    const stats = UNIT_STATS[type];
    if (!stats) {
        console.error(`Unknown unit type: ${type}`);
        // Fallback to Soldier stats to prevent crash
        const fallback = UNIT_STATS[UNIT_TYPES.SOLDIER];
        this.moveRange = fallback.move;
        this.attackRange = fallback.range;
        this.attack = fallback.attack;
        this.physDef = fallback.physDef;
        this.magDef = fallback.magDef;
        this.symbol = fallback.symbol;
        this.attackType = fallback.attackType;
        this.moveType = fallback.moveType;
        this.abilities = fallback.abilities || [];
    } else {
        this.moveRange = stats.move;
        this.attackRange = Array.isArray(stats.range) ? stats.range : [stats.range, stats.range];
        this.attack = stats.attack;
        this.physDef = stats.physDef;
        this.magDef = stats.magDef;
        this.symbol = stats.symbol;
        this.attackType = stats.attackType;
        this.moveType = stats.moveType;
        this.abilities = stats.abilities || [];
    }

    this.xp = 0;
    this.level = 0;
    
    // Status Effects
    this.status = {
        poison: 0, // Turns remaining
        blind: 0,
        weak: 0,
        attack_boost: 0,
        defense_boost: 0
    };
    
    // Animation State
    this.pixelX = x * 48; // Assuming TILE_SIZE = 48, will be updated by renderer/manager
    this.pixelY = y * 48;
    this.isMoving = false;
    this.movePath = [];
    this.animOffsetX = 0; // For attack bump
    this.animOffsetY = 0;

    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasUsedSkill = false;
    this.healedThisTurn = false;
    this.supportedThisTurn = false;
  }

  resetTurn() {
    this.state = 'ready';
    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasUsedSkill = false;
    this.healedThisTurn = false;
    this.supportedThisTurn = false;
  }

  gainXp(amount) {
      if (this.level >= 3) return; // Max level

      this.xp += amount;
      
      // Check level up
      while (this.level < 3 && this.xp >= XP_THRESHOLDS[this.level]) {
          this.levelUp();
      }
  }

  levelUp() {
      this.level++;
      
      const stats = UNIT_STATS[this.type];
      const bonus = stats.levelUp || { attack: 10, defense: 5 };

      this.attack += bonus.attack || 0;
      this.physDef += bonus.defense || 0;
      this.magDef += bonus.defense || 0;
      
      if (bonus.move) this.moveRange += bonus.move;
      if (bonus.hp) {
          this.maxHp += bonus.hp;
      }
      
      // Full heal on level up
      this.hp = this.maxHp;
      console.log(`${this.type} leveled up to ${this.level}! HP restored.`);
  }

  toJSON() {
      return {
          type: this.type,
          team: this.team,
          x_position: this.x,
          y_position: this.y,
          price: this.cost,
          experience: this.xp,
          current_hp: this.hp,
          current_movement_point: this.state === 'ready' ? this.moveRange : 0,
          standby: this.state === 'done'
      };
  }
}
