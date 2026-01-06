export const GAME_EVENTS = {
    ATTACK: 'ATTACK',
    UNIT_DESTROY: 'UNIT_DESTROY',
    MOVE: 'MOVE',
    HEAL: 'HEAL',
    BUY: 'BUY'
};

export class GameEventExecutor {
    constructor(gameManager) {
        this.manager = gameManager;
        this.queue = [];
    }

    submit(type, ...params) {
        this.queue.push({ type, params });
    }

    isProcessing() {
        return this.queue.length > 0;
    }

    dispatch() {
        if (this.queue.length > 0) {
            const event = this.queue.shift();
            this.execute(event);
        }
    }

    execute(event) {
        const { type, params } = event;
        switch (type) {
            case GAME_EVENTS.ATTACK:
                this.onAttack(params[0], params[1], params[2], params[3], params[4], params[5]);
                break;
            case GAME_EVENTS.UNIT_DESTROY:
                this.onUnitDestroy(params[0], params[1]);
                break;
            case GAME_EVENTS.BUY:
                this.onBuy(params[0], params[1], params[2], params[3]);
                break;
        }
    }

    onBuy(index, team, x, y) {
        const game = this.manager.game;
        // Double check canBuy
        if (game.canBuy(index, team)) {
            // Create Unit (GameState handles money deduction)
            game.buyUnit(index, x, y, team);
            
            // Trigger Animation? (Maybe dust or spawn effect)
            // this.manager.animationManager.submitSpawnAnimation(x, y);
        }
    }

    onAttack(attackerX, attackerY, targetX, targetY, damage, isCounter) {
        const game = this.manager.game;
        const attacker = game.getUnitAt(attackerX, attackerY);
        const defender = game.getUnitAt(targetX, targetY);

        if (attacker && defender) {
            // Apply Damage
            defender.hp -= damage;
            if (defender.hp < 0) defender.hp = 0;

            // Trigger Animation
            // We need to tell the AnimationManager to play an attack animation
            // The AnimationManager will block the loop until it's done.
            this.manager.animationManager.submitAttackAnimation(attacker, defender, damage);
        }
    }

    onUnitDestroy(x, y) {
        const game = this.manager.game;
        const unit = game.getUnitAt(x, y);
        if (unit) {
            game.removeUnit(unit);
            // Trigger Death Animation
            this.manager.animationManager.submitDeathAnimation(unit);
        }
    }
}
