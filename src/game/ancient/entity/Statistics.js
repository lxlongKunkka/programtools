export class Statistics {
    constructor(json) {
        this.income = [0, 0, 0, 0];
        this.destroy = [0, 0, 0, 0];
        this.lose = [0, 0, 0, 0];
        
        if (json) {
            // Assuming json structure matches Java's arrays
            if (json.income) this.income = json.income;
            if (json.destroy) this.destroy = json.destroy;
            if (json.lose) this.lose = json.lose;
        }
    }

    addIncome(team, amount) { this.income[team] += amount; }
    addDestroy(team, count) { this.destroy[team] += count; }
    addLose(team, count) { this.lose[team] += count; }

    toJSON() {
        return {
            income: this.income,
            destroy: this.destroy,
            lose: this.lose
        };
    }
}
