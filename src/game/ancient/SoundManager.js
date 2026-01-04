export class SoundManager {
    constructor() {
        this.enabled = true;
        this.context = null;
        this.sounds = {};
        this.bgm = null;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.loadSounds();
        } catch (e) {
            console.warn("Web Audio API not supported");
        }
    }

    loadSounds() {
        // Load prompt.mp3 for select
        this.loadSound('select', '/api/public/audio/se/prompt.mp3');
        
        // Try to load other sounds (will fallback to synth if not found)
        // Note: Original game only has prompt.mp3 in se folder.
        // Other sounds might be missing or need to be generated/mapped differently.
        // For now, we only load what we know exists to avoid 404 spam.
        const sounds = []; // ['move', 'attack', 'die', 'turn_start', 'buy', 'heal', 'summon'];
        sounds.forEach(name => {
            this.loadSound(name, `/api/public/audio/se/${name}.mp3`);
        });
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Silent fail for 404s, just use fallback
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
        } catch (e) {
            // console.warn(`Failed to load sound ${name}:`, e);
        }
    }

    playBGM(name) {
        if (!this.enabled || !this.context) return;
        if (this.bgm) {
            this.bgm.stop();
            this.bgm = null;
        }

        const url = `/api/public/audio/music/${name}.mp3`;
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.context.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                const source = this.context.createBufferSource();
                source.buffer = audioBuffer;
                source.loop = true;
                
                const gainNode = this.context.createGain();
                gainNode.gain.value = 0.3; // Lower volume for BGM
                
                source.connect(gainNode);
                gainNode.connect(this.context.destination);
                
                source.start(0);
                this.bgm = source;
            })
            .catch(e => console.warn("Failed to play BGM", e));
    }

    init() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    play(name) {
        if (!this.enabled || !this.context) return;
        this.init();

        // Prefer loaded file if available
        if (this.sounds[name]) {
            const source = this.context.createBufferSource();
            source.buffer = this.sounds[name];
            source.connect(this.context.destination);
            source.start(0);
            return;
        }

        const t = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.context.destination);

        switch (name) {
            case 'select':
                // Fallback if prompt.mp3 not loaded
                osc.type = 'square';
                osc.frequency.setValueAtTime(880, t);
                osc.frequency.exponentialRampToValueAtTime(1760, t + 0.05);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;

            case 'move':
                // Soft footstep
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case 'attack':
                // Harsh hit
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.exponentialRampToValueAtTime(10, t + 0.15);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
                break;

            case 'die':
                // Descending slide
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0.01, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
                break;

            case 'buy':
                // Coin sound (two tones)
                this.playTone(1200, 'sine', 0.1, 0.1);
                setTimeout(() => this.playTone(1800, 'sine', 0.2, 0.1), 100);
                break;

            case 'turn_start':
                // Simple chime
                this.playTone(440, 'sine', 0.1, 0.2);
                setTimeout(() => this.playTone(554, 'sine', 0.1, 0.2), 100); // C#
                setTimeout(() => this.playTone(659, 'sine', 0.1, 0.4), 200); // E
                break;
            
            case 'heal':
                // Rising magical sound
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.linearRampToValueAtTime(800, t + 0.3);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case 'summon':
                // Dark wobble
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.linearRampToValueAtTime(120, t + 0.1);
                osc.frequency.linearRampToValueAtTime(80, t + 0.2);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;
        }
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.context) return;
        const t = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        
        osc.start(t);
        osc.stop(t + duration);
    }
}
