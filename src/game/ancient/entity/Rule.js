export class Rule {
    constructor(json) {
        if (json) {
            this.max_population = json.max_population || 50;
            this.income_rate = json.income_rate || 100;
        } else {
            this.max_population = 50;
            this.income_rate = 100;
        }
    }

    toJSON() {
        return {
            max_population: this.max_population,
            income_rate: this.income_rate
        };
    }
}
