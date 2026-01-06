export class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.music = null;
        this.isMuted = false;
        
        this.loadSounds();
    }

    loadSounds() {
        // Preload common sounds
        this.loadSound('prompt', '/audio/se/prompt.mp3');
        // Add placeholders for other sounds if we had them
        // this.loadSound('attack', '/audio/se/attack.mp3');
        // this.loadSound('move', '/audio/se/move.mp3');
    }

    loadSound(name, path) {
        const audio = new Audio(path);
        this.sounds.set(name, audio);
    }

    playSound(name) {
        if (this.isMuted) return;
        const sound = this.sounds.get(name);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.warn('Audio play failed:', e));
        }
    }

    playMusic(path) {
        if (this.music) {
            this.music.pause();
        }
        this.music = new Audio(path);
        this.music.loop = true;
        if (!this.isMuted) {
            this.music.play().catch(e => console.warn('Music play failed:', e));
        }
    }

    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music = null;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            if (this.music) this.music.pause();
        } else {
            if (this.music) this.music.play().catch(e => console.warn('Music play failed:', e));
        }
        return this.isMuted;
    }
}
