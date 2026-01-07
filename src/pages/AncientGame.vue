<template>
  <div class="ancient-game-container">
    <div v-if="loading" class="loading-screen">
      {{ errorMsg || 'Loading Ancient Empire II...' }}
    </div>
    <div v-else class="game-wrapper" style="position: relative;">
        <canvas ref="gameCanvas" width="800" height="600" tabindex="0"></canvas>
        
        <!-- Action Menu Overlay -->
        <div v-if="showMenu" class="action-menu" :style="{ left: menuX + 'px', top: menuY + 'px' }">
             <button v-for="action in actions" :key="action.id" @click="executeAction(action.id)">
                {{ action.label }}
             </button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { resources } from '../game/ancient/manager/ResourceManager.js';
import GameScreen from '../game/ancient/screen/GameScreen.js';
import GameCore from '../game/ancient/entity/GameCore.js'; 
import MapLoader from '../game/ancient/utils/MapLoader.js';
import Rule from '../game/ancient/entity/Rule.js';
import GameManager from '../game/ancient/manager/GameManager.js';
// Import dependencies needed by subsystems if they aren't auto-loaded
import UnitFactory from '../game/ancient/utils/UnitFactory.js';
import TileFactory from '../game/ancient/utils/TileFactory.js';

const gameCanvas = ref(null);
const loading = ref(true);
const errorMsg = ref('');
const showMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const actions = ref([]);

let gameScreen = null;
let running = false;
let gameManager = null;

onMounted(async () => {
  try {
    console.log('Starting Ancient Empire II initialization...');

    // 1. Initialize Factories with Data
    const unitDataResponse = await fetch('/data/units.json');
    const unitData = await unitDataResponse.json();
    UnitFactory.loadUnitData(unitData);

    // Load Tile Data
    const tileDataResponse = await fetch('/data/tiles.json');
    const tileData = await tileDataResponse.json();
    TileFactory.loadTileData(tileData);
    
    // 2. Load Resources
    await resources.prepare();
    console.log('Resources loaded.');

    // 3. Load Map
    // Using one of the specific maps available in public/maps
    const mapUrl = '/maps/classic 1 200.json'; 
    const map = await MapLoader.loadMap(mapUrl);
    console.log('Map loaded:', map.getAuthor(), map.getWidth(), map.getHeight());

    // 4. Create Rule
    // Create a default rule set for Skirmish
    const rule = new Rule({});
    rule.setValue(Rule.CASTLE_INCOME, 50);
    rule.setValue(Rule.VILLAGE_INCOME, 30);
    rule.setValue(Rule.COMMANDER_INCOME, 0);
    rule.setValue(Rule.UNIT_CAPACITY, 50);
    // Add all units as available (simplified)
    for(let i=0; i<20; i++) rule.addAvailableUnit(i);

    // 5. Initialize GameCore
    // Skirmish mode
    const startGold = 1000;
    const gameCore = new GameCore(map, rule, startGold, GameCore.SKIRMISH);
    
    // 6. Initialize GameScreen
    loading.value = false;
    // Wait for DOM update to ensure canvas ref is available
    setTimeout(() => {
        if (!gameCanvas.value) return;
        
        gameScreen = new GameScreen(gameCanvas.value);
        gameScreen.setGameCore(gameCore);
        
        // Expose GameManager
        gameManager = gameScreen.gameManager;
        
        // Listen for events
        gameManager.setListener((state) => {
            if (state === GameManager.STATE_ACTION) {
                 // Show Menu
                 const unit = gameManager.getSelectedUnit();
                 if (unit) {
                     // Calculate screen position
                     const sx = gameScreen.getXOnScreen(unit.getX());
                     const sy = gameScreen.getYOnScreen(unit.getY());
                     
                     menuX.value = sx + 48; // Offset
                     menuY.value = sy;
                     
                     actions.value = gameManager.getAvailableActions();
                     showMenu.value = true;
                 }
            } else {
                 showMenu.value = false;
            }
        });

        // Start Loop
        running = true;
        loop();
        
        // Initial Focus
        // Find a unit to focus on? Or center?
        gameScreen.viewport.x = 0;
        gameScreen.viewport.y = 0;
        
    }, 100);

  } catch (e) {
    console.error('Failed to initialize game:', e);
    errorMsg.value = 'Game failed to start: ' + e.message;
  }
});

onBeforeUnmount(() => {
    running = false;
    // if (gameScreen) gameScreen.dispose();
});

function loop() {
    if (!running) return;
    
    if (gameScreen) {
        gameScreen.render();
    }
    
    requestAnimationFrame(loop);
}

function executeAction(actionId) {
    if (!gameManager) return;
    
    if (actionId === 'wait') {
        gameManager.doWait();
    } else if (actionId === 'cancel') {
        gameManager.doCancel();
    } else if (actionId === 'attack') {
        gameManager.beginAttack();
    } else if (actionId === 'occupy') {
        gameManager.doOccupy();
    }
}

</script>

<style scoped>
.ancient-game-container {
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
}

.loading-screen {
    color: white;
    font-size: 24px;
    font-family: sans-serif;
}

canvas {
    border: 2px solid #333;
    image-rendering: pixelated; /* Essential for pixel art */
    max-width: 100%;
    max-height: 100%;
}

.action-menu {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #fff;
    padding: 5px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 100;
}

.action-menu button {
    background: #333;
    color: white;
    border: 1px solid #555;
    padding: 5px 10px;
    cursor: pointer;
    font-family: inherit;
}

.action-menu button:hover {
    background: #555;
}
</style>
