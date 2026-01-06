import { Map } from './Map.js';
import { Rule } from './Rule.js';
import { Player } from './Player.js';
import { Statistics } from './Statistics.js';
import { UnitFactory } from '../utils/UnitFactory.js';
import { Unit } from './Unit.js';
import { Tomb } from './Tomb.js';

export class GameCore {
    static SKIRMISH = 0x1;
    static CAMPAIGN = 0x2;

    constructor(jsonOrMap, rule, start_gold = 100, type = GameCore.SKIRMISH) {
        if (jsonOrMap instanceof Map) {
            // Constructor(Map map, Rule rule, int start_gold, int type)
            this.map = jsonOrMap;
            this.rule = rule || new Rule();
            this.type = type;
            this.players = new Array(4);
            this.commanders = new Array(4);
            this.team_destroy = [false, false, false, false];
            this.turn = 1;
            this.game_over = false;
            this.statistics = new Statistics();
            this.initialized = false;
            
            // Initialize players (simplified logic from Java might be needed here or handled by caller)
            for(let i=0; i<4; i++) {
                this.players[i] = new Player(0); // Default human
                this.players[i].setGold(start_gold);
            }
        } else if (jsonOrMap instanceof GameCore) {
            // Copy constructor
            const game = jsonOrMap;
            this.type = game.type;
            // Deep copy map? Java does new Map(game.map)
            // We need a copy constructor in Map.js if we want deep copy.
            // For now, let's assume shallow or implement Map copy later.
            this.map = game.map; // TODO: Deep copy
            this.rule = new Rule(game.rule); // Assuming Rule has copy logic or is simple
            this.commanders = [...game.commanders]; // Shallow copy of array
            this.players = game.players.map(p => new Player(p)); // Assuming Player copy logic
            this.team_destroy = [...game.team_destroy];
            this.turn = game.turn;
            this.current_team = game.current_team;
            this.game_over = game.game_over;
            this.statistics = new Statistics(game.statistics);
            this.initialized = game.initialized;
        } else {
            // JSON constructor
            const json = jsonOrMap;
            this.map = new Map(json.map);
            this.rule = new Rule(json.rule);
            this.type = json.type;
            this.turn = json.current_turn;
            this.current_team = json.current_team;
            this.game_over = json.game_over;
            this.initialized = json.initialized;
            
            this.players = new Array(4);
            this.commanders = new Array(4);
            this.team_destroy = [false, false, false, false];
            this.statistics = new Statistics(json.statistics); // Assuming Statistics handles JSON

            const playersJson = json.players;
            const commandersJson = json.commanders;
            const teamDestroyJson = json.team_destroy;
            
            // Statistics loading is handled inside Statistics constructor if passed json.statistics
            // But Java code does explicit addIncome etc. 
            // Let's assume Statistics(json) handles it or we do it here.
            // The Java code: getStatistics().addIncome(...)
            // My Statistics.js: constructor(json) { if(json) ... }
            
            for (let team = 0; team < 4; team++) {
                this.players[team] = new Player(playersJson[team]);
                this.team_destroy[team] = teamDestroyJson[team];
                
                if (commandersJson && commandersJson[team]) {
                    this.commanders[team] = UnitFactory.createUnitFromJson(commandersJson[team]);
                }
            }
        }
    }

    setCurrentTurn(turn) { this.turn = turn; }
    setCurrentTeam(team) { this.current_team = team; }
    setGameOver(gameOver) { this.game_over = gameOver; }
    setInitialized(initialized) { this.initialized = initialized; }
    
    getPlayer(team) { return this.players[team]; }
    getStatistics() { return this.statistics; }
    setTeamDestroyed(team, destroyed) { this.team_destroy[team] = destroyed; }
    setCommander(team, unit) { this.commanders[team] = unit; }

    isEnemy(team1, team2) {
        return team1 !== team2;
    }

    startTurn() {
        const player = this.players[this.current_team];
        if (!player) return;

        // 1. Calculate Income
        let income = 0;
        const width = this.map.getWidth();
        const height = this.map.getHeight();
        
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const tile = this.map.getTile(x, y);
                if (tile.team === this.current_team) {
                    if (tile.is_castle) income += 50;
                    else if (tile.is_village) income += 30;
                }
            }
        }
        
        player.gold += income;
        console.log(`Team ${this.current_team} Income: ${income}, Total Gold: ${player.gold}`);
        
        // 2. Heal Units & Reset Turn & Status Effects
        const deadUnits = [];
        for (const unit of this.map.units.values()) {
            if (unit.team === this.current_team) {
                // Status Effects
                if (unit.status.poison > 0) {
                    const poisonDamage = Math.floor(unit.maxHp * 0.1); // 10% damage
                    unit.hp -= poisonDamage;
                    unit.status.poison--;
                    console.log(`Unit at ${unit.x},${unit.y} took ${poisonDamage} poison damage. HP: ${unit.hp}`);
                    
                    if (unit.hp <= 0) {
                        deadUnits.push(unit);
                        continue; // Skip healing if dead
                    }
                }
                
                // Decrement other statuses
                if (unit.status.blind > 0) unit.status.blind--;
                if (unit.status.weak > 0) unit.status.weak--;
                if (unit.status.attack_boost > 0) unit.status.attack_boost--;
                if (unit.status.defense_boost > 0) unit.status.defense_boost--;

                // Healing
                const tile = this.map.getTile(unit.x, unit.y);
                if (tile.team === this.current_team && tile.hp_recovery > 0) {
                    const healAmount = 20; 
                    unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
                }
                unit.resetTurn();
            }
        }

        // Handle deaths from poison
        for (const unit of deadUnits) {
            const pos = this.map.positions[unit.x][unit.y];
            this.map.units.delete(pos);
            this.map.addTomb(new Tomb(unit.x, unit.y, unit.team));
            console.log(`Unit at ${unit.x},${unit.y} died from poison.`);
        }
    }

    toJSON() {
        return {
            map: this.map.toJSON(),
            rule: this.rule.toJSON(),
            type: this.type,
            current_turn: this.turn,
            current_team: this.current_team,
            game_over: this.game_over,
            initialized: this.initialized,
            statistics: this.statistics.toJSON(),
            players: this.players.map(p => p.toJSON()),
            commanders: this.commanders.map(c => c ? c.toJSON() : null),
            team_destroy: this.team_destroy
        };
    }
}
