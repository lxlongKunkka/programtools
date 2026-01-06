import { TILE_SIZE, TERRAIN_COLORS, TERRAIN, TERRAIN_SPRITES, UNIT_STATS } from '../constants.js';
import tilesData from '../tiles.json';

const W = 0; // Water
const L = 1; // Land
const N = -1; // Any

// 3x3 Matrix Patterns
const WATER_PATTERNS = [
    // --- Complex / Mixed Cases (Check these first) ---
    { id: 't49', grid: [N,L,N, W,W,W, L,W,L] }, // Top + BL + BR
    { id: 't54', grid: [N,L,N, W,W,W, L,W,W] }, // Top + BL
    { id: 't53', grid: [N,L,N, W,W,W, W,W,L] }, // Top + BR
    
    { id: 't50', grid: [L,W,L, W,W,W, N,L,N] }, // Bottom + TL + TR
    { id: 't55', grid: [L,W,W, W,W,W, N,L,N] }, // Bottom + TL
    { id: 't56', grid: [W,W,L, W,W,W, N,L,N] }, // Bottom + TR
    
    { id: 't51', grid: [L,W,W, W,W,L, L,W,W] }, // Right + TL + BL
    { id: 't57', grid: [L,W,W, W,W,L, W,W,W] }, // Right + TL
    { id: 't58', grid: [W,W,W, W,W,L, L,W,W] }, // Right + BL
    
    { id: 't52', grid: [W,W,L, L,W,W, W,W,L] }, // Left + TR + BR
    { id: 't59', grid: [W,W,L, L,W,W, W,W,W] }, // Left + TR
    { id: 't60', grid: [W,W,W, L,W,W, W,W,L] }, // Left + BR

    // --- Canals & T-Junctions & Crosses ---
    { id: 't71', grid: [N,L,N, L,W,L, N,L,N] }, // All 4 sides (Lake)
    { id: 't69', grid: [N,L,N, L,W,L, W,W,W] }, // Top + Left + Right
    { id: 't67', grid: [N,L,N, W,W,L, N,L,N] }, // Top + Bottom + Right
    { id: 't68', grid: [N,L,N, L,W,W, N,L,N] }, // Top + Bottom + Left
    { id: 't70', grid: [W,W,W, L,W,L, N,L,N] }, // Bottom + Left + Right
    
    { id: 't65', grid: [N,L,N, W,W,W, N,L,N] }, // Top + Bottom (Vertical Canal)
    { id: 't66', grid: [W,W,W, L,W,L, W,W,W] }, // Left + Right (Horizontal Canal)

    // --- Inner Corners ---
    { id: 't13', grid: [N,L,N, W,W,L, W,W,W] }, // Top + Right
    { id: 't4',  grid: [W,W,W, W,W,L, N,L,N] }, // Bottom + Right
    { id: 't8',  grid: [W,W,W, L,W,W, N,L,N] }, // Bottom + Left
    { id: 't14', grid: [N,L,N, L,W,W, W,W,W] }, // Top + Left

    // --- Basic Sides ---
    { id: 't11', grid: [N,L,N, W,W,W, W,W,W] }, // Top
    { id: 't3',  grid: [W,W,N, W,W,L, W,W,N] }, // Right
    { id: 't6',  grid: [W,W,W, W,W,W, N,L,N] }, // Bottom
    { id: 't9',  grid: [N,W,W, L,W,W, N,W,W] }, // Left

    // --- Outer Corners (Diagonals) ---
    { id: 't48', grid: [L,W,L, W,W,W, L,W,L] }, // All 4 corners
    { id: 't45', grid: [L,W,L, W,W,W, W,W,L] }, // TL + TR + BR
    { id: 't47', grid: [L,W,W, W,W,W, L,W,L] }, // TL + BR + BL
    { id: 't46', grid: [W,W,L, W,W,W, L,W,L] }, // TR + BR + BL
    { id: 't44', grid: [L,W,L, W,W,W, L,W,W] }, // TL + TR + BL
    
    { id: 't41', grid: [L,W,L, W,W,W, W,W,W] }, // TL + TR
    { id: 't42', grid: [L,W,W, W,W,W, W,W,L] }, // TL + BR
    { id: 't38', grid: [L,W,W, W,W,W, L,W,W] }, // TL + BL
    { id: 't40', grid: [W,W,L, W,W,W, W,W,L] }, // TR + BR
    { id: 't43', grid: [W,W,L, W,W,W, L,W,W] }, // TR + BL
    { id: 't39', grid: [W,W,W, W,W,W, L,W,L] }, // BR + BL

    { id: 't12', grid: [L,W,W, W,W,W, W,W,W] }, // TL
    { id: 't10', grid: [W,W,L, W,W,W, W,W,W] }, // TR
    { id: 't5',  grid: [W,W,W, W,W,W, W,W,L] }, // BR
    { id: 't7',  grid: [W,W,W, W,W,W, L,W,W] }, // BL

    // --- Default ---
    { id: 't0',  grid: [W,W,W, W,W,W, W,W,W] }  // Sea
];

