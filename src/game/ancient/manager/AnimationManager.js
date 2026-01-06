export class AnimationManager {
    constructor() {
        this.queue = [];
        this.currentAnimation = null;
    }

    submit(anim) {
        this.queue.push(anim);
    }

    submitAttackAnimation(attacker, defender, damage) {
        this.submit({
            type: 'attack',
            attacker,
            defender,
            damage,
            duration: 400, // ms
            elapsed: 0
        });
    }

    submitDeathAnimation(unit) {
        this.submit({
            type: 'death',
            unit,
            duration: 500,
            elapsed: 0
        });
    }

    isAnimating() {
        return this.currentAnimation !== null || this.queue.length > 0;
    }

    update(dt) {
        if (!this.currentAnimation) {
            if (this.queue.length > 0) {
                this.currentAnimation = this.queue.shift();
                // Start animation logic if needed
            }
        }

        if (this.currentAnimation) {
            this.currentAnimation.elapsed += dt;
            if (this.currentAnimation.elapsed >= this.currentAnimation.duration) {
                this.currentAnimation = null;
            }
        }
    }
    
    // Helper for Renderer to know what to draw
    getCurrentAnimation() {
        return this.currentAnimation;
    }
}
