export default class Status {
    static POISONED = 0;
    static SLOWED = 1;
    static INSPIRED = 2;
    static BLINDED = 3;

    constructor(typeOrJson, turn) {
        if (typeof typeOrJson === 'object' && typeOrJson.type !== undefined) {
             // Handle JSONObject or copy constructor
            this.type = typeOrJson.type;
            this.remaining_turn = typeOrJson.remaining_turn;
        } else {
             // Handle (type, turn) or (type) constructor
            this.type = typeOrJson;
            this.setRemainingTurn(turn || 0);
        }
    }

    update() {
        this.remaining_turn--;
    }

    getType() {
        return this.type;
    }

    getRemainingTurn() {
        return this.remaining_turn;
    }

    setRemainingTurn(turn) {
        this.remaining_turn = turn;
    }

    equals(status) {
        return status instanceof Status && status.getType() === this.type;
    }

    hashCode() {
        let hash = 3;
        hash = 89 * hash + this.type;
        return hash;
    }

    toJson() {
        return {
            type: this.getType(),
            remaining_turn: this.getRemainingTurn()
        };
    }

    static isBuff(status) {
        return status != null && status.getType() === Status.INSPIRED;
    }

    static isDebuff(status) {
        if (status == null) {
            return false;
        } else {
            const type = status.getType();
            return type === Status.POISONED || type === Status.SLOWED || type === Status.BLINDED;
        }
    }

    static getAllStatus() {
        const status = [];
        for (let i = 0; i < 4; i++) {
            status.push(i);
        }
        return status;
    }
}
