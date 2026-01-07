export default class Step {
    constructor(position, movement_point) {
        this.position = position;
        this.movement_point = movement_point;
    }

    getPosition() {
        return this.position;
    }

    getMovementPoint() {
        return this.movement_point;
    }
}
