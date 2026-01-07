import Map from './Map.js';
import Rule from './Rule.js';
import Player from './Player.js';
import Statistics from './Statistics.js';
import UnitFactory from '../utils/UnitFactory.js';
import Unit from './Unit.js'; // For static access if needed
import Ability from './Ability.js'; // For destroyUnit ability checks
import Tomb from './Tomb.js'; // For destroyUnit
import UnitToolkit from '../utils/UnitToolkit.js'; // For isTheSameUnit if needed

export default class GameCore {
    static SKIRMISH = 0x1;
    static CAMPAIGN = 0x2;

    constructor(first, second, third, fourth) {
        if (first instanceof Map) {
             // (map, rule, start_gold, type)
             this.map = first;
             this.rule = second;
             const start_gold = third;
             this.type = fourth;
             
             this.players = new Array(4);
             this.commanders = new Array(4);
             this.team_destroy = [false, false, false, false];
             this.turn = 1;
             this.current_team = 0;
             this.game_over = false;
             this.statistics = new Statistics();
             this.initialized = false;
             
             for (const unit of this.map.getUnits()) {
                 if (unit.isCommander()) {
                     this.commanders[unit.getTeam()] = unit;
                 }
             }
             
             for (let team = 0; team < 4; team++) {
                 this.players[team] = Player.createPlayer(Player.NONE, 0, 0, 0);
                 this.players[team].setGold(start_gold); // Java passes start_gold
                 this.team_destroy[team] = false;
                 
                 if (!this.commanders[team]) {
                     this.commanders[team] = UnitFactory.createCommander(team);
                 }
             }
             
        } else if (first instanceof GameCore) {
            const game = first;
            this.type = game.type;
            this.map = new Map(game.map); // Copy
            this.rule = new Rule(game.rule); // Copy
            this.commanders = new Array(4);
            this.players = new Array(4);
            this.team_destroy = new Array(4);
            this.turn = game.turn;
            this.current_team = game.current_team;
            this.game_over = game.game_over;
            this.statistics = new Statistics(game.statistics);
            this.initialized = game.initialized;
            
            for (let team = 0; team < 4; team++) {
                if (game.players[team]) {
                    this.players[team] = new Player(game.players[team]);
                }
                if (game.commanders[team]) {
                    this.setCommander(team, new Unit(game.commanders[team]));
                }
                this.team_destroy[team] = game.team_destroy[team];
            }
        } else if (typeof first === 'object') { // JSONObject
            const json = first;
            // Recursively creating Map and Rule from JSON
            this.map = new Map(json.map);
            this.rule = new Rule(json.rule);
            this.type = json.type;
            
            this.setCurrentTurn(json.current_turn);
            this.setCurrentTeam(json.current_team);
            this.setGameOver(json.game_over);
            this.setInitialized(json.initialized);
            
            const players = json.players;
            const commanders = json.commanders;
            const team_destroy = json.team_destroy;
            const stats = json.statistics;
            const income = stats ? stats.income : null;
            const destroy = stats ? stats.destroy : null;
            const lose = stats ? stats.lose : null;
            
            this.players = new Array(4);
            this.commanders = new Array(4);
            this.team_destroy = new Array(4);
            this.statistics = new Statistics(); // Rebuilt below
            
            for (let team = 0; team < 4; team++) {
                 this.players[team] = Player.createPlayer(Player.NONE, 0, 0, 0); // Init
                 const p = players[team];
                 this.players[team].setType(p.type);
                 this.players[team].setGold(p.gold);
                 this.players[team].setAlliance(p.alliance);
                 this.players[team].setPopulation(p.population);
                 
                 this.setTeamDestroyed(team, team_destroy[team]);
                 
                 if (stats) {
                    if (income) this.statistics.addIncome(team, income[team]);
                    if (destroy) this.statistics.addDestroy(team, destroy[team]);
                    if (lose) this.statistics.addLose(team, lose[team]);
                 }
                 
                 const cmdJson = commanders[team];
                 if (cmdJson) {
                    this.setCommander(team, UnitFactory.createUnit(cmdJson));
                 }
            }
        }
    }

