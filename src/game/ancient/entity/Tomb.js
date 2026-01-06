import { Position } from './Position.js';

export class Tomb extends Position {
    constructor(xOrJson, y, team) {
        if (typeof xOrJson === 'object' && xOrJson !== null && !(xOrJson instanceof Position)) {
            // Assuming JSON object
            super(xOrJson.x, xOrJson.y);
            this.remains = xOrJson.remains;
            this.team = xOrJson.team || -1;
        } else if (xOrJson instanceof Tomb) {
             super(xOrJson.x, xOrJson.y);
             this.remains = xOrJson.remains;
             this.team = xOrJson.team;
        } else {
            super(xOrJson, y);
            this.remains = 1;
            this.team = team;
        }
    }

    update() {
        if (this.remains >= 0) {
            this.remains--;
        }
    }

    getRemains() {
        return this.remains;
    }

    setRemains(remains) {
        this.remains = remains;
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            remains: this.remains,
            team: this.team
        };
    }
}