export class CanvasRenderer {
    constructor(canvas, gameContext) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameContext = gameContext;
        this.tileSize = TILE_SIZE;
        this.atlasImages = null;
    }

    setAtlasImages(images) {
        this.atlasImages = images;
    }

    setTileSize(size) {
        this.tileSize = size;
    }

    draw(map, gameState) {
        const width = map.getWidth();
        const height = map.getHeight();
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Note: Map.js uses [x][y]
                const terrain = map.map_data[x][y];
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                // Check for building ownership
                let team = null;
                // if (gameState) ...

                this.drawTile(this.ctx, map, terrain, x, y, team);

                // Draw grid lines (subtle)
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            }
        }

        // Draw Highlights (Move/Attack)
        if (gameState) { // gameState here is actually GameManager instance based on my update
             if (gameState.movablePositions) {
                 this.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'; // Blue for move
                 for (const pos of gameState.movablePositions) {
                     this.ctx.fillRect(pos.x * this.tileSize, pos.y * this.tileSize, this.tileSize, this.tileSize);
                 }
             }
             if (gameState.attackablePositions) {
                 // Use different color for HEAL state if needed, but red is fine for "target"
                 // Or check gameState.state
                 if (gameState.state === 7) { // STATE_HEAL
                     this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Green for heal
                 } else {
                     this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Red for attack
                 }
                 for (const pos of gameState.attackablePositions) {
                     this.ctx.fillRect(pos.x * this.tileSize, pos.y * this.tileSize, this.tileSize, this.tileSize);
                 }
             }
        }

        // Draw units
        if (map.units) {
            for (const [pos, unit] of map.units) {
                this.drawUnit(unit, unit.x, unit.y);
            }
        }
    }

        // Draw tombs
        if (map.tombs) {
            for (const tomb of map.tombs) {
                this.drawTomb(tomb);
            }
        }

        // Draw units
        if (map.units) {
            for (const [pos, unit] of map.units) {
                this.drawUnit(unit, unit.x, unit.y);
            }
        }

        // Draw Damage Preview
        if (gameState && gameState.previewDamage !== null && gameState.previewTarget) {
            const target = gameState.previewTarget;
            const px = target.x * this.tileSize;
            const py = target.y * this.tileSize;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(px, py - 20, this.tileSize, 20);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`-${gameState.previewDamage}`, px + this.tileSize / 2, py - 5);
        }
    }

    drawTomb(tomb) {
        const img = this.atlasImages['tombstone'];
        if (img) {
            const px = tomb.x * this.tileSize;
            const py = tomb.y * this.tileSize;
            this.ctx.drawImage(img, px, py, this.tileSize, this.tileSize);
        }
    }

    drawUnit(unit, mapX, mapY) {
        const stats = UNIT_STATS[unit.type];
        if (!stats) return;

        const spriteBase = stats.spriteAtlas; // e.g. 'u0'
        // Assuming sprite names are like 'u0_blue', 'u0_red'
        // We need to map team ID to string if needed, or assume team is stored as string 'blue'/'red'
        // In Unit.js, team is passed. In constants.js TEAMS are 0, 1, 2, 3.
        // We need a mapping from team ID to color string if the atlas uses strings.
        // Let's assume atlas uses 'blue', 'red', 'green', 'black' for teams 0, 1, 2, 3.
        
        const teamColors = ['blue', 'red', 'green', 'black'];
        const teamColor = teamColors[unit.team] || 'blue';
        const spriteName = `${spriteBase}_${teamColor}`;

        // Use interpolated pixel coordinates if available, otherwise grid coordinates
        let x, y;
        if (unit.pixelX !== undefined && unit.pixelY !== undefined) {
            x = unit.pixelX;
            y = unit.pixelY;
        } else {
            x = mapX * this.tileSize;
            y = mapY * this.tileSize;
        }
        
        // Apply animation offset (e.g. attack bump)
        if (unit.animOffsetX) x += unit.animOffsetX;
        if (unit.animOffsetY) y += unit.animOffsetY;

        if (this.atlasImages && this.atlasImages[spriteName] && this.atlasImages[spriteName].complete) {
            const img = this.atlasImages[spriteName];
            
            const oldSmoothing = this.ctx.imageSmoothingEnabled;
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(img, x, y, this.tileSize, this.tileSize);
            this.ctx.imageSmoothingEnabled = oldSmoothing;
            
            // Draw health bar if damaged
            if (unit.hp < unit.maxHp) {
                this.drawHealthBar(x, y, unit.hp, unit.maxHp);
            }
            
            // Draw "Done" overlay (grayed out)
            if (unit.state === 'done') {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
            }
        } else {
            // Fallback: Draw a colored circle/square
            this.ctx.fillStyle = teamColor;
            this.ctx.beginPath();
            this.ctx.arc(x + this.tileSize/2, y + this.tileSize/2, this.tileSize/3, 0, Math.PI*2);
            this.ctx.fill();
            
            // Draw symbol
            if (stats.symbol) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(stats.symbol, x + this.tileSize/2, y + this.tileSize/2);
            }
        }
    }

    drawHealthBar(x, y, hp, maxHp) {
        const width = this.tileSize - 4;
        const height = 4;
        const pct = Math.max(0, hp / maxHp);
        
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(x + 2, y + this.tileSize - 6, width, height);
        
        this.ctx.fillStyle = 'lime';
        this.ctx.fillRect(x + 2, y + this.tileSize - 6, width * pct, height);
        
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 2, y + this.tileSize - 6, width, height);
    }

    drawTile(ctx, map, terrain, x, y, team = null) {
        let spriteName = TERRAIN_SPRITES[terrain];
        
        const isGenericWater = terrain === TERRAIN.WATER || terrain === TERRAIN.WATER_SHIMMER || terrain === TERRAIN.WATER_SHIMMER_2;

        if (isGenericWater) {
            const autoSprite = this.getAutoTiledWaterSprite(map, x, y);
            if (autoSprite) {
                if (autoSprite === 't0' && (terrain === TERRAIN.WATER_SHIMMER || terrain === TERRAIN.WATER_SHIMMER_2)) {
                    // Keep original spriteName
                } else {
                    spriteName = autoSprite;
                }
            }
        }

        // Handle colored buildings
        if (spriteName === 't37' || spriteName === 't36') {
            if (team) {
                spriteName = `${spriteName}_${team}`;
            } else {
                spriteName = `${spriteName}_neutral`;
            }
        }

        if (spriteName && this.atlasImages && this.atlasImages[spriteName] && this.atlasImages[spriteName].complete) {
            const img = this.atlasImages[spriteName];
            const oldSmoothing = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            ctx.imageSmoothingEnabled = oldSmoothing;
            return;
        }

        // Fallback logic
        if (team === 'blue' && spriteName && spriteName.endsWith('_blue')) {
            const baseName = spriteName.replace('_blue', '');
            if (baseName === 't36' || baseName === 't37') {
                if (this.atlasImages && this.atlasImages[baseName] && this.atlasImages[baseName].complete) {
                    const img = this.atlasImages[baseName];
                    const oldSmoothing = ctx.imageSmoothingEnabled;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(img, x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                    ctx.imageSmoothingEnabled = oldSmoothing;
                    return;
                }
            }
        }

        // Procedural fallback
        ctx.fillStyle = TERRAIN_COLORS[terrain] || '#000000';
        ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        
        // Call procedural drawers if needed (omitted for brevity, can be copied if needed)
    }

    isWater(terrain) {
        if (tilesData[terrain]) {
            return tilesData[terrain].type === 1;
        }
        return terrain === TERRAIN.WATER;
    }

    isLand(map, x, y) {
        if (!map.isValid(x, y)) return false; // Out of bounds is Water
        const terrain = map.map_data[x][y];
        if (tilesData[terrain]) {
            return !this.isWater(terrain);
        }
        return !this.isWater(terrain);
    }

    getAutoTiledWaterSprite(map, x, y) {
        const grid = new Array(9).fill(W);
        const offsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],  [0, 0],  [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];

        for (let i = 0; i < 9; i++) {
            const nx = x + offsets[i][0];
            const ny = y + offsets[i][1];
            if (this.isLand(map, nx, ny)) {
                grid[i] = L;
            } else {
                grid[i] = W;
            }
        }

        for (const pattern of WATER_PATTERNS) {
            let match = true;
            for (let i = 0; i < 9; i++) {
                if (pattern.grid[i] !== N && pattern.grid[i] !== grid[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return pattern.id;
            }
        }

        return 't0';
    }
}