    initialize() {
        if (!this.initialized) {
            this.current_team = -1;
            for (let team = 0; team < 4; team++) {
                if (this.players[team].getType() === Player.NONE) {
                    if (this.getMap().hasTeamAccess(team)) {
                        this.getMap().removeTeam(team);
                    }
                } else {
                    if (this.current_team === -1) {
                        this.current_team = team;
                    }
                    this.statistics.addIncome(team, this.getPlayer(team).getGold());
                    this.updatePopulation(team);
                }
            }
            this.setInitialized(true);
        }
    }
    
    getStatistics() { return this.statistics; }
    isInitialized() { return this.initialized; } // initialized() in java
    setInitialized(initialized) { this.initialized = initialized; }
    getMap() { return this.map; }
    getRule() { return this.rule; }
    getType() { return this.type; }

    isTeamAlive(team) {
        return 0 <= team && team < 4 && this.getPlayer(team).getType() !== Player.NONE && !this.team_destroy[team];
    }
    
    getPlayer(team) { return this.players[team]; }
    getCurrentPlayer() { return this.players[this.current_team]; }
    getCurrentTeam() { return this.current_team; }
    
    getNextTeam() {
        let team = this.getCurrentTeam();
        do {
            team = team < 3 ? team + 1 : 0;
        } while (!this.isTeamAlive(team));
        return team;
    }
    
    setCurrentTeam(team) { this.current_team = team; }
    getCurrentTurn() { return this.turn; }
    setCurrentTurn(turn) { this.turn = turn; }
    
    getMaxPopulation() { return this.getRule().getInteger(Rule.UNIT_CAPACITY); }
    
    getPopulation(team) { return this.getPlayer(team).getPopulation(); }
    
    canAddPopulation(team, population) {
        const player = this.getPlayer(team);
        return player.getType() !== Player.NONE 
            && player.getPopulation() + population <= this.getRule().getInteger(Rule.UNIT_CAPACITY);
    }
    
    canBuy(index, team) {
        const sample = UnitFactory.cloneUnit(UnitFactory.getSample(index));
        const price = this.getUnitPrice(index, team);
        return price >= 0 &&
               this.isTeamAlive(team) &&
               this.getCurrentPlayer().getGold() >= price &&
               (this.canAddPopulation(team, sample.getOccupancy()) || sample.isCommander());
    }
    
    destroyTeam(team) {
        this.getMap().removeTeam(team);
        this.setTeamDestroyed(team, true);
    }
    
    isTeamDestroyed(team) { return this.team_destroy[team]; }
    setTeamDestroyed(team, destroyed) { this.team_destroy[team] = destroyed; }
    isGameOver() { return this.game_over; }
    setGameOver(game_over) { this.game_over = game_over; }
    
    destroyUnit(target_x, target_y) {
        const target = this.getMap().getUnit(target_x, target_y);
        if (target) {
            this.getStatistics().addLose(target.getTeam(), target.getPrice());
            this.getMap().removeUnit(target_x, target_y);
            this.updatePopulation(target.getTeam());
            
            if (!target.hasAbility(Ability.UNDEAD) && !target.isCommander()) {
                 this.getMap().addTomb(target.getX(), target.getY());
            }
            if (target.isCommander()) {
                const commander = this.getCommander(target.getTeam());
                const price = commander.getPrice();
                commander.setPrice(price + this.getRule().getInteger(Rule.COMMANDER_PRICE_STEP));
            }
        }
    }
    
    standbyUnit(unit_x, unit_y) {
        const unit = this.getMap().getUnit(unit_x, unit_y);
        if (unit && this.getMap().canStandby(unit)) {
            unit.setStandby(true);
        }
    }
    
