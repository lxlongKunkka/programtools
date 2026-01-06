import { TILE_SIZE, TERRAIN_COLORS, TERRAIN, TERRAIN_SPRITES } from './constants.js';
import tilesData from './tiles.json';

const W = 0; // Water
const L = 1; // Land
const N = -1; // Any

// 3x3 Matrix Patterns
// Indices:
// 0 1 2
// 3 4 5
// 6 7 8
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
    // Only check these if main sides are Water
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

export class Grid {
  constructor(width, height, mapData) {
    this.width = width;
    this.height = height;
    this.mapData = mapData; // 2D array [y][x]
    this.atlasImages = null; // Will be injected
  }

  setAtlasImages(images) {
      this.atlasImages = images;
  }

  draw(ctx, gameState) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const terrain = this.mapData[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // Check for building ownership
        let team = null;
        if (gameState) {
            const building = gameState.getBuildingAt(x, y);
            if (building) {
                team = building.team;
            }
        }

        this.drawTile(ctx, terrain, px, py, team);

        // Draw grid lines (subtle)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  drawTile(ctx, terrain, x, y, team = null) {
      // Auto-tiling for Water
      let spriteName = TERRAIN_SPRITES[terrain];
      
      // Check if this is a water tile (generic or specific edge)
      // We treat any tile that maps to a water sprite or is generic WATER as a candidate for auto-tiling
      // But we only auto-tile if it's generic WATER (3) OR one of the specific edge tiles we want to override
      // Actually, let's just check if it's "Water-like"
      // const isWaterTile = this.isWater(terrain);
      
      // FIX: Only auto-tile generic water. Specific water tiles (like t73) should be rendered as is.
      const isGenericWater = terrain === TERRAIN.WATER || terrain === TERRAIN.WATER_SHIMMER || terrain === TERRAIN.WATER_SHIMMER_2;

      if (isGenericWater) {
          // Calculate auto-tiled sprite based on neighbors
          const gridX = x / TILE_SIZE;
          const gridY = y / TILE_SIZE;
          const autoSprite = this.getAutoTiledWaterSprite(gridX, gridY);
          if (autoSprite) {
              // If auto-tiling returns generic sea ('t0'), but we have a specific variant (like shimmer), keep the variant
              if (autoSprite === 't0' && (terrain === TERRAIN.WATER_SHIMMER || terrain === TERRAIN.WATER_SHIMMER_2)) {
                  // Keep original spriteName (t1 or t2)
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
          
          // Debug log for specific tile to avoid spam
          if (x === 2 && y === 6) {
             // console.log(`[Grid Debug (2,6)] Colored Sprite: ${spriteName}, ImageExists: ${!!(this.atlasImages && this.atlasImages[spriteName])}`);
          }
      }

      if (spriteName && this.atlasImages && this.atlasImages[spriteName] && this.atlasImages[spriteName].complete) {
          const img = this.atlasImages[spriteName];
          
          // Disable smoothing for pixel art
          const oldSmoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          
          ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
          
          ctx.imageSmoothingEnabled = oldSmoothing;
          return;
      }

      // Fallback: If specific team sprite is missing (e.g. t37_blue), try base sprite (t37) if team is blue
      // This ensures that even if the explicit _blue mapping is missing, we use the default (which is blue)
      if (team === 'blue' && spriteName && spriteName.endsWith('_blue')) {
          const baseName = spriteName.replace('_blue', '');
          // Check if baseName is valid (t36 or t37)
          if (baseName === 't36' || baseName === 't37') {
              // Try to use the base image directly if available
              if (this.atlasImages && this.atlasImages[baseName] && this.atlasImages[baseName].complete) {
                  const img = this.atlasImages[baseName];
                  const oldSmoothing = ctx.imageSmoothingEnabled;
                  ctx.imageSmoothingEnabled = false;
                  ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
                  
                  ctx.imageSmoothingEnabled = oldSmoothing;
                  return;
              }
          }
      }

      // Fallback to procedural drawing
      // Base background
      ctx.fillStyle = TERRAIN_COLORS[terrain] || '#000000';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      // Detail drawing
      switch (terrain) {
          case TERRAIN.PLAIN:
              this.drawPlain(ctx, x, y);
              break;
          case TERRAIN.FOREST:
              this.drawForest(ctx, x, y);
              break;
          case TERRAIN.MOUNTAIN:
              this.drawMountain(ctx, x, y);
              break;
          case TERRAIN.WATER:
              this.drawWater(ctx, x, y);
              break;
          case TERRAIN.CASTLE:
              this.drawCastle(ctx, x, y);
              break;
          case TERRAIN.VILLAGE:
              this.drawVillage(ctx, x, y);
              break;
      }
  }


  drawPlain(ctx, x, y) {
      // Add some grass texture
      ctx.fillStyle = '#7CFC00'; // Lawn Green
      for(let i=0; i<3; i++) {
          const rx = x + Math.random() * TILE_SIZE;
          const ry = y + Math.random() * TILE_SIZE;
          ctx.fillRect(rx, ry, 2, 2);
      }
  }

  drawForest(ctx, x, y) {
      // Draw trees
      ctx.fillStyle = '#006400'; // Dark Green
      
      // Tree 1
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE*0.3, y + TILE_SIZE*0.4, TILE_SIZE*0.2, 0, Math.PI*2);
      ctx.fill();

      // Tree 2
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE*0.7, y + TILE_SIZE*0.6, TILE_SIZE*0.25, 0, Math.PI*2);
      ctx.fill();
      
      // Tree 3
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE*0.4, y + TILE_SIZE*0.8, TILE_SIZE*0.15, 0, Math.PI*2);
      ctx.fill();
  }

  drawMountain(ctx, x, y) {
      // Draw peaks
      ctx.fillStyle = '#696969'; // Dim Gray
      
      // Peak 1
      ctx.beginPath();
      ctx.moveTo(x + TILE_SIZE*0.2, y + TILE_SIZE);
      ctx.lineTo(x + TILE_SIZE*0.5, y + TILE_SIZE*0.2);
      ctx.lineTo(x + TILE_SIZE*0.8, y + TILE_SIZE);
      ctx.fill();
      
      // Snow cap
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x + TILE_SIZE*0.4, y + TILE_SIZE*0.46);
      ctx.lineTo(x + TILE_SIZE*0.5, y + TILE_SIZE*0.2);
      ctx.lineTo(x + TILE_SIZE*0.6, y + TILE_SIZE*0.46);
      ctx.fill();
  }

  drawWater(ctx, x, y) {
      // Draw waves
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 15);
      ctx.quadraticCurveTo(x + 15, y + 5, x + 25, y + 15);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 20, y + 35);
      ctx.quadraticCurveTo(x + 30, y + 25, x + 40, y + 35);
      ctx.stroke();
  }

  drawCastle(ctx, x, y) {
      // Draw castle walls
      ctx.fillStyle = '#A0522D'; // Sienna
      const pad = 5;
      ctx.fillRect(x + pad, y + pad, TILE_SIZE - pad*2, TILE_SIZE - pad*2);
      
      // Battlements
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + pad, y + pad, 8, 8);
      ctx.fillRect(x + TILE_SIZE - pad - 8, y + pad, 8, 8);
      ctx.fillRect(x + pad, y + TILE_SIZE - pad - 8, 8, 8);
      ctx.fillRect(x + TILE_SIZE - pad - 8, y + TILE_SIZE - pad - 8, 8, 8);
      
      // Door
      ctx.fillStyle = '#000';
      ctx.fillRect(x + TILE_SIZE/2 - 6, y + TILE_SIZE - pad - 12, 12, 12);
  }

  drawVillage(ctx, x, y) {
      // Draw small houses
      ctx.fillStyle = '#DEB887'; // Burlywood
      
      // House 1
      ctx.fillRect(x + 5, y + 15, 15, 15);
      // Roof 1
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 15);
      ctx.lineTo(x + 12.5, y + 5);
      ctx.lineTo(x + 20, y + 15);
      ctx.fill();

      // House 2
      ctx.fillStyle = '#DEB887';
      ctx.fillRect(x + 25, y + 20, 15, 15);
      // Roof 2
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.moveTo(x + 25, y + 20);
      ctx.lineTo(x + 32.5, y + 10);
      ctx.lineTo(x + 40, y + 20);
      ctx.fill();
  }

  isWater(terrain) {
      // Use tiles.json data to determine if tile is water (type 1)
      if (tilesData[terrain]) {
          return tilesData[terrain].type === 1;
      }
      // Fallback if data missing (should not happen)
      return terrain === TERRAIN.WATER;
  }

  isLand(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false; // Treat out of bounds as Water to allow open edges
      const terrain = this.mapData[y][x];
      
      // Check tiles.json for type
      if (tilesData[terrain]) {
          // Type 0 (Plain), 2 (Forest), 3 (Mountain) are Land.
          // Type 1 is Water.
          // Bridges (type 1) are water-like for tiling?
          // In original code: bridges are NOT land (so they are water-like).
          // Let's check bridge type in tiles.json.
          // ID 28 (Bridge H) -> Type 1 (Water).
          // So !isWater(terrain) would return false for Bridge, meaning it is NOT Land.
          // This matches original logic: return !this.isWater(terrain) && ...
          
          // However, Reefs (81, 82) are Type 1 (Water).
          // Original code: if (Reef) return false; (Not Land -> Water-like).
          // So if isWater returns true for Reef, then !isWater is false. Correct.
          
          return !this.isWater(terrain);
      }
      
      return !this.isWater(terrain);
  }

  getAutoTiledWaterSprite(x, y) {
      // Construct 3x3 grid of neighbors
      // 0 1 2
      // 3 4 5
      // 6 7 8
      const grid = new Array(9).fill(W);
      
      const offsets = [
          [-1, -1], [0, -1], [1, -1],
          [-1, 0],  [0, 0],  [1, 0],
          [-1, 1],  [0, 1],  [1, 1]
      ];

      for (let i = 0; i < 9; i++) {
          const nx = x + offsets[i][0];
          const ny = y + offsets[i][1];
          if (this.isLand(nx, ny)) {
              grid[i] = L;
          } else {
              grid[i] = W;
          }
      }

      // Match against patterns
      for (const pattern of WATER_PATTERNS) {
          let match = true;
          for (let i = 0; i < 9; i++) {
              // N matches anything (-1)
              // Otherwise, grid value must match pattern value
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

  // Convert screen coordinates (relative to canvas) to grid coordinates
  getGridFromScreen(screenX, screenY) {
    const gridX = Math.floor(screenX / TILE_SIZE);
    const gridY = Math.floor(screenY / TILE_SIZE);

    if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
      return { x: gridX, y: gridY };
    }
    return null;
  }

  getTerrainAt(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.mapData[y][x];
    }
    return null;
  }
}
