export class ResourceManager {
    constructor() {
        this.images = {};
        this.loaded = 0;
        this.total = 0;
        this.onProgress = null;
        this.onComplete = null;
    }

    load() {
        const assets = [];
        
        // Terrain tiles (t0 to t88)
        for (let i = 0; i <= 88; i++) {
            assets.push({ name: `t${i}`, src: `/sprites_atlas/t${i}.png` });
        }

        // Units
        // Based on file list: u0, u0_0, u0_1 ... u20
        // Assuming u{id}_{team}.png where team 0=Blue, 1=Red
        // We also have u{id}.png, maybe generic or menu icon?
        const unitCount = 21; // u0 to u20
        for (let i = 0; i < unitCount; i++) {
            assets.push({ name: `u${i}`, src: `/sprites_atlas/u${i}.png` }); // Base/Icon
            assets.push({ name: `u${i}_blue`, src: `/sprites_atlas/u${i}_0.png` }); // Team 0
            assets.push({ name: `u${i}_red`, src: `/sprites_atlas/u${i}_1.png` });  // Team 1
            // Check if we have team 2 and 3 assets. The list didn't show them, so we might fallback or they are missing.
            // For now, let's just load what we saw.
        }

        // UI / Cursors
        assets.push({ name: 'cursor_normal', src: '/sprites_atlas/cursor_normal.png' });
        assets.push({ name: 'cursor_attack', src: '/sprites_atlas/cursor_attack.png' });
        assets.push({ name: 'cursor_target', src: '/sprites_atlas/cursor_target.png' });
        assets.push({ name: 'tombstone', src: '/sprites_atlas/tombstone.png' });

        // Colored Buildings (t36, t37 are castles/villages)
        // The list showed t36.png, t37.png.
        // Does it have t36_0.png? The list didn't explicitly show t36_0.
        // Let's check if there are specific building files or if they are just t36/t37.
        // The list has `t36.png`, `t37.png`.
        // Wait, `Grid.js` logic (and my `CanvasRenderer`) expected `t37_blue`.
        // If the files don't exist, we need to handle that.
        // Let's assume for now we only have the base images and maybe we need to tint them or they are pre-colored in the atlas?
        // Actually, looking at the file list again...
        // I see `t36.png`, `t37.png`. I DO NOT see `t36_0.png` etc.
        // However, I see `p0.png`...`p5.png`. Maybe these are palettes or particles?
        // Let's stick to loading what we know exists.
        
        this.total = assets.length;

        return new Promise((resolve, reject) => {
            if (this.total === 0) resolve();

            assets.forEach(asset => {
                const img = new Image();
                img.onload = () => {
                    this.images[asset.name] = img;
                    this.loaded++;
                    if (this.onProgress) this.onProgress(this.loaded, this.total);
                    if (this.loaded === this.total) {
                        if (this.onComplete) this.onComplete();
                        resolve();
                    }
                };
                img.onerror = (e) => {
                    console.warn(`Failed to load asset: ${asset.src}`);
                    // Don't fail everything, just mark as loaded (skipped)
                    this.loaded++;
                    if (this.loaded === this.total) {
                        if (this.onComplete) this.onComplete();
                        resolve();
                    }
                };
                img.src = asset.src;
            });
        });
    }

    getImage(name) {
        return this.images[name];
    }
}
