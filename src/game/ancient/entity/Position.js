export default class Position {
    constructor(x, y) {
        if (x instanceof Position) {
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

    equals(position) {
        return position instanceof Position && position.x === this.x && position.y === this.y;
    }

    // HashCode in JS is not native, implemented for compatibility
    hashCode() {
        let hash = 3;
        hash = 29 * hash + this.x;
        hash = 29 * hash + this.y;
        return hash;
    }
}
