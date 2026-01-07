export default class Player {
    static NONE = 0x0;
    static LOCAL = 0x1;
    static ROBOT = 0x3;
    static REMOTE = 0x2;
    static RECORD = 0x4;

    constructor(player) {
         if (player) {
             this.type = player.getType ? player.getType() : player.type;
             this.gold = player.getGold ? player.getGold() : player.gold;
             this.alliance = player.getAlliance ? player.getAlliance() : player.alliance;
             this.population = player.getPopulation ? player.getPopulation() : player.population;
         } else {
             this.type = 0;
             this.gold = 0;
             this.alliance = 0;
             this.population = 0;
         }
    }

    setType(type) {
        this.type = type;
    }

    getType() {
        return this.type;
    }

    setGold(gold) {
        this.gold = gold;
    }

    changeGold(change) {
        this.gold += change;
    }

    getGold() {
        return this.gold;
    }

    setPopulation(population) {
        this.population = population;
    }

    getPopulation() {
        return this.population;
    }

    setAlliance(alliance) {
        this.alliance = alliance;
    }

    getAlliance() {
        return this.alliance;
    }

    isLocalPlayer() {
        return this.getType() === Player.LOCAL || this.getType() === Player.ROBOT;
    }

    static createPlayer(type, alliance, gold, population) {
        const player = new Player();
        player.setType(type);
        player.setGold(gold);
        player.setAlliance(alliance);
        player.setPopulation(population || 0);
        return player;
    }

    toJson() {
        return {
            type: this.getType(),
            gold: this.getGold(),
            alliance: this.getAlliance(),
            population: this.getPopulation()
        };
    }
}
