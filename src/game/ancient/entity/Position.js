export class Position {
    constructor(x, y) {
        if (typeof x === 'object' && x !== null) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    equals(obj) {
        if (obj instanceof Position) {
            return this.x === obj.x && this.y === obj.y;
        }
        return false;
    }

    toString() {
        return `Position[x=${this.x},y=${this.y}]`;
    }
}
