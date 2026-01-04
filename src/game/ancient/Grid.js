import { TILE_SIZE, TERRAIN_COLORS, TERRAIN, TERRAIN_SPRITES } from './constants.js';

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

      // Try to draw sprite first
      let spriteName = TERRAIN_SPRITES[terrain];
      
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
