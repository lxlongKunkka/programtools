import { GameCore } from './src/game/ancient/entity/GameCore.js';
import { Map } from './src/game/ancient/entity/Map.js';
import { GameManager } from './src/game/ancient/manager/GameManager.js';
import { CanvasRenderer } from './src/game/ancient/renderer/CanvasRenderer.js';
import { UnitFactory } from './src/game/ancient/utils/UnitFactory.js';
import { UNIT_TYPES, TEAMS } from './src/game/ancient/constants.js';

// Setup Canvas
const canvas = document.getElementById('gameCanvas');
// const ctx = canvas.getContext('2d'); // Renderer handles this

// 1. Create Map
const map = new Map(15, 15); // 15x15 map
// Fill with some terrain
for(let x=0; x<15; x++) {
    for(let y=0; y<15; y++) {
        map.setTile(18, x, y); // Plain
    }
}
map.setTile(1, 5, 5); // Water

// 2. Create GameCore
const gameCore = new GameCore(map, null, 1000, GameCore.SKIRMISH);
gameCore.setCurrentTeam(TEAMS.BLUE); // 0

// 3. Add Units
const soldier = UnitFactory.createUnitFromType(UNIT_TYPES.SOLDIER, TEAMS.BLUE);
soldier.x = 2;
soldier.y = 2;
map.addUnit(soldier);

const enemy = UnitFactory.createUnitFromType(UNIT_TYPES.SKELETON, TEAMS.RED);
enemy.x = 4;
enemy.y = 2;
map.addUnit(enemy);

// 4. Setup Renderer & Manager
const renderer = new CanvasRenderer(canvas, gameCore);
const gameManager = new GameManager(gameCore, renderer);

// Load images (Mocking the image loader for now)
const images = {};
// In a real app, you'd load these async
// renderer.setAtlasImages(images);

// Initial Draw
renderer.draw(map, gameManager);

console.log("Game Initialized. Click on the canvas to interact.");
