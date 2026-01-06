import { Unit } from '../entity/Unit.js';
import { Tile } from '../entity/Tile.js';
import { ABILITIES, UNIT_TYPES } from '../constants.js';
import { TileFactory } from './TileFactory.js'; // Need to implement this or access Map directly

export class UnitToolkit {
    constructor(gameCore) {
        this.game = gameCore;
    }

    getGame() {
        return this.game;
    }

    static attachAttackStatus(attacker, defender) {
        // TODO: Implement Status class and attachStatus method on Unit
        /*
        if (attacker.hasAbility(ABILITIES.POISONER) && !defender.hasAbility(ABILITIES.POISONER)) {
            defender.attachStatus(new Status(Status.POISONED, 2));
        }
        if (attacker.hasAbility(ABILITIES.BLINDER) && !defender.hasAbility(ABILITIES.BLINDER)) {
            defender.attachStatus(new Status(Status.BLINDED, 1));
        }
        */
    }

    getTerrainHeal(unit, tile) {
        // if (unit.getUnitCode() === "saeth") return 50; // Hero specific
        
        let heal = 0;
        if (!unit.hasAbility(ABILITIES.BLOODTHIRSTY)) {
            if (tile.getTeam() === -1) {
                heal += tile.getHpRecovery();
            } else {
                // Assuming game.isEnemy(team1, team2) exists
                if (!this.game.isEnemy(unit.getTeam(), tile.getTeam())) {
                    heal += tile.getHpRecovery();
                }
            }
        }
        
        if (unit.hasAbility(ABILITIES.SON_OF_THE_MOUNTAIN) && tile.getType() === Tile.TYPE_MOUNTAIN) heal += 10;
        if (unit.hasAbility(ABILITIES.SON_OF_THE_FOREST) && tile.getType() === Tile.TYPE_FOREST) heal += 10;
        if (unit.hasAbility(ABILITIES.SON_OF_THE_SEA) && tile.getType() === Tile.TYPE_WATER) heal += 10;
        
        return heal;
    }

    static getMovementPointCost(unit, tile) {
        let mp_cost = tile.getStepCost();
        const tile_type = tile.getType();
        
        if (unit.hasAbility(ABILITIES.AIR_UNIT)) mp_cost = 1; // AIR_FORCE in Java
        
        // CRAWLER logic (e.g. Slime)
        // if (unit.hasAbility(ABILITIES.CRAWLER) && ...) mp_cost = 1;
        
        if (unit.hasAbility(ABILITIES.WATER_CHILD) && tile_type === Tile.TYPE_WATER) mp_cost = 1; // FIGHTER_OF_THE_SEA
        if (unit.hasAbility(ABILITIES.FOREST_CHILD) && tile_type === Tile.TYPE_FOREST) mp_cost = 1; // FIGHTER_OF_THE_FOREST
        if (unit.hasAbility(ABILITIES.MOUNTAIN_CHILD) && tile_type === Tile.TYPE_MOUNTAIN) mp_cost = 1; // FIGHTER_OF_THE_MOUNTAIN
        
        // Crystal logic
        if (unit.type === UNIT_TYPES.WISDOM_CRYSTAL && tile_type === Tile.TYPE_MOUNTAIN && tile.getStepCost() >= 3) {
            mp_cost = 99;
        }
        
        return mp_cost;
    }

    static isWithinRange(unitOrX, targetOrY, minArOrTargetX, maxArOrTargetY, minAr, maxAr) {
        if (unitOrX instanceof Unit && targetOrY instanceof Unit) {
            return UnitToolkit.isWithinRange(unitOrX.x, unitOrX.y, targetOrY.x, targetOrY.y, unitOrX.attackRange[0], unitOrX.attackRange[1]); // Assuming range is array [min, max]
        } else if (unitOrX instanceof Unit) {
             return UnitToolkit.isWithinRange(unitOrX.x, unitOrX.y, targetOrY, minArOrTargetX, unitOrX.attackRange[0], unitOrX.attackRange[1]);
        } else {
            const range = UnitToolkit.getRange(unitOrX, targetOrY, minArOrTargetX, maxArOrTargetY);
            return minAr <= range && range <= maxAr;
        }
    }

