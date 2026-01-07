import Ability from '../entity/Ability.js';
import TileFactory from './TileFactory.js';
import UnitFactory from './UnitFactory.js';
import Tile from '../entity/Tile.js';
import Status from '../entity/Status.js';
import Unit from '../entity/Unit.js'; 

export default class UnitToolkit {
    static isTheSameUnit(unit_a, unit_b) {
        return !!(unit_a && unit_b)
                && unit_a.isAt(unit_b.getX(), unit_b.getY())
                && unit_a.getUnitCode() === unit_b.getUnitCode();
    }
    
    static getMovementPointCost(unit, tile) {
        let mp_cost = tile.getStepCost();
        const tile_type = tile.getType(); 
        
        if (unit.hasAbility(Ability.AIR_FORCE)) {
            mp_cost = 1;
        }
        
        if (unit.hasAbility(Ability.CRAWLER)
                && (tile_type === Tile.TYPE_LAND || tile_type === Tile.TYPE_FOREST || tile_type === Tile.TYPE_MOUNTAIN)) {
             mp_cost = 1;
        }
        
        if (unit.hasAbility(Ability.FIGHTER_OF_THE_SEA) && tile_type === Tile.TYPE_WATER) {
            mp_cost = 1;
        }
        if (unit.hasAbility(Ability.FIGHTER_OF_THE_FOREST) && tile_type === Tile.TYPE_FOREST) {
            mp_cost = 1;
        }
        if (unit.hasAbility(Ability.FIGHTER_OF_THE_MOUNTAIN) && tile_type === Tile.TYPE_MOUNTAIN) {
            mp_cost = 1;
        }
        
        if (UnitFactory.isCrystal(unit.getIndex()) && tile_type === Tile.TYPE_MOUNTAIN && tile.getStepCost() >= 3) {
            mp_cost = 99;
        }
        
        return mp_cost;
    }

    static getRange(a, b) {
        return Math.abs(a.getX() - b.getX()) + Math.abs(a.getY() - b.getY());
    }

    static getTileDefenceBonus(game, unit, tile_index) {
        let defence_bonus = 0;
        const tile = TileFactory.getTile(tile_index);
        
        if (unit.hasAbility(Ability.AIR_FORCE)) return 0;
        
        defence_bonus += tile.getDefenceBonus();
        
        if (unit.hasAbility(Ability.GUARDIAN) && game.isAlly(unit.getTeam(), tile.getTeam())) {
            defence_bonus += 5;
        }
        
        switch (tile.getType()) {
            case Tile.TYPE_FOREST:
                if (unit.hasAbility(Ability.FIGHTER_OF_THE_FOREST)) defence_bonus += 10;
                break;
            case Tile.TYPE_MOUNTAIN:
                if (unit.hasAbility(Ability.FIGHTER_OF_THE_MOUNTAIN)) defence_bonus += 10;
                break;
            case Tile.TYPE_WATER:
                if (unit.hasAbility(Ability.FIGHTER_OF_THE_SEA)) defence_bonus += 10;
                break;
        }
        return defence_bonus;
    }

    static getPhysicalDefenceBonus(game, attacker, defender, tile_index) {
        let defence = UnitToolkit.getTileDefenceBonus(game, defender, tile_index);
        if (defender.hasAbility(Ability.BLOODTHIRSTY)) {
             const count = game.getEnemyAroundCount(defender, 2);
             defence += count * 5;
        }
        return defence;
    }

    static getMagicDefenceBonus(game, attacker, defender, tile_index) {
         return UnitToolkit.getTileDefenceBonus(game, defender, tile_index);
    }
    
    static getAttackBonus(game, attacker, defender, tile_index) {
        let bonus = 0;
        const tile = TileFactory.getTile(tile_index);
        // Terrain Bonuses
        if (attacker.hasAbility(Ability.FIGHTER_OF_THE_MOUNTAIN) && tile.getType() === Tile.TYPE_MOUNTAIN) bonus += 10;
        if (attacker.hasAbility(Ability.FIGHTER_OF_THE_FOREST) && tile.getType() === Tile.TYPE_FOREST) bonus += 10;
        if (attacker.hasAbility(Ability.FIGHTER_OF_THE_SEA) && tile.getType() === Tile.TYPE_WATER) bonus += 10;
        
        // Matchups
        if (attacker.hasAbility(Ability.MARKSMAN) && defender.hasAbility(Ability.AIR_FORCE)) bonus += 15;
        
        // Passives
        if (attacker.hasAbility(Ability.BLOODTHIRSTY)) {
             bonus += game.getEnemyAroundCount(attacker, 2) * 10;
        }
        if (attacker.hasStatus(Status.INSPIRED)) bonus += 10;
        
        return bonus;
    }
    
    static getDamage(game, attacker, defender, apply_rng = false) {
        const map = game.getMap();
        const attacker_tile_index = map.getTileIndex(attacker.getX(), attacker.getY());
        const defender_tile_index = map.getTileIndex(defender.getX(), defender.getY());
        
        const attack_bonus = UnitToolkit.getAttackBonus(game, attacker, defender, attacker_tile_index);
        const attack = attacker.getAttack() + attack_bonus;
        
        const isPhys = (attacker.getAttackType() === Unit.ATTACK_PHYSICAL);
        const defBonus = isPhys 
            ? UnitToolkit.getPhysicalDefenceBonus(game, attacker, defender, defender_tile_index)
            : UnitToolkit.getMagicDefenceBonus(game, attacker, defender, defender_tile_index);
            
        const baseDef = isPhys ? defender.getPhysicalDefence() : defender.getMagicDefence();
        const defence = baseDef + defBonus;
        
        let damage = (attack > defence) ? (attack - defence) : 0;
        
        // HP Scaling
        damage = Math.floor(damage * attacker.getCurrentHp() / attacker.getMaxHp());
        if (damage < 0) damage = 0;
        
        // Modifiers
        let modifier = 1.0;
        const range = UnitToolkit.getRange(attacker, defender);
        
        if (range === 1 && attacker.hasAbility(Ability.LORD_OF_TERROR) && !defender.hasAbility(Ability.LORD_OF_TERROR)) {
            modifier += 0.5;
        }
        if (range > 1 && defender.hasAbility(Ability.HARD_SKIN)) {
            modifier -= 0.5;
        }
        if (modifier < 0) modifier = 0;
        
        damage = Math.floor(damage * modifier);
        
        // RNG (Optional)
        if (apply_rng) {
             const offset = Math.floor(Math.random() * 5) - 2; // -2 to 2
             damage += offset;
        }
        
        if (damage < 0) damage = 0;
        if (damage > defender.getCurrentHp()) damage = defender.getCurrentHp(); 
        
        return damage;
    }
}
