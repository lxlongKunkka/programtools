export class Player {
    constructor(jsonOrType) {
        if (typeof jsonOrType === 'object') {
            this.type = jsonOrType.type;
            this.gold = jsonOrType.gold;
            this.alliance = jsonOrType.alliance;
            this.population = jsonOrType.population;
            this.tech = jsonOrType.tech || []; // Assuming tech tree
        } else {
            this.type = jsonOrType || 0; // 0: Human, 1: AI
            this.gold = 0;
            this.alliance = 0;
            this.population = 0;
            this.tech = [];
        }
    }

    setType(type) { this.type = type; }
    setGold(gold) { this.gold = gold; }
    setAlliance(alliance) { this.alliance = alliance; }
    setPopulation(population) { this.population = population; }

    toJSON() {
        return {
            type: this.type,
            gold: this.gold,
            alliance: this.alliance,
            population: this.population,
            tech: this.tech
        };
    }
}
