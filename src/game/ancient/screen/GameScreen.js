// src/game/ancient/screen/GameScreen.js
import CanvasRenderer from '../renderer/CanvasRenderer.js';
import MapViewport from '../entity/MapViewport.js';
import GameCore from '../entity/GameCore.js';
import GameManager from '../manager/GameManager.js';

export default class GameScreen {
    constructor(canvasElement) {
        this.canvasElement = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // Adjust logical size?
        this.width = canvasElement.width;
        this.height = canvasElement.height;
        
        this.renderer = new CanvasRenderer(this.ctx, this.width, this.height);
        this.renderer.setCanvas(this); // Circular dependency?
        
        this.viewport = new MapViewport();
        this.viewport.x = 0;
        this.viewport.y = 0;
        this.viewport.width = this.width;
        this.viewport.height = this.height;
        
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.gameCore = null;
        this.gameManager = new GameManager();

        // Input handling
        this.cursorMapX = 0;
        this.cursorMapY = 0;
        
        this.setupInput();
    }
    
    setGameCore(gameCore) {
        this.gameCore = gameCore;
        this.gameManager.setGame(gameCore);
        // Focus on first unit or 0,0
        this.focus(0, 0, true);
    }
    
    setupInput() {
        // Basic mouse handling to update cursorMapX/Y
        this.canvasElement.addEventListener('mousemove', (e) => {
            const rect = this.canvasElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Inverse getXOnScreen
            const ts = this.ts();
            this.cursorMapX = Math.floor((mouseX + this.viewport.x - this.offsetX) / ts);
            this.cursorMapY = Math.floor((mouseY + this.viewport.y - this.offsetY) / ts);
        });

        this.canvasElement.addEventListener('mousedown', (e) => {
             if (this.gameManager) {
                 this.gameManager.onTileClicked(this.cursorMapX, this.cursorMapY);
             }
        });
    }

    render() {
        if (!this.gameCore) return;
        
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        const map = this.gameCore.getMap();
        if (!map) return;
        
        // Draw Visible Map Area
        // Loop map x,y
        const startX = Math.floor(this.viewport.x / this.ts());
        const startY = Math.floor(this.viewport.y / this.ts());
        const endX = startX + Math.ceil(this.viewport.width / this.ts()) + 1;
        const endY = startY + Math.ceil(this.viewport.height / this.ts()) + 1;
        
        // Draw Tiles - Bottom Layer
        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                if (map.isWithinMap(x, y)) {
                    const screenX = this.getXOnScreen(x);
                    const screenY = this.getYOnScreen(y);
                    this.renderer.drawTile(map.getTileIndex(x, y), screenX, screenY);
                    
                    const topIndex = map.getTile(x, y).getTopTileIndex();
                    if (topIndex !== -1) {
                         // this.renderer.drawTopTile(topIndex, screenX, screenY);
                    }
                }
            }
        }
        
        // Draw Move Range (Alpha)
        if (this.gameManager) {
            this.renderer.drawMoveAlpha(this.gameManager.getMovablePositions());
            this.renderer.drawAttackAlpha(this.gameManager.getAttackablePositions());
        }
        
        // Draw Units

        // Java: drawUnits(); loops all units.
        // Optimization: loop only visible units or map spatial hash.
        // For now, iterate all units in map (or upper layer).
        // Map.getUnits() returns Iterable via Map.values() in JS port?
        // JS Map: map.units.values()
        
        const units = Array.from(map.getUnits()); // Array from iterator
        units.sort((a, b) => a.getY() - b.getY()); // Y-sort for depth
        
        units.forEach(unit => {
            // Check visibility?
            if (unit && !unit.isStandby()) { // Standby units drawn differently?
                 this.renderer.drawUnit(unit, this.getXOnScreen(unit.getX()), this.getYOnScreen(unit.getY()));
            }
        });
        
        // Draw Top Layer Units?
        // Map has upper_unit_layer.
        // Java iterates both?
        
        // Draw Cursor
        const cx = this.getXOnScreen(this.cursorMapX);
        const cy = this.getYOnScreen(this.cursorMapY);
        this.renderer.drawCursor(cx, cy);
    }
    
    // MapCanvas Interace Impl
    getMap() { return this.gameCore.getMap(); }
    getRenderer() { return this.renderer; }
    
    focus(map_x, map_y, focus_viewport) {
        if (!this.gameCore) return;
        // Center viewport on map_x, map_y
        this.viewport.x = map_x * this.ts() - this.viewport.width / 2;
        this.viewport.y = map_y * this.ts() - this.viewport.height / 2;
        // Clamp
        if (this.viewport.x < 0) this.viewport.x = 0;
        if (this.viewport.y < 0) this.viewport.y = 0;
        
        // Max bounds?
        const mapW = this.gameCore.getMap().getWidth() * this.ts();
        const mapH = this.gameCore.getMap().getHeight() * this.ts();
        
        if (this.viewport.x > mapW - this.viewport.width) this.viewport.x = mapW - this.viewport.width;
        if (this.viewport.y > mapH - this.viewport.height) this.viewport.y = mapH - this.viewport.height;
    }

    isWithinPaintArea(sx, sy) {
        return sx >= -this.ts() && sx <= this.viewport.width && sy >= -this.ts() && sy <= this.viewport.height;
    }

    getViewportWidth() { return this.viewport.width; }
    getViewportHeight() { return this.viewport.height; }

    getXOnScreen(map_x) {
        return map_x * this.ts() - this.viewport.x + this.offsetX;
    }

    getYOnScreen(map_y) {
        return map_y * this.ts() - this.viewport.y + this.offsetY;
    }

    getCursorMapX() { return this.cursorMapX; }
    getCursorMapY() { return this.cursorMapY; }

    setOffsetX(offset_x) { this.offsetX = offset_x; }
    setOffsetY(offset_y) { this.offsetY = offset_y; }

    ts() { return this.renderer.tileSize; }
}
