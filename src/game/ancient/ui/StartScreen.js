export class StartScreen {
    constructor(canvas, onStart) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onStart = onStart;
        this.active = true;
        
        this.handleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.handleClick);
    }

    draw() {
        if (!this.active) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, width, height);
        
        // Title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Ancient Empires', width / 2, height / 2 - 50);
        
        // Start Button
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(width / 2 - 100, height / 2 + 20, 200, 60);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Start Game', width / 2, height / 2 + 58);
    }

    handleClick(event) {
        if (!this.active) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Check button click
        if (x >= width / 2 - 100 && x <= width / 2 + 100 &&
            y >= height / 2 + 20 && y <= height / 2 + 80) {
            this.active = false;
            this.canvas.removeEventListener('click', this.handleClick);
            if (this.onStart) this.onStart();
        }
    }
}