    static getRange(x1, y1, x2, y2) {
        if (x1 instanceof Unit && y1 instanceof Unit) {
            return Math.abs(y1.x - x1.x) + Math.abs(y1.y - x1.y);
        }
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    getTileDefenceBonus(unit, tile) {
        // Hero check omitted
        let defence_bonus = 0;
        
        if (!unit.hasAbility(ABILITIES.AIR_UNIT)) {
            defence_bonus += tile.getDefenceBonus();
        }
        
        if (unit.hasAbility(ABILITIES.GUARDIAN) && !this.game.isEnemy(unit.getTeam(), tile.getTeam())) {
            defence_bonus += 5;
        }
        
        const type = tile.getType();
        if (type === Tile.TYPE_FOREST && unit.hasAbility(ABILITIES.FOREST_CHILD)) defence_bonus += 10;
        if (type === Tile.TYPE_MOUNTAIN && unit.hasAbility(ABILITIES.MOUNTAIN_CHILD)) defence_bonus += 10;
        if (type === Tile.TYPE_WATER && unit.hasAbility(ABILITIES.WATER_CHILD)) defence_bonus += 10;
        
        return defence_bonus;
    }

    getPhysicalDefenceBonus(attacker, defender, tile) {
        let defence_bonus = this.getTileDefenceBonus(defender, tile);
        // Bloodthirsty logic omitted (needs getEnemyAroundCount)
        return defence_bonus;
    }

    getMagicDefenceBonus(attacker, defender, tile) {
        return this.getTileDefenceBonus(defender, tile);
    }

    getAttackBonus(attacker, defender, tile) {
        let attack_bonus = 0;
        const type = tile.getType();
        
        if (attacker.hasAbility(ABILITIES.MOUNTAIN_CHILD) && type === Tile.TYPE_MOUNTAIN) attack_bonus += 10;
        if (attacker.hasAbility(ABILITIES.FOREST_CHILD) && type === Tile.TYPE_FOREST) attack_bonus += 10;
        if (attacker.hasAbility(ABILITIES.WATER_CHILD) && type === Tile.TYPE_WATER) attack_bonus += 10;
        
        if (attacker.hasAbility(ABILITIES.MARKSMAN) && defender.hasAbility(ABILITIES.AIR_UNIT)) attack_bonus += 15;
        
        // Bloodthirsty and Inspired logic omitted
        
        return attack_bonus;
    }

    getDamage(attacker, defender, apply_rng = true) {
        const attackerTile = this.game.map.getTile(attacker.x, attacker.y); // Need getTile in Map
        const defenderTile = this.game.map.getTile(defender.x, defender.y);
        
        const attack_bonus = this.getAttackBonus(attacker, defender, attackerTile);
        const attack = attacker.attack + attack_bonus; // Assuming flat attack value
        
        const defence = (attacker.attackType === 'physical') // ATTACK_PHYSICAL
            ? defender.physDef + this.getPhysicalDefenceBonus(attacker, defender, defenderTile)
            : defender.magDef + this.getMagicDefenceBonus(attacker, defender, defenderTile);
            
        let damage = attack > defence ? attack - defence : 0;
        
        // HP scaling
        damage = Math.floor(damage * attacker.hp / attacker.maxHp);
        damage = Math.max(0, damage);
        
        // Modifiers
        let percentage_modifier = 1.0;
        const range = UnitToolkit.getRange(attacker, defender);
        
        if (range === 1 && attacker.hasAbility(ABILITIES.DEATH_REAPER) && !defender.hasAbility(ABILITIES.DEATH_REAPER)) { // LORD_OF_TERROR -> DEATH_REAPER?
             percentage_modifier += 0.5;
        }
        if (range > 1 && defender.hasAbility(ABILITIES.HARD_SKIN)) {
            percentage_modifier -= 0.5;
        }
        
        percentage_modifier = Math.max(0, percentage_modifier);
        damage = Math.floor(damage * percentage_modifier);
        
        // RNG
        if (apply_rng) {
            damage += Math.floor(Math.random() * 5) - 2;
        }
        
        damage = Math.max(0, damage);
        damage = Math.min(damage, defender.hp);
        
        return damage;
    }
}
