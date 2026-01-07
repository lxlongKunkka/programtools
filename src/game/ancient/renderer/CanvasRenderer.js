import { resources } from '../manager/ResourceManager.js';
import TileFactory from '../utils/TileFactory.js';
import Status from '../entity/Status.js';

export default class CanvasRenderer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.tileSize = 48; // Display size (zoomed?) Or 24?
        // Java code: ts() comes from context.
        // Let's default to 48 for screen (2x zoom from 24 px assets).
        this.scale = 2; // Asset 24 -> Screen 48
    }

    setCanvas(mapCanvas) {
        this.canvas = mapCanvas; // The logical canvas (camera)
    }
    
    // Draw methods mirroring Java structure but adapting to Canvas 2D
    
    drawTile(index, x, y) {
        // x, y are screen coordinates
        const img = resources.getTileTexture(index);
        if (img) {
            this.ctx.drawImage(img, x, y, this.tileSize, this.tileSize);
        }
    }
    
    drawUnit(unit, screen_x, screen_y) {
        const frame = this.getCurrentFrame();
        // Java: drawUnit_(batch, unit, screen_x, screen_y, frame, ts)
        
        const team = unit.getTeam();
        const index = unit.getIndex();
        const texture = resources.getUnitTexture(team, index, unit.isStandby() ? 0 : frame);
        
        if (texture && texture.image) {
            // Calculate source rect
            // Assuming 24x24 sprites in sheet
            // Sheet Layout: usually 2 frames per unit side-by-side? OR top-down?
            // "unit_sheet_0.png"
            // If I look at file list, I cannot see content.
            // But typical AE logic:
            // TextureRegion[unit_count][2] in Java implies a grid.
            // Split by rows of units, 2 columns of frames?
            
            const srcSize = 24; 
            const srcX = (unit.isStandby() ? 0 : frame) * srcSize;
            const srcY = index * srcSize;
            
            // Grayscale logic if standby?
            if (unit.isStandby()) {
                 this.ctx.filter = 'grayscale(100%)';
            }
            
            this.ctx.drawImage(texture.image, 
                srcX, srcY, srcSize, srcSize, 
                screen_x, screen_y, this.tileSize, this.tileSize);
                
            this.ctx.filter = 'none';
        }
        
        if (unit.isCommander()) {
            this.drawHead(unit.getHead(), screen_x, screen_y, unit.isStandby() ? 0 : frame);
        }
    }
    
    drawHead(head_index, screen_x, screen_y, frame) {
        // Not implemented fully yet
    }

    drawCursor(screen_x, screen_y) {
        const img = resources.get('cursor_normal.png');
        if (img) {
             this.ctx.drawImage(img, screen_x, screen_y, this.tileSize, this.tileSize);
        }
    }

    drawUnitWithInformation(unit, map_x, map_y) {
        // map_x, map_y to screen
        if (!this.canvas) return; // Need camera
        const screen_x = this.canvas.getXOnScreen(map_x);
        const screen_y = this.canvas.getYOnScreen(map_y);
        
        this.drawUnit(unit, screen_x, screen_y);
        
        // HP
        if (unit.getCurrentHp() !== unit.getMaxHp()) {
             this.drawNumber(unit.getCurrentHp(), screen_x, screen_y);
        }
        
        // Status/Level... (Simplified port)
    }
    
    drawNumber(num, x, y) {
        this.ctx.fillStyle = "white";
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        this.ctx.font = "bold 12px sans-serif";
        this.ctx.strokeText(num, x, y + this.tileSize);
        this.ctx.fillText(num, x, y + this.tileSize);
    }
    
    drawMovePath(move_path) {
        // Port logic from Java
    }
    
    drawMoveAlpha(movable_positions) {
        if (!movable_positions) return;
        const img = resources.get('alpha.png');
        if (!img) return;
        
        // Java: move_alpha = new TextureRegion(alpha_texture, size, 0, size, size);
        // alpha.png likely 2x wide? move=right half?
        // Assuming Image is 2 tiles wide: Attack|Move
        // size=height.
        const size = img.height;
        
        movable_positions.forEach(pos => {
             const sx = this.canvas.getXOnScreen(pos.x);
             const sy = this.canvas.getYOnScreen(pos.y);
             this.ctx.drawImage(img, size, 0, size, size, sx, sy, this.tileSize, this.tileSize);
        });
    }

    drawAttackAlpha(attackable_positions) {
        if (!attackable_positions) return;
        const img = resources.get('alpha.png');
        if (!img) return;
        
        const size = img.height;
        attackable_positions.forEach(pos => {
             const sx = this.canvas.getXOnScreen(pos.x);
             const sy = this.canvas.getYOnScreen(pos.y);
             this.ctx.drawImage(img, 0, 0, size, size, sx, sy, this.tileSize, this.tileSize);
        });
    }

    getCurrentFrame() {
        return Math.floor(Date.now() / 300) % 2;
    }
}
