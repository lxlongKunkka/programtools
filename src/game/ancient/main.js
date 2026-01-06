import { GameCore } from './entity/GameCore.js';
import { Map } from './entity/Map.js';
import { Unit } from './entity/Unit.js';
import { CanvasRenderer } from './renderer/CanvasRenderer.js';
import { GameManager } from './manager/GameManager.js';
import { ResourceManager } from './manager/ResourceManager.js';
import { UIManager } from './manager/UIManager.js';
import { SoundManager } from './manager/SoundManager.js';
import { StartScreen } from './ui/StartScreen.js';
import { RecruitmentMenu } from './ui/RecruitmentMenu.js';
import { MapLoader } from './utils/MapLoader.js';
import { AI } from './AI.js';
import { TileFactory } from './utils/TileFactory.js';
import { TILE_SIZE, UNIT_TYPES } from './constants.js';

import { UnitFactory } from './utils/UnitFactory.js';

async function initGame() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }

    // Initialize TileFactory
    TileFactory.init();

    // Initialize Resource Manager
    const resourceManager = new ResourceManager();
    
    // Show loading status
    const loadingDiv = document.getElementById('loading');
    resourceManager.onProgress = (loaded, total) => {
        if (loadingDiv) loadingDiv.innerText = `Loading assets... ${loaded}/${total}`;
    };

    await resourceManager.load();
    if (loadingDiv) loadingDiv.style.display = 'none';

    // Load Map
    let map;
    try {
        map = await MapLoader.load('/temp_duel.aem');
        console.log('Map loaded successfully');
    } catch (e) {
        console.error('Failed to load map, falling back to generated map', e);
        map = new Map(20, 15);
        for (let x = 0; x < 20; x++) {
            for (let y = 0; y < 15; y++) {
                map.setTile(1, x, y); // Land (1)
            }
        }
        // Add some water/features
        map.setTile(0, 5, 5);
        map.setTile(0, 5, 6);
        map.setTile(0, 6, 5);
        map.setTile(2, 8, 8); // Forest? Check constants.
        map.setTile(3, 9, 8); // Mountain?
        
        // Add some units for testing
        // Team 0 (Blue)
        map.addUnit(new Unit(UNIT_TYPES.SOLDIER, 0, 3, 3));
        map.addUnit(new Unit(UNIT_TYPES.ARCHER, 0, 4, 3));
        
        // Team 1 (Red)
        map.addUnit(new Unit(UNIT_TYPES.SOLDIER, 1, 10, 3));
        map.addUnit(new Unit(UNIT_TYPES.ARCHER, 1, 11, 3));
        map.addUnit(new Unit(UNIT_TYPES.WOLF, 1, 10, 5));
    }

    const gameCore = new GameCore(map);
    // Set initial team
    gameCore.current_team = 0;

    const renderer = new CanvasRenderer(canvas, gameCore);
    renderer.setAtlasImages(resourceManager.images);

    const soundManager = new SoundManager();
    // soundManager.playMusic('/audio/music/main_theme.mp3'); // Optional: Play theme on start

    const recruitmentMenu = new RecruitmentMenu(gameCore, renderer, (type, cost) => {
        const player = gameCore.players[gameCore.current_team];
        if (player.gold >= cost) {
            player.gold -= cost;
            
            // Spawn Unit
            const pos = recruitmentMenu.castlePos;
            const unit = UnitFactory.createUnitFromType(type, gameCore.current_team);
            unit.x = pos.x;
            unit.y = pos.y;
            unit.pixelX = pos.x * TILE_SIZE;
            unit.pixelY = pos.y * TILE_SIZE;
            unit.state = 'done'; // Newly recruited unit cannot move
            
            gameCore.map.addUnit(unit);
            
            // Update UI
            if (turnInfo) turnInfo.innerText = `Turn: ${gameCore.turn} | Team: ${gameCore.current_team === 0 ? 'Blue' : 'Red'} | Gold: ${player.gold}`;
            renderer.draw(map, gameManager);
            
            gameManager.setState(GameManager.STATE_SELECT);
        }
    });

    const gameManager = new GameManager(gameCore, renderer, soundManager, recruitmentMenu);
    const uiManager = new UIManager(gameCore);
    const ai = new AI(gameManager);

    const startScreen = new StartScreen(canvas, () => {
        gameManager.active = true;
        soundManager.playMusic('/audio/music/main_theme.mp3');
        
        // Start first turn
        gameCore.startTurn();
        const player = gameCore.players[gameCore.current_team];
        if (turnInfo) turnInfo.innerText = `Turn: ${gameCore.turn} | Team: ${gameCore.current_team === 0 ? 'Blue' : 'Red'} | Gold: ${player.gold}`;
    });

    // Hook UI updates into GameManager
    canvas.addEventListener('mousemove', (e) => {
        if (!gameManager.active) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
        const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
        uiManager.update(gameManager.selectedUnit, x, y);
    });
    
    canvas.addEventListener('click', () => {
        if (!gameManager.active) return;
        setTimeout(() => uiManager.update(gameManager.selectedUnit), 0);
    });

    // Game Loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (gameManager.active) {
            gameManager.update(deltaTime);
            
            // Only redraw if animating or dirty (for now, redraw every frame if animating)
            if (gameManager.state === GameManager.STATE_ANIMATING) {
                renderer.draw(map, gameManager);
            }
        } else {
            renderer.draw(map, gameManager);
            startScreen.draw();
        }

        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);

    // UI Controls
    const endTurnBtn = document.getElementById('endTurnBtn');
    const turnInfo = document.getElementById('turnInfo');

    const endTurn = async () => {
        // Disable button during turn change/AI
        endTurnBtn.disabled = true;
        
        const currentTeam = gameCore.current_team;
        const nextTeam = (currentTeam + 1) % 2; // Toggle 0/1
        gameCore.current_team = nextTeam;
        
        if (nextTeam === 0) gameCore.turn++;

        // Start Turn Logic (Income, Healing, Reset)
        gameCore.startTurn();

        // Deselect
        gameManager.setState(GameManager.STATE_SELECT);
        
        // Update UI
        const player = gameCore.players[nextTeam];
        turnInfo.innerText = `Turn: ${gameCore.turn} | Team: ${nextTeam === 0 ? 'Blue' : 'Red'} | Gold: ${player.gold}`;
        
        // Redraw
        renderer.draw(map, gameManager);

        // Check if AI turn (Team 1 is Red/AI)
        if (nextTeam === 1) { 
            await ai.runTurn();
            // AI finished, end its turn automatically
            endTurn(); 
        } else {
            // Player turn, re-enable button
            endTurnBtn.disabled = false;
        }
    };

    endTurnBtn.addEventListener('click', () => {
        if (!endTurnBtn.disabled) endTurn();
    });

    // Game Loop (for animations later, currently just event-driven redraws)
    // But GameManager might need a loop if we add animations.
    // For now, GameManager calls renderer.draw() on changes.
    
    console.log('Game Initialized');
}

initGame();
