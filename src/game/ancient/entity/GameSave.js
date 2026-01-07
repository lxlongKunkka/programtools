import GameCore from './GameCore.js';

export default class GameSave {
    constructor(first, second) {
        if (typeof first === 'object' && !second) { // json
             const json = first;
             this.type = json.type;
             this.game = new GameCore(json.game);
             this.attributes = json.attributes || {};
        } else {
             // (game, type)
             this.game = first;
             this.type = second;
             this.attributes = {};
        }
    }

    getType() {
        return this.type;
    }

    getGame() {
        return this.game;
    }

    putInteger(key, integer) {
        this.attributes[key] = integer;
    }

    getInteger(key, default_value) {
        const val = this.attributes[key];
        return typeof val === 'number' ? val : default_value;
    }

    putString(key, str) {
        this.attributes[key] = str;
    }

    getString(key, default_value) {
        const val = this.attributes[key];
        return typeof val === 'string' ? val : default_value;
    }

    keys() {
        return Object.keys(this.attributes);
    }

    toJson() {
        return {
            type: this.getType(),
            game: this.getGame().toJson(),
            attributes: this.attributes
        };
    }
}
