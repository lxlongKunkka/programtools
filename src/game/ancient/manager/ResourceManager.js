// ResourceManager.js for web
// Loads all images used by the game.

export default class ResourceManager {
    constructor() {
        this.basePath = '/sprites_atlas/';
        this.images = {};
        this.loaded = false;
        this.onLoadComplete = null;
    }

    async prepare() {
        const imageList = [
            'alpha.png',
            'arrows.png', 
            'border.png',
            'chars_large.png',
            'chars_small.png',
            'circle_large.png', // circle_big in java
            'circle_small.png',
            'cursor_attack.png',
            'cursor_normal.png',
            'cursor_target.png', // cursor_move_target in java
            'dust.png',
            'heads.png',
            'icons_action.png',
            'icons_arrow.png', // Wait, duplicated in list? arrows vs icons_arrow? 
            // Java uses "icons_arrow.png", my dir has "arrows.png" AND "icons_arrow.png". 
            // Let's load the java-named ones first if they exist.
            
            'icons_info_battle.png', // icons_hud_battle
            'icons_info_general.png', // icons_hud_status
            'icons_menu.png', // icons_main_menu
            'level.png',
            'smoke.png',
            'spark_attack.png',
            'spark_white.png',
            'status.png',
            'tombstone.png',
            'title.png',
            'unit_sheet_0.png',
            'unit_sheet_1.png',
            'unit_sheet_2.png',
            'unit_sheet_3.png'
        ];

        // Load Tiles t0..t88 (Tile count)
        // Actually java uses "images/tiles/tile_" + i + ".png"
        // My folder has t0.png...t88.png
        // I need to map these names.
        
        // Load TopTiles tt0.png
        
        // Load fonts? Canvas uses CSS fonts. 
        
        const promises = imageList.map(name => this.loadImage(name));
        
        // Tiles
        for (let i = 0; i <= 88; i++) {
            promises.push(this.loadImage(`t${i}.png`, `tile_${i}`));
        }
        
        // Top Tiles
        // Only tt0 seen in dir?
        promises.push(this.loadImage('tt0.png', 'top_tile_0'));

        await Promise.all(promises);
        this.loaded = true;
        if (this.onLoadComplete) this.onLoadComplete();
        console.log("Resources loaded");
    }

    loadImage(filename, alias) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = this.basePath + filename;
            img.onload = () => {
                this.images[alias || filename] = img;
                resolve(img);
            };
            img.onerror = (e) => {
                console.error(`Failed to load image: ${filename}`);
                // Resolve anyway to not block game, maybe with placeholder?
                // resolve(null);
                // Better to fail?
                resolve(null); 
            };
        });
    }

    get(name) {
        return this.images[name];
    }
    
    // Java-like getters mapping to my loaded aliases
    
    getTileTexture(index) {
        return this.get(`tile_${index}`);
    }
    
    getTopTileTexture(index) {
        return this.get(`top_tile_${index}`);
    }
    
    getUnitTexture(team, unitIndex, frame) {
        // Java: unit_sheet_{team}.png contains all units.
        // I need to know the grid size.
        // Assuming unit sheet is grid of units.
        // frame 0/1.
        // Java code: getUnitTexture(team, index, frame)
        // returns a TextureRegion.
        // I need to return source coordinates?
        // Or simple object { img, x, y, width, height }
        
        // I'll return the full sheet and let renderer handle crop, 
        // OR return a "Region" object.
        const sheet = this.get(`unit_sheet_${team}.png`);
        if (!sheet) return null;
        
        const TS = 24; // Standard tile size in retro games, check java TS?
        // Java CanvasRenderer calls "ts()", context.getTileSize().
        // AEII usually 24x24 based?
        // Let's assume 24x24 for sprite sheet grid.
        
        // The sheet structure:
        // Rows: units? Cols: frames?
        // Need to check how Java TextureRegion is constructed or check sprite sheet.
        // Assuming Standard: Unit Index (Row) * Frame (Col)?
        
        // Java ResourceManager:
        // texture_units = new TextureRegion[4][UnitFactory.getUnitCount()][2];
        // Loops to split sheet?
        // I'll implement `getUnitTexture` to return metadata for renderer.
        return {
            image: sheet,
            index: unitIndex,
            frame: frame,
            isUnit: true
        };
    }
    
    getHeadTexture(index) {
        return {
            image: this.get('heads.png'),
            index: index,
            isHead: true
        };
    }
    
    getStatusTexture(type) {
         return {
             image: this.get('status.png'),
             index: type,
             isStatus: true
         }
    }
    
    getLevelTexture(levelIndex) {
         return {
             image: this.get('level.png'),
             index: levelIndex,
             isLevel: true
         }
    }
    
    getAlphaTexture() { return this.get('alpha.png'); }
    getMovePathColor() { return this.get('alpha.png'); } // Hack, java used separate color texture or shader?
    
    getMoveTargetCursorTexture() { return this.get('cursor_target.png'); }
}

export const resources = new ResourceManager();
