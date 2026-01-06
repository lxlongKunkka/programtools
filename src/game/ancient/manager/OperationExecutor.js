export const OPERATIONS = {
    SELECT: 1,
    MOVE: 2,
    ATTACK: 3,
    COUNTER: 4,
    ACTION_FINISH: 5,
    TURN_START: 6,
    NEXT_TURN: 7,
    BUY: 8,
    HEAL: 9,
    SUMMON: 10,
    CAPTURE: 11
};

export class OperationExecutor {
    constructor(gameManager) {
        this.manager = gameManager;
        this.queue = [];
    }

    submit(type, ...params) {
        this.queue.push({ type, params });
    }

    operate() {
        if (this.queue.length > 0) {
            const op = this.queue.shift();
            this.execute(op);
            
            // If queue is empty after this, notify manager? 
            // In Java: if (queue.size() == 0) manager.onOperationFinished();
            if (this.queue.length === 0) {
                this.manager.onOperationFinished();
            }
        }
    }

    execute(op) {
        const { type, params } = op;
        switch (type) {
            case OPERATIONS.ATTACK:
                this.onAttack(params[0], params[1], params[2], params[3]);
                break;
            case OPERATIONS.COUNTER:
                this.onCounter(params[0], params[1], params[2], params[3]);
                break;
            case OPERATIONS.ACTION_FINISH:
                this.onActionFinish(params[0], params[1]);
                break;
            case OPERATIONS.NEXT_TURN:
                this.onNextTurn();
                break;
            case OPERATIONS.BUY:
                this.onBuy(params[0], params[1], params[2], params[3]);
                break;
            case OPERATIONS.SELECT:
                this.onSelect(params[0], params[1]);
                break;
            // Add other cases...
        }
    }

    onBuy(index, team, x, y) {
        this.manager.eventExecutor.submit('BUY', index, team, x, y);
    }

    onSelect(x, y) {
        this.manager.handleSelect(x, y);
    }

    onAttack(attackerX, attackerY, targetX, targetY) {
        const game = this.manager.game;
        const attacker = game.getUnitAt(attackerX, attackerY);
        const defender = game.getUnitAt(targetX, targetY);

        if (attacker && defender) {
            // Calculate damage (pure calculation)
            const damage = game.calculateDamage(attacker, defender);
            
            // Submit Game Event
            this.manager.eventExecutor.submit(
                'ATTACK', 
                attackerX, attackerY, targetX, targetY, damage, false
            );

            // Check death
            if (defender.hp - damage <= 0) {
                this.manager.eventExecutor.submit('UNIT_DESTROY', targetX, targetY);
            }
        }
    }

    onCounter(attackerX, attackerY, targetX, targetY) {
        const game = this.manager.game;
        const attacker = game.getUnitAt(attackerX, attackerY); // Original Attacker
        const defender = game.getUnitAt(targetX, targetY); // Original Defender (Now Counter-Attacking)

        // Check if defender is still alive and can counter
        if (defender && defender.hp > 0 && game.canCounter(defender, attacker)) {
            const damage = game.calculateDamage(defender, attacker);
            
            this.manager.eventExecutor.submit(
                'ATTACK', 
                targetX, targetY, attackerX, attackerY, damage, true // isCounter = true
            );

            if (attacker.hp - damage <= 0) {
                this.manager.eventExecutor.submit('UNIT_DESTROY', attackerX, attackerY);
            }
        }
    }

    onActionFinish(unitX, unitY) {
        const unit = this.manager.game.getUnitAt(unitX, unitY);
        if (unit) {
            unit.state = 'done';
            this.manager.setState(this.manager.STATE_SELECT);
        }
    }

    onNextTurn() {
        this.manager.game.endTurn();
        // Trigger Turn Start Event?
    }
}
