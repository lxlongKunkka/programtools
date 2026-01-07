export default class Statistics {
    constructor(first) {
        this.income = [0, 0, 0, 0];
        this.destroy = [0, 0, 0, 0];
        this.lose = [0, 0, 0, 0];

        if (first instanceof Statistics) {
            const statistics = first;
            for (let team = 0; team < 4; team++) {
                this.income[team] = statistics.getIncome(team);
                this.destroy[team] = statistics.getDestroy(team);
                this.lose[team] = statistics.getLost(team);
            }
        } else if (typeof first === 'object') {
             // Not explicitly in Java constructor, but useful for serialization if GameCore parses it differently?
             // GameCore parser: getJSONObject("statistics").getJSONArray("income")...
             // It manually populates the object. So default ctor is fine OR we can add json helper.
             // I'll stick to default ctor behavior + public methods unless I want to simplify GameCore.js
        }
    }

    addIncome(team, income) {
        this.income[team] += income;
    }

    addDestroy(team, value) {
        this.destroy[team] += value;
    }

    addLose(team, value) {
        this.lose[team] += value;
    }

    getIncome(team) {
        return this.income[team];
    }

    getDestroy(team) {
        return this.destroy[team];
    }

    getLost(team) {
        return this.lose[team];
    }

    toJson() {
        return {
            income: this.income,
            destroy: this.destroy,
            lose: this.lose
        };
    }
}