    restoreCommander(team, x, y) {
        if (!this.isCommanderAlive(team)) {
            const commander = this.commanders[team];
            if (!commander) return; // safety
            commander.setX(x);
            commander.setY(y);
            commander.clearStatus();
            this.getMap().addUnit(commander);
            commander.setCurrentHp(commander.getMaxHp());
            this.resetUnit(commander);
            this.updatePopulation(team);
        }
    }
    
    createUnit(index, team, x, y) {
        const unit = UnitFactory.createUnit(index, team);
        unit.setX(x);
        unit.setY(y);
        this.getMap().addUnit(unit);
        this.updatePopulation(team);
        return unit;
    }
    
    moveUnit(target_x, target_y, dest_x, dest_y) {
        const target = this.getMap().getUnit(target_x, target_y);
        if (target && this.canUnitMove(target, dest_x, dest_y)) {
             this.getMap().moveUnit(target, dest_x, dest_y);
        }
    }
    
    canUnitMove(unit, dest_x, dest_y) {
        if (this.getMap().canMove(dest_x, dest_y)) {
            const dest_unit = this.getMap().getUnit(dest_x, dest_y);
            return dest_unit == null || UnitToolkit.isTheSameUnit(unit, dest_unit);
        } else {
            return false;
        }
    }

    canMoveThrough(unit, target_unit) {
        return target_unit == null
                || !this.isEnemy(unit, target_unit)
                || (unit.hasAbility(Ability.AIR_FORCE) && !target_unit.hasAbility(Ability.AIR_FORCE));
    }

    
    setTile(index, x, y) {
        this.getMap().setTile(index, x, y);
    }
    
    getAlliance(team) {
         if (0 <= team && team < 4 && this.getPlayer(team)) {
             return this.getPlayer(team).getAlliance();
         }
         return -1;
    }
    
    getCommander(team) { return this.commanders[team]; }
    
    setCommander(team, commander) {
        this.commanders[team] = commander;
        if (commander.getCurrentHp() > 0 && this.isCommanderAlive(team)) {
             this.getMap().addUnit(this.commanders[team], true);
        }
    }
    
    getUnitPrice(index, team) {
        const unit = UnitFactory.getSample(index);
        if (unit.isCommander()) {
            if (this.isCommanderAlive(team)) {
                return -1;
            } else {
                return this.commanders[team].getPrice();
            }
        } else {
            return unit.getPrice();
        }
    }
    
    isCommanderAlive(team) {
        for (const unit of this.getMap().getUnits()) {
            if (unit.getTeam() === team && unit.isCommander()) {
                return true;
            }
        }
        return false;
    }
    
    updatePopulation(team) {
        const population = this.getMap().getPopulation(team);
        this.getPlayer(team).setPopulation(population);
    }
    
    calcIncome(team) {
        let income = 0;
        // Sets iteration
        for (const position of this.getMap().getCastlePositions()) {
            if (this.getMap().getTile(position).getTeam() === team) {
                income += this.getRule().getInteger(Rule.CASTLE_INCOME);
            }
        }
        for (const position of this.getMap().getVillagePositions()) {
            if (this.getMap().getTile(position).getTeam() === team) {
                income += this.getRule().getInteger(Rule.VILLAGE_INCOME);
            }
        }
        return income + this.getCommanderIncome(team);
    }
    
    getCommanderIncome(team) {
        if (this.isCommanderAlive(team)) {
            return this.getRule().getInteger(Rule.COMMANDER_INCOME) * (this.getCommander(team).getLevel() + 1);
        } else {
            return 0;
        }
    }
    
    gainIncome(team) {
        const income = this.calcIncome(team);
        this.getPlayer(team).changeGold(income);
        this.getStatistics().addIncome(team, income);
        return income;
    }
    
    resetUnit(unit) {
        unit.resetMovementPoint();
        unit.setStandby(false);
    }
    
