import Position from './Position.js';

export default class Tomb extends Position {
    constructor(first, second) {
        // (x, y) or (json) or (tomb)
        if (typeof first === 'object') {
             if (first instanceof Tomb) {
                 super(first.x, first.y);
                 this.remains = 1; // Default or copy? Copy ctor in java only sets x,y. But what about remains?
                 // Java: public Tomb(Tomb tomb) { this(tomb.x, tomb.y); }
                 // It ignores remains! It effectively resets it to 1.
                 // Wait, private int remains = 1;
                 // So new tomb from old tomb resets remains.
                 // But wait, there is no "remains" copy?
                 // That's weird. Tomb is usually created when unit dies. 
                 // If copying map state, we should preserve remains?
                 // The Map copy constructor: tombs.add(new Tomb(tomb));
                 // So if I save/load, I use toJson/fromJson. 
                 // If I clone map, tombstones reset?
                 // This might be a bug in original java or intended (maybe tombs don't decay during AI calculation clone?).
                 // I will follow java.
             } else {
                 // json object
                 super(first.x, first.y);
                 this.remains = first.remains;
             }
        } else {
            // (x, y)
            super(first, second);
            this.remains = 1;
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

    toJson() {
        return {
            x: this.x,
            y: this.y,
            remains: this.getRemains()
        };
    }
}