    isEnemy(a, b) {
        if (a instanceof Unit) { // unit_a, unit_b
            return a && b && this.isEnemy(a.getTeam(), b.getTeam());
        } else { // team_a, team_b
            const team_a = a;
            const team_b = b;
            return team_a >= 0 && team_b >= 0 && this.getAlliance(team_a) !== this.getAlliance(team_b);
        }
    }
    
    isAlly(a, b) {
        if (a instanceof Unit) {
             return a && b && this.isAlly(a.getTeam(), b.getTeam());
        } else {
             const team_a = a;
             const team_b = b;
             return team_a >= 0 && team_b >= 0 && this.getAlliance(team_a) === this.getAlliance(team_b);
        }
    }

    getEnemyAroundCount(xOrUnit, yOrRange, team, range) {
        if (typeof xOrUnit === 'object') { // Unit
            const unit = xOrUnit;
            const r = yOrRange;
            return this.getEnemyAroundCount(unit.getX(), unit.getY(), unit.getTeam(), r);
        } else {
            const map_x = xOrUnit;
            const map_y = yOrRange;
            if (range < 1) return 0;
            let count = 0;
            for (let dx = -range; dx <= range; dx++) {
                for (let dy = -range; dy <= range; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) <= range) {
                        const unit = this.getMap().getUnit(map_x + dx, map_y + dy);
                        if (unit && this.isEnemy(team, unit.getTeam())) {
                            count++;
                        }
                    }
                }
            }
            return count;
        }
    }

    canAttack(attacker, xOrUnit, y) {
        if (typeof xOrUnit === 'object') {
            const defender = xOrUnit;
            return this.canAttack(attacker, defender.getX(), defender.getY());
        }
        const x = xOrUnit;
        const y_pos = y;
        if (attacker && UnitToolkit.isWithinRange(attacker, x, y_pos)) {
            const defender = this.getMap().getUnit(x, y_pos);
            if (!defender) {
                 return attacker.hasAbility(Ability.DESTROYER) && this.getMap().getTile(x, y_pos).isDestroyable();
            } else {
                return this.isEnemy(attacker, defender);
            }
        }
        return false;
    }

    canCounter(attacker, defender) {
        if (defender && defender.getCurrentHp() > 0 && this.isEnemy(defender, attacker)) {
            const dist = UnitToolkit.getRange(defender, attacker);
            if (defender.hasAbility(Ability.COUNTER_MADNESS)) {
                return dist <= 2;
            } else {
                 return UnitToolkit.isWithinRange(defender, attacker) && dist === 1;
            }
        }
        return false;
    }
    
    canOccupy(conqueror, x, y) {
         if (this.getMap().isWithinMap(x, y)) {
             const tile = this.getMap().getTile(x, y);
             return !(conqueror == null || tile.getTeam() === conqueror.getTeam())
                     && tile.isCapturable()
                     && ((tile.isCastle() && conqueror.hasAbility(Ability.COMMANDER))
                     || (tile.isVillage() && conqueror.hasAbility(Ability.CONQUEROR)));
         }
         return false;
    }
    
    canRepair(repairer, x, y) {
        if (this.getMap().isWithinMap(x, y)) {
            if (!repairer) return false;
            const tile = this.getMap().getTile(x, y);
            return repairer.hasAbility(Ability.REPAIRER) && tile.isRepairable();
        }
        return false;
    }

    canSummon(summoner, x, y) {
        return summoner.hasAbility(Ability.NECROMANCER)
             && UnitToolkit.isWithinRange(summoner, x, y)
             && this.getMap().isTomb(x, y) 
             && this.getMap().getUnit(x, y) === null;
    }

    toJson() {
        return {
            initialized: this.isInitialized(),
            players: this.players.map(p => p.toJson()),
            commanders: this.commanders.map(c => c ? c.toJson() : null), // Handle null commanders?
            team_destroy: this.team_destroy,
            statistics: this.statistics.toJson()
        };
    }
}
