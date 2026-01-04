<template>
  <div class="canvas-container" ref="container">
    <canvas ref="canvas" @click="handleClick" @mousedown="handleMouseDown" @mouseup="handleMouseUp" @mouseleave="handleMouseUp"></canvas>
    
    <div v-if="hoveredTile" class="tile-info" :style="{ left: infoPos.x + 'px', top: infoPos.y + 'px' }">
      <div>{{ getTerrainName(hoveredTile.terrain) }} ({{ hoveredTile.x }}, {{ hoveredTile.y }})</div>
      <div class="defense-info">Def: {{ getTerrainDefense(hoveredTile.terrain) }}</div>
      <div v-if="predictedDamage" class="damage-preview">
          DMG: {{ predictedDamage.min }}
      </div>
    </div>

    <div v-if="isAiTurn" class="ai-turn-overlay">
        Enemy Turn...
    </div>

    <!-- Dialogue Overlay -->
    <div v-if="showDialogue && dialogueQueue.length > 0" class="dialogue-overlay" @click="advanceDialogue">
        <div class="dialogue-box">
            <div class="speaker-name">{{ dialogueQueue[currentDialogueIndex].speaker }}</div>
            <div class="dialogue-text">{{ dialogueQueue[currentDialogueIndex].text }}</div>
            <div class="dialogue-hint">Click to continue...</div>
        </div>
    </div>

    <div class="bottom-menu">
        <div class="menu-left">
            <button class="info-btn" @click="showInfoModal = true" title="Information">
                <div class="info-icon"></div>
            </button>
        </div>
        <div class="menu-center">
             <div class="turn-info" :class="gameState?.currentTurn">
                <span>Turn: {{ gameState?.currentTurn?.toUpperCase() }}</span>
                <span v-if="gameState" style="margin-left: 15px; color: gold;">Gold: {{ gameState.money[gameState.currentTurn] }}</span>
             </div>
        </div>
        <div class="menu-right">
            <button class="end-turn-btn" @click="endTurn" :disabled="isAiTurn">End Turn</button>
        </div>
    </div>

    <div v-if="gameState?.selectedBuilding" 
         class="buy-menu"
         :style="{ left: (gameState.selectedBuilding.x * 40 + 40) + 'px', top: (gameState.selectedBuilding.y * 40) + 'px' }">
        <div class="menu-title">Recruit</div>
        <div v-for="(stats, type) in UNIT_STATS" :key="type" 
             class="buy-item" 
             :class="{ disabled: gameState.money[gameState.currentTurn] < stats.cost }"
             @click="handleBuyUnit(type)">
            <div class="unit-preview">
                <img v-if="getUnitImageSrc(type)" :src="getUnitImageSrc(type)" class="unit-sprite" />
                <span v-else class="icon">{{ stats.symbol }}</span>
            </div>
            <span class="name">{{ type }}</span>
            <span class="cost">{{ stats.cost }}G</span>
        </div>
        <button class="close-btn" @click="gameState.deselect()">Cancel</button>
    </div>

    <div v-if="gameState?.winner" class="game-over-overlay">
        <div class="winner-text" :style="{ color: TEAM_COLORS[gameState.winner] }">
            {{ gameState.winner.toUpperCase() }} WINS!
        </div>
        <button @click="initGame">Restart</button>
    </div>

    <div v-if="showInfoModal" class="info-modal-overlay" @click.self="showInfoModal = false">
        <div class="info-modal">
            <div class="modal-header">
                <h3>Information</h3>
                <button class="close-btn" @click="showInfoModal = false">×</button>
            </div>
            <div class="modal-content">
                <div v-if="gameState?.selectedUnit">
                    <div class="unit-header">
                        <div class="unit-icon-large">
                             <img v-if="getUnitImageSrc(gameState.selectedUnit.type)" :src="getUnitImageSrc(gameState.selectedUnit.type)" class="unit-sprite-large" />
                        </div>
                        <div class="unit-basic-stats">
                            <div class="stat-row">
                                <span class="stat-icon atk-icon" title="Attack">⚔️</span>
                                <span class="stat-val">{{ gameState.selectedUnit.attack }}</span>
                                <span class="stat-icon def-icon" title="Physical Defense">🛡️</span>
                                <span class="stat-val">{{ gameState.selectedUnit.physDef }}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-icon mag-def-icon" title="Magic Defense">✨</span>
                                <span class="stat-val">{{ gameState.selectedUnit.magDef }}</span>
                                <span class="stat-icon mov-icon" title="Movement">👣</span>
                                <span class="stat-val">{{ gameState.selectedUnit.moveRange }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="unit-secondary-stats">
                        <div class="sec-stat">
                            <span class="label">Cost:</span> {{ UNIT_STATS[gameState.selectedUnit.type].cost }}
                        </div>
                        <div class="sec-stat">
                            <span class="label">Rng:</span> {{ Array.isArray(gameState.selectedUnit.attackRange) ? gameState.selectedUnit.attackRange.join('-') : gameState.selectedUnit.attackRange }}
                        </div>
                        <div class="sec-stat">
                            <span class="label">Pop:</span> {{ UNIT_STATS[gameState.selectedUnit.type].population }}
                        </div>
                    </div>

                    <div class="info-row description-row">
                        <p class="description-text">{{ UNIT_DESCRIPTIONS[gameState.selectedUnit.type] || 'No description available.' }}</p>
                    </div>
                    
                    <div class="abilities-section">
                        <h5>Abilities</h5>
                        <div v-if="gameState.selectedUnit.abilities.length" class="ability-tags">
                            <span v-for="ab in gameState.selectedUnit.abilities" :key="ab" class="ability-tag">[{{ ab }}]</span>
                        </div>
                        <div v-else class="no-abilities">None</div>
                    </div>

                    <div class="reference-section">
                        <h5>Reference</h5>
                        <p class="reference-text">{{ UNIT_QUOTES[gameState.selectedUnit.type] || 'No reference available.' }}</p>
                    </div>
                </div>
                <div v-else-if="clickedTile">
                    <div class="unit-header">
                        <div class="unit-icon-large">
                             <!-- Placeholder for terrain/building icon -->
                             <span style="font-size: 24px;">🏞️</span>
                        </div>
                        <div class="unit-basic-stats">
                            <div class="stat-row">
                                <span class="stat-val" style="font-size: 16px;">{{ getTerrainName(clickedTile.terrain) }}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-icon def-icon" title="Defense Bonus">🛡️</span>
                                <span class="stat-val">+{{ getTerrainDefense(clickedTile.terrain) }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="gameState.getBuildingAt(clickedTile.x, clickedTile.y)" class="building-details">
                        <div class="unit-secondary-stats">
                            <div class="sec-stat">
                                <span class="label">Type:</span> {{ gameState.getBuildingAt(clickedTile.x, clickedTile.y).type.toUpperCase() }}
                            </div>
                            <div class="sec-stat">
                                <span class="label">Team:</span> 
                                <span :style="{ color: TEAM_COLORS[gameState.getBuildingAt(clickedTile.x, clickedTile.y).team] || '#aaa' }">
                                    {{ gameState.getBuildingAt(clickedTile.x, clickedTile.y).team || 'Neutral' }}
                                </span>
                            </div>
                        </div>
                        <div class="unit-secondary-stats">
                             <div class="sec-stat" v-if="['town', 'castle'].includes(gameState.getBuildingAt(clickedTile.x, clickedTile.y).type)">
                                <span class="label">Income:</span> 
                                <span style="color: gold;">{{ gameState.getBuildingAt(clickedTile.x, clickedTile.y).type === 'castle' ? '100G' : '50G' }}</span>
                            </div>
                             <div class="sec-stat" v-if="['village', 'castle', 'town'].includes(gameState.getBuildingAt(clickedTile.x, clickedTile.y).type)">
                                <span class="label">Heal:</span> 
                                <span style="color: #2ecc71;">20 HP</span>
                            </div>
                        </div>
                    </div>
                    <div v-else class="unit-secondary-stats">
                        <div class="sec-stat">
                            <span class="label">Position:</span> ({{ clickedTile.x }}, {{ clickedTile.y }})
                        </div>
                        <div class="sec-stat" v-if="[TERRAIN.TEMPLE, TERRAIN.TEMPLE_WATER, TERRAIN.TEMPLE_HEAL].includes(clickedTile.terrain)">
                            <span class="label">Heal:</span> 
                            <span style="color: #2ecc71;">20 HP</span>
                        </div>
                    </div>

                    <div class="info-row description-row">
                        <p class="description-text">{{ TERRAIN_DESCRIPTIONS[clickedTile.terrain] || 'No description available.' }}</p>
                    </div>

                    <div class="reference-section">
                        <h5>Reference</h5>
                        <p class="reference-text">{{ TERRAIN_QUOTES[clickedTile.terrain] || 'No reference available.' }}</p>
                    </div>
                </div>
                <div v-else>
                    <p>Select a unit or tile to see details.</p>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, reactive, shallowReactive, markRaw } from 'vue';
import { Grid } from '../../game/ancient/Grid';
import { GameState } from '../../game/ancient/GameState';
import { Unit } from '../../game/ancient/Unit';
import { AI } from '../../game/ancient/AI';
import { SoundManager } from '../../game/ancient/SoundManager';
import { TILE_SIZE, TERRAIN_NAMES, TERRAIN_DEFENSE, UNIT_TYPES, UNIT_STATS, TEAMS, TEAM_COLORS, TERRAIN, TERRAIN_STATS, UNIT_DESCRIPTIONS, UNIT_QUOTES, TERRAIN_DESCRIPTIONS, TERRAIN_QUOTES } from '../../game/ancient/constants';

const props = defineProps({
  levelData: {
    type: Object,
    required: true
  },
  multiplayer: {
      type: Object,
      default: null
  },
  gameConfig: {
      type: Object,
      default: null
  },
  campaignConfig: {
      type: Object,
      default: null
  }
});

const emit = defineEmits(['mp-action']);

const container = ref(null);
const canvas = ref(null);
const ctx = ref(null);
let grid = null;
const gameState = ref(null); // Make reactive to update UI
const isAiTurn = ref(false);
const dialogueQueue = ref([]);
const showDialogue = ref(false);
const currentDialogueIndex = ref(0);
let animationFrameId = null;
const soundManager = new SoundManager();
const atlasImages = shallowReactive({}); // Use shallowReactive to avoid deep proxying of Image objects

const hoveredTile = ref(null);
const clickedTile = ref(null); // For Info Modal
const showInfoModal = ref(false);
const predictedDamage = ref(null);
const infoPos = ref({ x: 0, y: 0 });

const interactionMode = ref('normal');
const selectedAction = ref(null);
const menuVisible = ref(false);

const availableActions = computed(() => {
    if (!gameState.value || !gameState.value.selectedUnit) return [];
    return gameState.value.getAvailableActions(gameState.value.selectedUnit);
});

const getUnitImageSrc = (type) => {
    if (!gameState.value) return null;
    const stats = UNIT_STATS[type];
    if (!stats || !stats.spriteAtlas) return null;
    
    const team = gameState.value.currentTurn;
    const baseKey = stats.spriteAtlas;
    
    // Try to find single frame first (for UI)
    const singleFrameKey = `${baseKey}_0`;
    if (atlasImages[singleFrameKey]) {
        return atlasImages[singleFrameKey].src;
    }

    // Try to find team-colored sprite
    const coloredKey = `${baseKey}_${team}`;
    if (atlasImages[coloredKey]) {
        return atlasImages[coloredKey].src;
    }
    // Fallback to base sprite
    if (atlasImages[baseKey]) {
        return atlasImages[baseKey].src;
    }
    return null;
};

const formatActionName = (action) => {
    return action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ');
};

const selectAction = (action) => {
    if (action === 'buy') {
        if (gameState.value && gameState.value.selectedUnit) {
            const unit = gameState.value.selectedUnit;
            const building = gameState.value.getBuildingAt(unit.x, unit.y);
            if (building) {
                gameState.value.selectedBuilding = building;
                gameState.value.selectedUnit = null; // Deselect unit to show buy menu
                menuVisible.value = false;
            }
        }
        return;
    }

    interactionMode.value = 'target';
    selectedAction.value = action;
    
    // Calculate and show valid targets
    if (gameState.value && gameState.value.selectedUnit) {
        gameState.value.skillTargets = gameState.value.calculateSkillTargets(gameState.value.selectedUnit, action);
    }
};

// Watch for opponent actions
watch(() => props.multiplayer, (newVal) => {
    if (newVal && newVal.status === 'playing') {
        // Setup socket listener for actions if not already
        // Actually, the parent component handles the socket connection.
        // We need to expose a method or watch a prop for incoming actions?
        // Better: Parent passes actions via a prop or method?
        // No, parent listens to socket and calls a method on this component?
        // Or we use a global event bus?
        // Let's use a simple approach: Parent listens and we expose a method `handleOpponentAction`
    }
}, { deep: true });

const initGame = () => {
  if (!canvas.value || !props.levelData) return;

  animationStates.clear();

  const { width, height, mapData, units } = props.levelData;
  grid = new Grid(width, height, mapData);
  grid.setAtlasImages(atlasImages); // Inject atlas images
  gameState.value = new GameState(grid, props.levelData);
  
  if (props.gameConfig && props.gameConfig.players) {
      // Override money and set alliances
      Object.entries(props.gameConfig.players).forEach(([team, config]) => {
          if (config.gold !== undefined) {
              gameState.value.money[team] = config.gold;
          }
          if (config.alliance !== undefined) {
              gameState.value.alliances[team] = config.alliance;
          }
      });
  }

  // Campaign Initialization
  if (props.campaignConfig && props.campaignConfig.stageData) {
      const stage = props.campaignConfig.stageData;
      
      // Create a context object for the stage script to use
      const context = {
          setAlliance: (team, alliance) => {
              gameState.value.alliances[team] = alliance;
          },
          setVar: (name, value) => {
              if (!gameState.value.vars) gameState.value.vars = {};
              gameState.value.vars[name] = value;
          },
          getVar: (name) => {
              return gameState.value.vars ? gameState.value.vars[name] : undefined;
          },
          showDialog: (messages) => {
              console.log("DIALOGUE:", messages);
              if (messages.length > 0) {
                  dialogueQueue.value = messages;
                  currentDialogueIndex.value = 0;
                  showDialogue.value = true;
              }
          },
          spawnUnit: (team, type, x, y) => {
              const u = new Unit(type, team, x, y);
              gameState.value.addUnit(u);
              // Trigger spawn effect?
          },
          countUnits: (team) => {
              return gameState.value.units.filter(u => u.team === team && u.hp > 0).length;
          },
          gameOver: (winner) => {
              gameState.value.winner = winner;
          }
      };

      // Attach context to gameState for event hooks
      gameState.value.campaignContext = context;
      gameState.value.stageScript = stage;

      // Run onGameStart
      if (stage.onGameStart) {
          stage.onGameStart(context);
      }
  }
  
  // Register animation callback
  gameState.value.onEvent = (type, data) => {
      if (type === 'move') {
          triggerMoveAnimation(data.unit, data.fromX, data.fromY);
      } else if (type === 'attack') {
          triggerAttackAnimation(data.attacker, data.defender);
      } else if (type === 'die') {
          triggerDeathAnimation(data.unit);
      } else if (type === 'skill') {
          triggerSkillAnimation(data.unit, data.targetX, data.targetY, data.skillName);
      } else if (type === 'buy') {
          soundManager.play('buy');
          // Use summon visual effect for spawning
          const effect = {
              x: data.unit.x * TILE_SIZE,
              y: data.unit.y * TILE_SIZE,
              type: 'summon',
              frame: 0,
              maxFrames: 30,
              time: 0
          };
          oneShotEffects.value.push(effect);
      }
  };

  // Initialize units from map data if available
  if (units && units.length > 0) {
      units.forEach(u => {
          gameState.value.addUnit(new Unit(u.type, u.team, u.x, u.y));
      });
  } else if (!props.multiplayer) {
      // Fallback to test units if no units in map data
      // Spawn all unit types for testing
      const allTypes = Object.values(UNIT_TYPES);
      let x = 1;
      let y = 1;
      allTypes.forEach((type, index) => {
          // Skip Knight if it's still in the list somehow, though we removed it from constants
          if (type === 'knight') return;

          // Alternate teams
          const team = index % 2 === 0 ? TEAMS.BLUE : TEAMS.RED;
          
          gameState.value.addUnit(new Unit(type, team, x, y));
          
          // Grid layout
          x++;
          if (x > 10) {
              x = 1;
              y++;
          }
      });
      
  } else {
      // In MP, maybe just spawn a King/Commander for each side?
      // Or use the test units for now so it's playable.
      gameState.value.addUnit(new Unit(UNIT_TYPES.SOLDIER, TEAMS.BLUE, 1, 1));
      gameState.value.addUnit(new Unit(UNIT_TYPES.PALADIN, TEAMS.BLUE, 2, 1));
      gameState.value.addUnit(new Unit(UNIT_TYPES.SOLDIER, TEAMS.RED, 8, 5));
      gameState.value.addUnit(new Unit(UNIT_TYPES.WOLF, TEAMS.RED, 9, 5));
  }

  // Resize canvas
  canvas.value.width = width * TILE_SIZE;
  canvas.value.height = height * TILE_SIZE;
  ctx.value = canvas.value.getContext('2d');

  // Play BGM
  soundManager.playBGM('main_theme');

  startRenderLoop();
};

const actionMenuHitboxes = ref([]);

const getActionMenuOptions = (unit) => {
    const options = [];
    if (!unit || unit.state === 'done') return options;

    // Special Case: King on Castle (Initial Selection)
    const building = gameState.value.getBuildingAt(unit.x, unit.y);
    const isKingOnCastle = unit.type === UNIT_TYPES.KING && building && building.type === 'castle' && building.team === unit.team;
    
    if (isKingOnCastle && unit.state === 'ready' && gameState.value.reachableTiles.length === 0) {
        // Initial menu for King on Castle
        options.push({ id: 'move', iconIndex: 4, label: 'Move' });
        options.push({ id: 'buy', iconIndex: 0, label: 'Buy' }); // Icon 0 is Buy
        options.push({ id: 'wait', iconIndex: 5, label: 'Wait' });
        return options;
    }

    // Standard Menu (After Move or if not King-on-Castle initial)
    
    // 1. Move (Only if ready and NOT moved yet - but if we are here, we usually moved or are King)
    // Actually, if we are 'ready' and menu is shown, it means we are King on Castle (handled above)
    // OR we are re-selecting a unit that hasn't moved?
    // But standard flow is: Select -> Auto Range.
    // So if menu is shown while 'ready', it must be King on Castle.
    
    // If unit state is 'moved', we show post-move options.
    
    // 2. Attack (If enemies in range)
    // Check if any enemies are in attack range from CURRENT position
    const enemiesInRange = gameState.value.units.some(u => {
        if (u.team === unit.team || u.hp <= 0) return false;
        const dist = Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y);
        const minRange = Array.isArray(unit.attackRange) ? unit.attackRange[0] : 1;
        const maxRange = Array.isArray(unit.attackRange) ? unit.attackRange[1] : unit.attackRange;
        return dist >= minRange && dist <= maxRange;
    });
    
    if (enemiesInRange) {
        options.push({ id: 'attack', iconIndex: 2, label: 'Attack' });
    }

    // 3. Skills
    const availableSkills = gameState.value.getAvailableActions(unit);
    availableSkills.forEach(skill => {
        if (skill === 'heal') options.push({ id: 'heal', iconIndex: 7, label: 'Heal' });
        else if (skill === 'repair') options.push({ id: 'repair', iconIndex: 1, label: 'Repair' });
        else if (skill === 'summon' || skill === 'raise_dead') options.push({ id: 'summon', iconIndex: 3, label: 'Summon' });
        else if (skill === 'support') options.push({ id: 'support', iconIndex: 6, label: 'Support' });
    });

    // 4. Capture (If on building)
    if (building) {
        // Villages cannot be captured. Only Towns and Castles.
        // Check if building is NOT a village (type 5 or 'village')
        const isVillage = building.type === 'village' || building.type === 5 || building.type === 'Village';
        const isCastle = building.type === 'castle' || building.type === 4 || building.type === 'Castle';
        
        if (!isVillage) {
            // Check if unit can capture
            let canCapture = false;
            
            if (isCastle) {
                // Only Castle Capturer can capture Castles
                canCapture = unit.abilities.includes('castle_capturer');
            } else {
                // Towns can be captured by both
                canCapture = unit.abilities.includes('castle_capturer') || 
                             unit.abilities.includes('village_capturer');
            }
            
            if (canCapture) {
                // Only show capture if not already owned by same team
                if (building.team !== unit.team) {
                    options.push({ id: 'capture', iconIndex: 1, label: 'Capture' });
                }
            }
        }
    }

    // 5. Wait (Always available)
    options.push({ id: 'wait', iconIndex: 5, label: 'Wait' });

    return options;
};

const render = () => {
  if (!ctx.value || !grid || !gameState.value || !canvas.value) return;

  // Clear canvas
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height);

  // 1. Draw Grid
  // Pass gameState to grid.draw so it can access building teams!
  grid.draw(ctx.value, gameState.value);

  // 1.5 Draw Buildings (Colored)
  const BUILDING_SPRITES = {
      'castle': 't37',
      'village': 't30'
  };

  gameState.value.buildings.forEach(b => {
      if (b.team) {
          const baseKey = BUILDING_SPRITES[b.type];
          if (baseKey) {
              const spriteKey = `${baseKey}_${b.team}`;
              if (atlasImages[spriteKey]) {
                  ctx.value.drawImage(atlasImages[spriteKey], b.x * TILE_SIZE, b.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              }
          }
      }
  });

  // 1.6 Draw Tombstones
  if (gameState.value.tombstones) {
      gameState.value.tombstones.forEach(t => {
          if (atlasImages['tombstone'] && atlasImages['tombstone'].complete) {
              ctx.value.drawImage(atlasImages['tombstone'], t.x * TILE_SIZE, t.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else {
              // Fallback Tombstone
              const px = t.x * TILE_SIZE;
              const py = t.y * TILE_SIZE;
              
              ctx.value.fillStyle = '#888';
              ctx.value.fillRect(px + 10, py + 10, TILE_SIZE - 20, TILE_SIZE - 15);
              
              // Cross
              ctx.value.fillStyle = '#555';
              ctx.value.fillRect(px + TILE_SIZE/2 - 2, py + 15, 4, 15);
              ctx.value.fillRect(px + TILE_SIZE/2 - 6, py + 20, 12, 4);
          }

          // Draw Life (Remaining Turns)
          ctx.value.fillStyle = 'white';
          ctx.value.font = 'bold 12px Arial';
          ctx.value.textAlign = 'right';
          ctx.value.textBaseline = 'bottom';
          ctx.value.strokeStyle = 'black';
          ctx.value.lineWidth = 2;
          
          const text = t.life.toString();
          const tx = (t.x + 1) * TILE_SIZE - 2;
          const ty = (t.y + 1) * TILE_SIZE - 2;
          
          ctx.value.strokeText(text, tx, ty);
          ctx.value.fillText(text, tx, ty);
      });
  }

  // 2. Draw Reachable Tiles (if unit selected)
  if (gameState.value.selectedUnit) {
      // Draw Threat Tiles (Attack Range) - Frame 0 (First Image)
      // Draw this FIRST so it's at the bottom
      if (gameState.value.threatTiles && gameState.value.threatTiles.length > 0 && !isAiTurn.value) {
          if (atlasImages['alpha'] && atlasImages['alpha'].complete) {
              const img = atlasImages['alpha'];
              // Frame 0: Attack Range (Red-ish)
              const frameWidth = img.width > img.height ? img.width / 2 : img.width;
              
              gameState.value.threatTiles.forEach(tile => {
                  // Skip if this tile is also reachable (will be drawn later with Frame 1)
                  const isReachable = gameState.value.reachableTiles.some(r => r.x === tile.x && r.y === tile.y);
                  if (!isReachable) {
                      ctx.value.drawImage(img, 0, 0, frameWidth, img.height, tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                  }
              });
          } else {
              // Fallback
              ctx.value.fillStyle = 'rgba(255, 0, 0, 0.2)';
              gameState.value.threatTiles.forEach(tile => {
                  const isReachable = gameState.value.reachableTiles.some(r => r.x === tile.x && r.y === tile.y);
                  if (!isReachable) {
                      ctx.value.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                  }
              });
          }
      }

      // Draw Reachable Tiles (Movement) - Frame 1 (Second Image)
      // Draw this SECOND so it's on top (Priority)
      if (gameState.value.reachableTiles.length > 0 && !isAiTurn.value) {
          if (atlasImages['alpha'] && atlasImages['alpha'].complete) {
              const img = atlasImages['alpha'];
              // Frame 1: Move Range (Blue-ish)
              const frameWidth = img.width > img.height ? img.width / 2 : img.width;
              const sx = img.width > img.height ? frameWidth : 0;
              
              gameState.value.reachableTiles.forEach(tile => {
                  ctx.value.drawImage(img, sx, 0, frameWidth, img.height, tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              });
          } else {
              ctx.value.fillStyle = 'rgba(0, 255, 0, 0.3)';
              gameState.value.reachableTiles.forEach(tile => {
                  ctx.value.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              });
          }
      }

      // Draw Path
      if (currentPath.value.length > 0 && atlasImages['button_regular_down'] && atlasImages['button_regular_down'].complete && !isAiTurn.value) {
          const img = atlasImages['button_regular_down'];
          
          // Draw from index 1 (index 0 is unit pos)
          for (let i = 1; i < currentPath.value.length; i++) {
              const curr = currentPath.value[i];
              const prev = currentPath.value[i-1];
              const next = i < currentPath.value.length - 1 ? currentPath.value[i+1] : null;
              
              const px = curr.x * TILE_SIZE;
              const py = curr.y * TILE_SIZE;
              
              const dotSize = TILE_SIZE / 3.5; 
              const centerOffset = (TILE_SIZE - dotSize) / 2;
              const gap = TILE_SIZE / 3; 
              
              // Always draw Center
              ctx.value.drawImage(img, px + centerOffset, py + centerOffset, dotSize, dotSize);

              // Draw Entry (From Prev)
              if (prev.x < curr.x) { // Came from Left
                  ctx.value.drawImage(img, px + centerOffset - gap, py + centerOffset, dotSize, dotSize);
              } else if (prev.x > curr.x) { // Came from Right
                  ctx.value.drawImage(img, px + centerOffset + gap, py + centerOffset, dotSize, dotSize);
              } else if (prev.y < curr.y) { // Came from Top
                  ctx.value.drawImage(img, px + centerOffset, py + centerOffset - gap, dotSize, dotSize);
              } else if (prev.y > curr.y) { // Came from Bottom
                  ctx.value.drawImage(img, px + centerOffset, py + centerOffset + gap, dotSize, dotSize);
              }

              // Draw Exit (To Next)
              if (next) {
                  if (next.x < curr.x) { // Going Left
                      ctx.value.drawImage(img, px + centerOffset - gap, py + centerOffset, dotSize, dotSize);
                  } else if (next.x > curr.x) { // Going Right
                      ctx.value.drawImage(img, px + centerOffset + gap, py + centerOffset, dotSize, dotSize);
                  } else if (next.y < curr.y) { // Going Top
                      ctx.value.drawImage(img, px + centerOffset, py + centerOffset - gap, dotSize, dotSize);
                  } else if (next.y > curr.y) { // Going Bottom
                      ctx.value.drawImage(img, px + centerOffset, py + centerOffset + gap, dotSize, dotSize);
                  }
              }
              
              // Draw Target Cursor on top of the last tile
              if (i === currentPath.value.length - 1) {
                  if (atlasImages['cursor_target'] && atlasImages['cursor_target'].complete) {
                      const cImg = atlasImages['cursor_target'];
                      // Pulse animation
                      const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                      const cw = TILE_SIZE * scale;
                      const ch = TILE_SIZE * scale;
                      const cx = px + TILE_SIZE/2;
                      const cy = py + TILE_SIZE/2;
                      ctx.value.drawImage(cImg, cx - cw/2, cy - ch/2, cw, ch);
                  }
              }
          }
      }

      // Draw Attackable Tiles (Targets)
      // If in attack mode (reachableTiles empty, attackableTiles not empty), draw Red Overlay
      if (gameState.value.attackableTiles.length > 0 && gameState.value.reachableTiles.length === 0 && !isAiTurn.value) {
          if (atlasImages['alpha'] && atlasImages['alpha'].complete) {
              const img = atlasImages['alpha'];
              // Frame 0: Attack Range (Red-ish)
              const frameWidth = img.width > img.height ? img.width / 2 : img.width;
              
              gameState.value.attackableTiles.forEach(tile => {
                  ctx.value.drawImage(img, 0, 0, frameWidth, img.height, tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              });
          } else {
              ctx.value.fillStyle = 'rgba(255, 0, 0, 0.2)';
              gameState.value.attackableTiles.forEach(tile => {
                  ctx.value.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              });
          }
      }

      // Draw Skill Targets
      if (gameState.value.skillTargets && gameState.value.skillTargets.length > 0 && !isAiTurn.value) {
          if (selectedAction.value === 'support' && gameState.value.selectedUnit) {
              // Special handling for Support skill: Draw Range 2 Red Overlay
              const unit = gameState.value.selectedUnit;
              if (atlasImages['alpha'] && atlasImages['alpha'].complete) {
                  const img = atlasImages['alpha'];
                  const frameWidth = img.width > img.height ? img.width / 2 : img.width;
                  
                  for (let dy = -2; dy <= 2; dy++) {
                      for (let dx = -2; dx <= 2; dx++) {
                          if (Math.abs(dx) + Math.abs(dy) <= 2) {
                              const tx = unit.x + dx;
                              const ty = unit.y + dy;
                              if (tx >= 0 && tx < grid.width && ty >= 0 && ty < grid.height) {
                                  ctx.value.drawImage(img, 0, 0, frameWidth, img.height, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                              }
                          }
                      }
                  }
              } else {
                   // Fallback
                   ctx.value.fillStyle = 'rgba(255, 0, 0, 0.2)';
                   for (let dy = -2; dy <= 2; dy++) {
                      for (let dx = -2; dx <= 2; dx++) {
                          if (Math.abs(dx) + Math.abs(dy) <= 2) {
                              const tx = unit.x + dx;
                              const ty = unit.y + dy;
                              if (tx >= 0 && tx < grid.width && ty >= 0 && ty < grid.height) {
                                  ctx.value.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                              }
                          }
                      }
                  }
              }
          } else {
              gameState.value.skillTargets.forEach(tile => {
                  // Different color based on skill type?
                  if (tile.type === 'heal' || tile.type === 'repair') {
                      ctx.value.fillStyle = 'rgba(0, 255, 255, 0.4)'; // Cyan for heal
                  } else if (tile.type === 'raise_dead' || tile.type === 'summon') {
                      ctx.value.fillStyle = 'rgba(148, 0, 211, 0.4)'; // Purple for summon
                  } else {
                      ctx.value.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Yellow default
                  }
                  
                  ctx.value.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                  
                  // Draw border
                  ctx.value.strokeStyle = 'white';
                  ctx.value.lineWidth = 2;
                  ctx.value.strokeRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              });
          }
      }
  }

  // 3. Draw Units
  gameState.value.units.forEach(unit => {
      if (unit.hp <= 0) return; // Don't draw dead units

      let px = unit.x * TILE_SIZE;
      let py = unit.y * TILE_SIZE;

      const animState = animationStates.get(unit);

      // Override with animation position
      if (animState && animState.visual) {
          px = animState.visual.x;
          py = animState.visual.y;
      }
      
      // Apply attack offset
      if (animState && animState.attack) {
          const originX = unit.x * TILE_SIZE;
          const originY = unit.y * TILE_SIZE;
          const targetX = animState.attack.targetX;
          const targetY = animState.attack.targetY;
          
          // Lerp towards target based on progress (0 to 0.5)
          const progress = animState.attack.progress; 
          const factor = progress * 0.2; // Reduced from 0.5 to 0.2 for smaller amplitude
          
          // Calculate offset from the logical origin
          // Note: If moving, originX/Y should be the visual pos?
          // But we block attack anim if moving, so it's fine.
          
          const offsetX = (targetX - originX) * factor;
          const offsetY = (targetY - originY) * factor;
          
          px += offsetX;
          py += offsetY;
      }
      
      const stats = UNIT_STATS[unit.type];
      let unitIndex = -1;
      if (stats && stats.spriteAtlas && typeof stats.spriteAtlas === 'string' && stats.spriteAtlas.startsWith('u')) {
          unitIndex = parseInt(stats.spriteAtlas.substring(1));
      }

      const teamIndex = ['blue', 'red', 'green', 'black'].indexOf(unit.team);
      const sheetKey = `unit_sheet_${teamIndex >= 0 ? teamIndex : 0}`;
      
      // Check for individual sprite override (for new units or missing ones)
      // u11 (Wisdom Crystal), u19 (Mermaid), u20 (Druid) and others > 18
      const useIndividual = unitIndex >= 19 || unitIndex === 11;
      
      // Try to use _0 and _1 for animation if available
      const img0 = atlasImages[`u${unitIndex}_0`];
      const img1 = atlasImages[`u${unitIndex}_1`];

      if (useIndividual && img0 && img0.complete && img1 && img1.complete) {
          const isDone = unit.state === 'done';
          const frame = isDone ? 0 : Math.floor(Date.now() / 500) % 2;
          
          const img = frame === 0 ? img0 : img1;
          
          const oldSmoothing = ctx.value.imageSmoothingEnabled;
          ctx.value.imageSmoothingEnabled = false;

          if (isDone) {
              ctx.value.filter = 'grayscale(100%)';
          }
          
          ctx.value.drawImage(img, 
              0, 0, img.width, img.height,
              px, py, TILE_SIZE, TILE_SIZE
          );
          
          if (isDone) {
              ctx.value.filter = 'none';
          }
          ctx.value.imageSmoothingEnabled = oldSmoothing;
          return; // Skip sheet drawing
      }

      if (useIndividual && atlasImages[`u${unitIndex}`] && atlasImages[`u${unitIndex}`].complete) {
          const img = atlasImages[`u${unitIndex}`];
          
          // Assume horizontal strip (2 frames) if width > height
          const isStrip = img.width > img.height;
          const frameWidth = isStrip ? img.width / 2 : img.width;
          const frameHeight = img.height;
          
          const isDone = unit.state === 'done';
          const frame = isDone ? 0 : Math.floor(Date.now() / 500) % 2;
          
          // Frame 0 is usually left, Frame 1 is right
          const sx = (isStrip && !isDone && frame === 1) ? frameWidth : 0;
          
          const oldSmoothing = ctx.value.imageSmoothingEnabled;
          ctx.value.imageSmoothingEnabled = false;

          if (isDone) {
              ctx.value.filter = 'grayscale(100%)';
          }
          
          ctx.value.drawImage(img, 
              sx, 0, frameWidth, frameHeight,
              px, py, TILE_SIZE, TILE_SIZE
          );
          
          if (isDone) {
              ctx.value.filter = 'none';
          }
          ctx.value.imageSmoothingEnabled = oldSmoothing;
          return; // Skip sheet drawing
      }

      if (unitIndex >= 0 && atlasImages[sheetKey] && atlasImages[sheetKey].complete) {
          const img = atlasImages[sheetKey];
          
          // Calculate dimensions dynamically
          // Assuming 2 rows (Active/Done)
          const textureSize = Math.floor(img.height / 2);
          const unitCount = Math.floor(img.width / textureSize);
          
          const sx = unitIndex * textureSize;
          
          // If unitIndex is out of bounds, don't draw (or draw fallback)
          if (unitIndex >= unitCount) {
              // Fallback to symbol
              ctx.value.fillStyle = 'white';
              ctx.value.font = '24px Arial';
              ctx.value.textAlign = 'center';
              ctx.value.textBaseline = 'middle';
              ctx.value.fillText(unit.symbol, px + TILE_SIZE/2, py + TILE_SIZE/2);
              return;
          }
          
          // Animation: 500ms per frame
          // If done, freeze frame at 0
          const isDone = unit.state === 'done';
          const frame = isDone ? 0 : Math.floor(Date.now() / 500) % 2;
          
          // Row 0: Frame 0
          // Row 1: Frame 1 (Also used for Done state)
          let sy = 0;
          if (isDone) {
              sy = textureSize; // Row 1
              ctx.value.filter = 'grayscale(100%)';
          } else {
              // Toggle between Row 0 and Row 1
              sy = frame === 0 ? 0 : textureSize;
          }
          
          // Scale up to fit tile (pixel art style)
          // Target size: TILE_SIZE - 4 (padding)
          const targetSize = TILE_SIZE - 4;
          
          const oldSmoothing = ctx.value.imageSmoothingEnabled;
          ctx.value.imageSmoothingEnabled = false; // Keep pixel art crisp
          
          // Apply grayscale if done
          if (isDone) {
              ctx.value.filter = 'grayscale(100%)';
          }

          ctx.value.drawImage(img, 
              sx, sy, textureSize, textureSize,
              px + (TILE_SIZE - targetSize)/2, py + (TILE_SIZE - targetSize)/2, targetSize, targetSize
          );

          // Draw Commander Head
          // Source: texture_heads = createFrames(sheet_heads, 4, 1);
          if (unit.type === UNIT_TYPES.KING && atlasImages['heads'] && atlasImages['heads'].complete) {
              const headImg = atlasImages['heads'];
              const headSize = headImg.width / 4; // 4 heads in a row
              const headIndex = (unit.variant || 0) % 4;
              
              const hsx = headIndex * headSize;
              
              // Java Logic (CanvasRenderer.java):
              // drawHead(batch, head_index, screen_x, screen_y, frame, ts)
              // X: screen_x + ts * 7 / 24
              // Y: screen_y + ts / 2 - frame * ts / 24 (Y-up coordinate system)
              // Width: ts * 13 / 24
              // Height: ts * 12 / 24
              
              // HTML Logic (Y-down coordinate system):
              // Dest X: px + TILE_SIZE * (7/24)
              // Dest Y: py + (headFrame * TILE_SIZE / 24) 
              // Note: In Y-up, "ts/2" is the middle. In Y-down, we start from top (py).
              // The head occupies the top half of the tile roughly.
              // We use TILE_SIZE as the reference scale 'ts'.
              
              const headFrame = isDone ? 0 : frame;
              
              const destX = px + TILE_SIZE * (7/24);
              const destY = py + (headFrame * TILE_SIZE / 24);
              const destW = TILE_SIZE * (13/24);
              const destH = TILE_SIZE * (12/24);
              
              ctx.value.drawImage(headImg,
                  hsx, 0, headSize, headSize,
                  destX, destY, destW, destH
              );
          }
          
          if (isDone) {
              ctx.value.filter = 'none';
          }
          ctx.value.imageSmoothingEnabled = oldSmoothing; // Reset
          
      } else {
          // Draw symbol fallback
          ctx.value.fillStyle = 'white';
          ctx.value.font = '24px Arial';
          ctx.value.textAlign = 'center';
          ctx.value.textBaseline = 'middle';
          ctx.value.fillText(unit.symbol, px + TILE_SIZE/2, py + TILE_SIZE/2);
      }

      // Draw Status Effects
      if (atlasImages['status'] && atlasImages['status'].complete) {
          const img = atlasImages['status'];
          const frameCount = 4; // Poison, Buff, Slow, Blind
          const frameWidth = img.width / frameCount;
          const frameHeight = img.height;
          
          const activeStatuses = [];
          if (unit.status.poison > 0) activeStatuses.push(0);
          if (unit.status.attack_boost > 0 || unit.status.defense_boost > 0) activeStatuses.push(1);
          if (unit.status.move_down > 0) activeStatuses.push(2);
          if (unit.status.blind > 0) activeStatuses.push(3);
          
          if (activeStatuses.length > 0) {
              // Cycle through statuses if multiple
              const index = Math.floor(Date.now() / 1000) % activeStatuses.length;
              const statusIndex = activeStatuses[index];
              
              // Draw at top-left
              const iconSize = TILE_SIZE / 2.5;
              ctx.value.drawImage(img, 
                  statusIndex * frameWidth, 0, frameWidth, frameHeight,
                  px, py, iconSize, iconSize
              );
          }
      }

      // Draw HP (if damaged or overhealed)
      if (unit.hp !== unit.maxHp && atlasImages['chars_small'] && atlasImages['chars_small'].complete) {
          const img = atlasImages['chars_small'];
          // Layout: 0123456789-C (12 frames)
          const frameCount = 12;
          const frameWidth = img.width / frameCount;
          const frameHeight = img.height;
          
          const hpStr = Math.ceil(unit.hp).toString();
          
          // Size of numbers on screen
          const targetHeight = 12; // Small but visible
          const scale = targetHeight / frameHeight;
          const targetWidth = frameWidth * scale;
          
          // Position: Bottom Right
          const totalWidth = hpStr.length * targetWidth;
          const startX = px + TILE_SIZE - totalWidth - 2;
          const startY = py + TILE_SIZE - targetHeight - 2;
          
          for (let i = 0; i < hpStr.length; i++) {
              const char = hpStr[i];
              let index = -1;
              if (char >= '0' && char <= '9') index = parseInt(char);
              else if (char === '-') index = 10;
              
              if (index >= 0) {
                  ctx.value.drawImage(img, 
                      index * frameWidth, 0, frameWidth, frameHeight,
                      startX + (i * targetWidth), startY, targetWidth, targetHeight
                  );
              }
          }
      }

      // Draw HP Bar (Removed as requested)
      /*
      const hpPct = unit.hp / unit.maxHp;
      ctx.value.fillStyle = 'red';
      ctx.value.fillRect(px + 4, py + 2, TILE_SIZE - 8, 4);
      ctx.value.fillStyle = '#00ff00';
      ctx.value.fillRect(px + 4, py + 2, (TILE_SIZE - 8) * hpPct, 4);
      */

      // Draw selection ring / cursor
      if (gameState.value.selectedUnit === unit && !isAiTurn.value) {
          if (atlasImages['cursor_normal'] && atlasImages['cursor_normal'].complete) {
              const img = atlasImages['cursor_normal'];
              // Animation: 2 frames (left/right)
              const frameWidth = img.width / 2;
              const frameHeight = img.height;
              const frameIndex = Math.floor(Date.now() / 500) % 2; // Switch every 500ms
              
              const sx = frameIndex * frameWidth;
              
              // Scale to TILE_SIZE to match character size (or slightly larger)
              ctx.value.drawImage(img, sx, 0, frameWidth, frameHeight, px, py, TILE_SIZE, TILE_SIZE);
          } else {
              ctx.value.strokeStyle = 'yellow';
              ctx.value.lineWidth = 3;
              ctx.value.stroke();
          }
      }
  });

  // 4. Draw Floating Texts
  gameState.value.floatingTexts.forEach(ft => {
      const px = ft.x * TILE_SIZE + TILE_SIZE/2;
      const py = ft.y * TILE_SIZE + ft.offsetY;
      
      ctx.value.fillStyle = ft.color;
      ctx.value.font = 'bold 20px Arial';
      ctx.value.textAlign = 'center';
      ctx.value.strokeStyle = 'white';
      ctx.value.lineWidth = 3;
      ctx.value.strokeText(ft.text, px, py);
      ctx.value.fillText(ft.text, px, py);
  });

  // 5. Draw Highlight (hover)
  if (hoveredTile.value && !menuVisible.value) {
      const { x, y } = hoveredTile.value;
      
      // Check if hovering over an enemy that can be attacked
      let isAttackTarget = false;
      let isEnemy = false;
      let isSupportTarget = false;

      if (gameState.value.selectedUnit) {
          isAttackTarget = gameState.value.attackableTiles.some(t => t.x === x && t.y === y);
          const unitAtTile = gameState.value.getUnitAt(x, y);
          if (unitAtTile && unitAtTile.team !== gameState.value.selectedUnit.team) {
              isEnemy = true;
          }
          
          // Check for Support Target
          if (interactionMode.value === 'target' && selectedAction.value === 'support') {
              isSupportTarget = gameState.value.skillTargets.some(t => t.x === x && t.y === y);
          }
      }

      // Draw Cursor
      if ((isAttackTarget && isEnemy) || isSupportTarget) {
          if (atlasImages['cursor_attack'] && atlasImages['cursor_attack'].complete) {
              // Draw Attack Cursor (Animated)
              const img = atlasImages['cursor_attack'];
              // Assume 3 frames horizontal strip
              const frameWidth = img.width / 3;
              const frameHeight = img.height;
              const frameIndex = Math.floor(Date.now() / 200) % 3; // Faster animation
              const sx = frameIndex * frameWidth;
              
              ctx.value.drawImage(img, sx, 0, frameWidth, frameHeight, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
      } else {
          // Just draw a white border for hover
          ctx.value.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.value.lineWidth = 2;
          ctx.value.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
  }

  // 5.5 Draw Clicked Tile Highlight (Persistent Selection)
  if (clickedTile.value && !gameState.value.selectedUnit && !menuVisible.value) {
      const { x, y } = clickedTile.value;
      if (atlasImages['cursor_normal'] && atlasImages['cursor_normal'].complete) {
          const img = atlasImages['cursor_normal'];
          const frameWidth = img.width / 2;
          const frameHeight = img.height;
          const frameIndex = Math.floor(Date.now() / 500) % 2;
          const sx = frameIndex * frameWidth;
          
          ctx.value.drawImage(img, sx, 0, frameWidth, frameHeight, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else {
          ctx.value.strokeStyle = 'yellow';
          ctx.value.lineWidth = 3;
          ctx.value.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
  }

  // 6. Draw One-Shot Effects
  oneShotEffects.value.forEach(effect => {
      const x = effect.x;
      const y = effect.y;
      
      if (effect.type === 'smoke' && atlasImages['smoke'] && atlasImages['smoke'].complete) {
          const img = atlasImages['smoke'];
          ctx.value.globalAlpha = 1 - (effect.frame / effect.maxFrames); // Fade out
          // Scale up slightly
          const scale = 1 + (effect.frame / effect.maxFrames);
          const w = TILE_SIZE * scale;
          const h = TILE_SIZE * scale;
          const dx = x - (w - TILE_SIZE)/2;
          const dy = y - (h - TILE_SIZE)/2;
          
          ctx.value.drawImage(img, dx, dy, w, h);
          ctx.value.globalAlpha = 1.0;
      } else if (effect.type === 'dust' && atlasImages['dust'] && atlasImages['dust'].complete) {
          const img = atlasImages['dust'];
          const frameCount = 4;
          const frameWidth = img.width / frameCount;
          const frameHeight = img.height;
          
          let spriteFrame = Math.floor((effect.frame / effect.maxFrames) * frameCount);
          if (spriteFrame >= frameCount) spriteFrame = frameCount - 1;
          
          ctx.value.drawImage(img, 
              spriteFrame * frameWidth, 0, frameWidth, frameHeight,
              x, y, TILE_SIZE, TILE_SIZE
          );
      } else if (effect.type === 'impact') {
          // Flash white
          ctx.value.fillStyle = `rgba(255, 255, 255, ${1 - effect.frame/10})`;
          ctx.value.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (effect.type === 'heal' || effect.type === 'repair') {
          // Rising sparkles (Cyan)
          ctx.value.fillStyle = `rgba(0, 255, 255, ${1 - effect.frame/30})`;
          const offset = effect.frame * 2;
          ctx.value.beginPath();
          ctx.value.arc(x + TILE_SIZE/2, y + TILE_SIZE - offset, 5, 0, Math.PI*2);
          ctx.value.fill();
          
          ctx.value.beginPath();
          ctx.value.arc(x + TILE_SIZE/4, y + TILE_SIZE - offset - 10, 3, 0, Math.PI*2);
          ctx.value.fill();
          
          ctx.value.beginPath();
          ctx.value.arc(x + 3*TILE_SIZE/4, y + TILE_SIZE - offset - 5, 4, 0, Math.PI*2);
          ctx.value.fill();
      } else if (effect.type === 'support') {
          if (atlasImages['spark_white'] && atlasImages['spark_white'].complete) {
              const img = atlasImages['spark_white'];
              const frameCount = 6;
              const frameWidth = img.width / frameCount;
              const frameHeight = img.height;
              
              let spriteFrame = Math.floor((effect.frame / effect.maxFrames) * frameCount);
              if (spriteFrame >= frameCount) spriteFrame = frameCount - 1;
              
              ctx.value.drawImage(img, 
                  spriteFrame * frameWidth, 0, frameWidth, frameHeight,
                  x, y, TILE_SIZE, TILE_SIZE
              );
          } else {
              // Fallback
              ctx.value.fillStyle = `rgba(255, 215, 0, ${1 - effect.frame/30})`;
              const offset = effect.frame * 2;
              ctx.value.beginPath();
              ctx.value.arc(x + TILE_SIZE/2, y + TILE_SIZE - offset, 6, 0, Math.PI*2);
              ctx.value.fill();
              
              ctx.value.beginPath();
              ctx.value.arc(x + TILE_SIZE/3, y + TILE_SIZE - offset - 8, 4, 0, Math.PI*2);
              ctx.value.fill();
              
              ctx.value.beginPath();
              ctx.value.arc(x + 2*TILE_SIZE/3, y + TILE_SIZE - offset - 4, 5, 0, Math.PI*2);
              ctx.value.fill();
          }
      } else if (effect.type === 'summon' || effect.type === 'raise_dead') {
          // Dark portal (Purple)
          ctx.value.strokeStyle = `rgba(148, 0, 211, ${1 - effect.frame/30})`;
          ctx.value.lineWidth = 3;
          ctx.value.beginPath();
          const radius = (effect.frame % 10) * 2 + 5;
          ctx.value.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, radius, 0, Math.PI*2);
          ctx.value.stroke();
      }
  });

  // 8. Draw Action Menu (Radial)
  actionMenuHitboxes.value = [];
  if (gameState.value.selectedUnit && gameState.value.selectedUnit.team === gameState.value.currentTurn) {
      const unit = gameState.value.selectedUnit;
      // Only show menu if not in target selection mode AND menu is visible
      if (interactionMode.value === 'normal' && menuVisible.value) {
          const options = getActionMenuOptions(unit);
          if (options.length > 0 && atlasImages['icons_action'] && atlasImages['icons_action'].complete) {
              const img = atlasImages['icons_action'];
              const iconSize = img.height; // Assuming square icons
              const baseDrawSize = 24; // Even smaller size
              
              // Layout: Circle around unit
              const radius = TILE_SIZE * 1.1; // Slightly tighter radius
              const centerX = unit.x * TILE_SIZE + TILE_SIZE/2;
              const centerY = unit.y * TILE_SIZE + TILE_SIZE/2;
              
              const angleStep = (Math.PI * 2) / options.length;
              // Start from top (-PI/2)
              let angle = -Math.PI / 2;

              options.forEach(opt => {
                  const ax = centerX + Math.cos(angle) * radius;
                  const ay = centerY + Math.sin(angle) * radius;
                  
                  const isPressed = pressedAction.value === opt.id;
                  const drawSize = isPressed ? baseDrawSize * 0.9 : baseDrawSize;
                  const offset = isPressed ? 2 : 0; // Slight shift down

                  // Draw background circle
                  ctx.value.fillStyle = isPressed ? 'rgba(50, 50, 50, 0.9)' : 'rgba(0, 0, 0, 0.7)';
                  ctx.value.beginPath();
                  ctx.value.arc(ax, ay + offset, drawSize/2 + 4, 0, Math.PI*2);
                  ctx.value.fill();
                  ctx.value.strokeStyle = isPressed ? '#aaa' : 'white';
                  ctx.value.lineWidth = 2;
                  ctx.value.stroke();

                  // Draw Icon
                  const sx = opt.iconIndex * iconSize;
                  ctx.value.drawImage(img, sx, 0, iconSize, iconSize, ax - drawSize/2, ay - drawSize/2 + offset, drawSize, drawSize);
                  
                  // Store hitbox (use base size for consistent hit detection)
                  actionMenuHitboxes.value.push({
                      id: opt.id,
                      x: ax - baseDrawSize/2 - 4, // Include padding
                      y: ay - baseDrawSize/2 - 4,
                      w: baseDrawSize + 8,
                      h: baseDrawSize + 8,
                      action: opt.id
                  });

                  angle += angleStep;
              });
          }
      }
  }
};

let infoButtonRect = null;

const animationStates = new Map(); // Unit -> { visual: {x, y}, attack: ... }

const currentPath = ref([]);

const findPath = (from, to, unit) => {
    // Simple BFS to find a valid path for animation
    const queue = [[from]];
    const visited = new Set([`${from.x},${from.y}`]);
    
    while (queue.length > 0) {
        const path = queue.shift();
        const curr = path[path.length - 1];
        
        if (curr.x === to.x && curr.y === to.y) return path;
        
        const neighbors = [
            {x: curr.x, y: curr.y - 1},
            {x: curr.x, y: curr.y + 1},
            {x: curr.x - 1, y: curr.y},
            {x: curr.x + 1, y: curr.y}
        ];
        
        for (const n of neighbors) {
            if (n.x < 0 || n.x >= grid.width || n.y < 0 || n.y >= grid.height) continue;
            const key = `${n.x},${n.y}`;
            if (visited.has(key)) continue;
            
            // Check obstacles
            const cost = gameState.value.getMovementCost(unit, n.x, n.y);
            if (cost > 10) continue; // Impassable
            
            // Check units
            const u = gameState.value.getUnitAt(n.x, n.y);
            // Block enemies, allow allies
            if (u && u !== unit && u.team !== unit.team) continue;
            
            visited.add(key);
            queue.push([...path, n]);
        }
    }
    return [from, to]; // Fallback
};

const triggerMoveAnimation = (unit, fromX, fromY) => {
    soundManager.play('move');
    const start = {x: fromX, y: fromY};
    const end = {x: unit.x, y: unit.y};
    const path = findPath(start, end, unit);

    let state = animationStates.get(unit) || {};
    state.visual = { x: fromX * TILE_SIZE, y: fromY * TILE_SIZE };
    state.path = path;
    state.pathIndex = 0;
    animationStates.set(unit, state);
};

const triggerAttackAnimation = (attacker, defender) => {
    let state = animationStates.get(attacker) || {};
    state.attack = {
        targetX: defender.x * TILE_SIZE,
        targetY: defender.y * TILE_SIZE,
        progress: 0,
        mode: 'forward',
        defender: defender
    };
    animationStates.set(attacker, state);
};

const triggerDeathAnimation = (unit) => {
    soundManager.play('die');
    const effect = {
        x: unit.x * TILE_SIZE,
        y: unit.y * TILE_SIZE,
        type: 'dust',
        frame: 0,
        maxFrames: 16,
        time: 0
    };
    oneShotEffects.value.push(effect);
};

const triggerImpactEffect = (unit) => {
    soundManager.play('attack');
    const effect = {
        x: unit.x * TILE_SIZE,
        y: unit.y * TILE_SIZE,
        type: 'impact',
        frame: 0,
        maxFrames: 10,
        time: 0
    };
    oneShotEffects.value.push(effect);
};

const triggerSkillAnimation = (unit, targetX, targetY, skillName) => {
    if (skillName === 'repair') soundManager.play('heal');
    else if (skillName === 'raise_dead') soundManager.play('summon');
    else soundManager.play(skillName);

    let maxFrames = 30;
    if (skillName === 'support') maxFrames = 24; // 6 frames * 4 ticks

    const effect = {
        x: targetX * TILE_SIZE,
        y: targetY * TILE_SIZE,
        type: skillName,
        frame: 0,
        maxFrames: maxFrames,
        time: 0
    };
    oneShotEffects.value.push(effect);
};

const oneShotEffects = ref([]);

const updateAnimations = (dt) => {
    if (!gameState.value) return;
    
    gameState.value.units.forEach(unit => {
        const state = animationStates.get(unit);
        if (!state) return;

        // Move Animation
        if (state.visual && state.path) {
            if (state.pathIndex >= state.path.length - 1) {
                // Done
                delete state.visual;
                delete state.path;
                delete state.pathIndex;

                // Check if we should show menu for this unit
                if (gameState.value.selectedUnit === unit && unit.state === 'moved' && !isAiTurn.value) {
                    menuVisible.value = true;
                }
            } else {
                const nextTile = state.path[state.pathIndex + 1];
                const targetX = nextTile.x * TILE_SIZE;
                const targetY = nextTile.y * TILE_SIZE;
                
                const dx = targetX - state.visual.x;
                const dy = targetY - state.visual.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                const speed = 300 * dt; // Pixels per second
                
                if (dist < speed) {
                    state.visual.x = targetX;
                    state.visual.y = targetY;
                    state.pathIndex++;
                } else {
                    state.visual.x += (dx / dist) * speed;
                    state.visual.y += (dy / dist) * speed;
                }
            }
        }
        // Attack Animation
        else if (state.attack) {
            const speed = 5 * dt;
            
            if (state.attack.mode === 'forward') {
                state.attack.progress += speed;
                if (state.attack.progress >= 1) {
                    state.attack.mode = 'back';
                    if (state.attack.defender) {
                        triggerImpactEffect(state.attack.defender);
                    }
                }
            } else {
                state.attack.progress -= speed;
                if (state.attack.progress <= 0) {
                    delete state.attack;
                }
            }
        }
        
        // Cleanup if empty
        if (!state.visual && !state.attack) {
            animationStates.delete(unit);
        }
    });

    // Update One-Shot Effects
    for (let i = oneShotEffects.value.length - 1; i >= 0; i--) {
        const effect = oneShotEffects.value[i];
        effect.time += dt;
        effect.frame = Math.floor(effect.time * 20); // 20 fps
        if (effect.frame >= effect.maxFrames) {
            oneShotEffects.value.splice(i, 1);
        }
    }
};

let lastTime = 0;
const startRenderLoop = () => {
  lastTime = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (gameState.value) {
        gameState.value.updateEffects();
        updateAnimations(dt);
    }
    render();
    animationFrameId = requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const pressedAction = ref(null);

const handleMouseDown = (event) => {
    if (!actionMenuHitboxes.value.length) return;
    const rect = canvas.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    for (const btn of actionMenuHitboxes.value) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            pressedAction.value = btn.id;
            return;
        }
    }
};

const handleMouseUp = () => {
    pressedAction.value = null;
};

const handleClick = async (event) => {
  pressedAction.value = null; // Ensure cleared
  if (!grid || !gameState.value || isAiTurn.value) return;
  
  // Multiplayer check: Is it my turn?
  const myTeam = props.multiplayer ? props.multiplayer.team : gameState.value.currentTurn;

  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 0. Check Action Menu Clicks
  if (actionMenuHitboxes.value.length > 0) {
      for (const btn of actionMenuHitboxes.value) {
          if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
              // Handle Action Click
              if (btn.action === 'move') {
                  // Switch to move mode (default)
                  // Just clear target mode if any
                  interactionMode.value = 'normal';
                  selectedAction.value = null;
                  gameState.value.skillTargets = [];
                  
                  // Show move range
                  gameState.value.showMoveRange(gameState.value.selectedUnit);
                  menuVisible.value = false;
              } else if (btn.action === 'wait') {
                  waitUnit();
                  menuVisible.value = false;
              } else if (btn.action === 'attack') {
                  // Enter attack mode
                  interactionMode.value = 'attack'; 
                  gameState.value.showAttackRange(gameState.value.selectedUnit);
                  menuVisible.value = false;
              } else if (btn.action === 'capture') {
                  // Execute capture
                  gameState.value.checkCapture(gameState.value.selectedUnit);
                  gameState.value.selectedUnit.state = 'done';
                  gameState.value.deselect();
                  menuVisible.value = false;
              } else if (btn.action === 'buy') {
                  // Open Buy Menu
                  // We need to trigger the buy menu logic.
                  // Usually this is done by selecting a building.
                  // But here we have a unit selected.
                  // We can manually trigger the 'select_building' event or just open the modal.
                  // Let's try to find the building and emit/set state.
                  const unit = gameState.value.selectedUnit;
                  const building = gameState.value.getBuildingAt(unit.x, unit.y);
                  if (building) {
                      // Deselect unit first? No, we want to keep context maybe?
                      // Actually, buy menu usually requires building selection.
                      // Let's just emit an event or set a state that the parent component listens to.
                      // Or we can simulate a building selection.
                      gameState.value.selectedBuilding = building;
                      // We might need to deselect unit to avoid conflicts, or handle 'buy' while unit selected.
                      // If we deselect unit, the menu closes.
                      // Let's just set selectedBuilding and let the UI react.
                      // The parent component (GameCanvas wrapper or AncientGame.vue) likely watches selectedBuilding.
                      // But wait, GameCanvas IS the component.
                      // We need to emit 'open-buy-menu' or similar if the logic is outside.
                      // Looking at the code, we don't see the buy modal logic here. It's likely in the parent or handled via state.
                      // Let's assume setting selectedBuilding is enough if there's a watcher, 
                      // OR we need to emit an event.
                      
                      // If we look at Case 2.5 in GameState, it returns { action: 'select_building', building }.
                      // We can mimic that.
                      gameState.value.selectedUnit = null; // Deselect unit to switch to building mode
                      gameState.value.selectedBuilding = building;
                      // We need to notify the UI to open the menu
                      // Since we are inside GameCanvas, maybe we emit?
                      // Let's check if there is an emit for building selection.
                      // The handleClick logic handles 'select_building' result.
                      // But here we are inside the menu click handler.
                      
                      // Let's try to emit a custom event or just rely on selectedBuilding.
                      // If the parent uses `gameState.selectedBuilding` to show the modal, this is fine.
                  }
                  menuVisible.value = false;
              } else {
                  // Skill (Heal, Repair, Summon)
                  selectAction(btn.action);
                  menuVisible.value = false;
              }
              return; // Stop propagation
          }
      }
  }
  
  const tile = grid.getGridFromScreen(x, y);
  if (tile) {
      // Always update clickedTile when clicking on the map
      const terrain = grid.getTerrainAt(tile.x, tile.y);
      clickedTile.value = { ...tile, terrain };

      // DEBUG: Log tile info on click
      const building = gameState.value.getBuildingAt(tile.x, tile.y);
      console.log(`[Click Debug] Tile: (${tile.x}, ${tile.y}), Terrain: ${terrain}`);
      if (building) {
          console.log(`[Click Debug] Building: Type=${building.type}, Team=${building.team}`);
          const spriteName = `t${terrain === 136 ? 36 : (terrain === 4 ? 37 : terrain)}`; // Simple mapping guess
          const teamSuffix = building.team ? `_${building.team}` : '_neutral';
          const fullSpriteName = spriteName + teamSuffix;
          console.log(`[Click Debug] Expected Sprite: ${fullSpriteName}`);
          console.log(`[Click Debug] Atlas Image Exists: ${!!atlasImages[fullSpriteName]}`);
          if (atlasImages[fullSpriteName]) {
               console.log(`[Click Debug] Image Src: ${atlasImages[fullSpriteName].src.substring(0, 50)}...`);
          }
      }

      // Target Selection Mode
      if (interactionMode.value === 'target') {
          // Check if valid target
          const isValid = gameState.value.skillTargets.some(t => t.x === tile.x && t.y === tile.y);
          
          if (isValid) {
              const unit = gameState.value.selectedUnit;
              const unitPos = { x: unit.x, y: unit.y };
              
              gameState.value.performAction(selectedAction.value, unit, tile.x, tile.y);
              gameState.value.deselect();
              
              if (props.multiplayer) {
                  emit('mp-action', {
                      type: 'skill',
                      skillName: selectedAction.value,
                      unit: unitPos,
                      target: { x: tile.x, y: tile.y }
                  });
              }

              interactionMode.value = 'normal';
              selectedAction.value = null;
              gameState.value.skillTargets = []; // Clear targets
          } else {
              // Cancel if clicked outside valid targets? Or just ignore?
              // Let's cancel for better UX
              interactionMode.value = 'normal';
              selectedAction.value = null;
              gameState.value.skillTargets = [];
          }
          return;
      }

    // Capture state before action
    const unitBefore = gameState.value.selectedUnit;
    const unitStateBefore = unitBefore ? unitBefore.state : null;
    const unitPosBefore = unitBefore ? { x: unitBefore.x, y: unitBefore.y } : null;

    // Pass myTeam to selectTile to ensure we can only move OUR units
    // But allow selecting enemy units to see range (handled in GameState)
    const result = await gameState.value.selectTile(tile.x, tile.y, myTeam);
    
    if (result && result.action === 'select') {
        soundManager.play('select');
        // If King on Castle, show menu. Otherwise, hide menu (auto-show range).
        // Also if unit is in 'moved' state (clicked on self after move), show menu.
        if (result.unit && result.unit.state === 'moved') {
            menuVisible.value = true;
        } else if (result.isKingOnCastle) {
            menuVisible.value = true;
        } else {
            menuVisible.value = false;
        }
        
        // If we selected an enemy unit, ensure we don't show the menu
        if (result.unit && result.unit.team !== myTeam) {
            menuVisible.value = false;
        }
    } else if (result && result.action === 'select_building') {
        soundManager.play('select');
        menuVisible.value = false;
    } else if (result && result.action === 'move') {
        // menuVisible.value = true; // Delayed until animation finishes
        interactionMode.value = 'normal'; // Ensure we are in normal mode to show menu
    } else if (result && result.action === 'cancel_move') {
        // Move cancelled, re-show menu at original position?
        // No, if cancelled, we go back to 'select' state.
        // If it was King on Castle, we should show menu.
        // If normal unit, we should show range.
        // But cancelMove() in GameState clears ranges.
        // We need to re-trigger range calculation if it's a normal unit.
        
        const unit = gameState.value.selectedUnit;
        const building = gameState.value.getBuildingAt(unit.x, unit.y);
        const isKingOnCastle = unit.type === UNIT_TYPES.KING && building && building.type === 'castle' && building.team === unit.team;
        
        if (isKingOnCastle) {
            menuVisible.value = true;
        } else {
            gameState.value.showMoveRange(unit);
            menuVisible.value = false;
        }
        interactionMode.value = 'normal';
    } else if (result && result.action === 'attack') {
        interactionMode.value = 'normal';
        menuVisible.value = false;
    } else {
        menuVisible.value = false;
    }
    
    // Handle Local Animations
    // if (result) {
    //     if (result.action === 'move' && unitBefore) {
    //         triggerMoveAnimation(unitBefore, unitPosBefore.x, unitPosBefore.y);
    //     } else if (result.action === 'attack' && unitBefore) {
    //         const defender = gameState.value.getUnitAt(tile.x, tile.y); 
    //         triggerAttackAnimation(unitBefore, { x: tile.x, y: tile.y });
    //     }
    // }
    
    // Handle Multiplayer Action Emission
    if (props.multiplayer && result) {
        if (result.action === 'move') {
            emit('mp-action', {
                type: 'move',
                from: unitPosBefore,
                to: { x: tile.x, y: tile.y }
            });
        } else if (result.action === 'attack') {
            emit('mp-action', {
                type: 'attack',
                attacker: unitPosBefore,
                defender: { x: tile.x, y: tile.y },
                damage: result.damage 
            });
        } else if (result.action === 'wait') {
            emit('mp-action', {
                type: 'wait',
                x: unitPosBefore.x,
                y: unitPosBefore.y
            });
        }
    }
  }
};

const advanceDialogue = () => {
    if (currentDialogueIndex.value < dialogueQueue.value.length - 1) {
        currentDialogueIndex.value++;
    } else {
        showDialogue.value = false;
        dialogueQueue.value = [];
    }
};

const endTurn = async () => {
    if (!gameState.value || isAiTurn.value) return;
    
    // Multiplayer check
    if (props.multiplayer && props.multiplayer.status === 'playing') {
        if (gameState.value.currentTurn !== props.multiplayer.team) return;
        emit('mp-action', { type: 'endTurn' });
    }

    gameState.value.endTurn();

    // Check for AI turn based on gameConfig or default behavior
    const currentTeam = gameState.value.currentTurn;
    let isCpu = false;

    if (props.multiplayer) {
        // In multiplayer, we never run AI locally for the opponent
        isCpu = false;
    } else if (props.gameConfig && props.gameConfig.players) {
        // Use provided config
        const playerConfig = props.gameConfig.players[currentTeam];
        if (playerConfig && playerConfig.type === 'cpu') {
            isCpu = true;
        }
    } else {
        // Default fallback: Red is AI
        if (currentTeam === TEAMS.RED) {
            isCpu = true;
        }
    }

    if (isCpu) {
        isAiTurn.value = true;
        // Deselect any player selection before AI starts
        gameState.value.deselect();
        
        // Small delay for visual pacing
        await new Promise(resolve => setTimeout(resolve, 500));

        const ai = new AI(gameState.value);
        await ai.executeTurn();
        
        // Ensure AI deselects everything when done
        gameState.value.deselect();
        isAiTurn.value = false;
    }
};

const waitUnit = () => {
    if (gameState.value && gameState.value.selectedUnit) {
        const u = gameState.value.selectedUnit;
        
        // Directly call waitUnit on GameState to finalize the turn
        gameState.value.waitUnit(u.x, u.y);
        
        if (props.multiplayer) {
            emit('mp-action', {
                type: 'wait',
                x: u.x,
                y: u.y
            });
        }
    }
};

const cancelMove = () => {
    if (gameState.value) {
        const success = gameState.value.cancelMove();
        if (success && props.multiplayer) {
            emit('mp-action', { type: 'cancelMove' });
        }
    }
};

const handleBuyUnit = (type) => {
    if (gameState.value && gameState.value.selectedBuilding) {
        const b = gameState.value.selectedBuilding;
        const newUnit = gameState.value.buyUnit(type, b.x, b.y);
        if (newUnit) {
            // Sound handled by onEvent
            if (props.multiplayer) {
                emit('mp-action', {
                    type: 'buy',
                    unitType: type,
                    x: b.x,
                    y: b.y
                });
            }
        } else {
            console.log("Not enough gold or invalid placement");
        }
    }
};


const handleMouseMove = (event) => {
    if (!grid || !canvas.value) return;
    const rect = canvas.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const tile = grid.getGridFromScreen(x, y);
    if (tile) {
        const terrain = grid.getTerrainAt(tile.x, tile.y);
        hoveredTile.value = { ...tile, terrain };
        infoPos.value = { x: x + 15, y: y + 15 };

        // Pathfinding for movement preview
        if (gameState.value && gameState.value.selectedUnit && 
            !menuVisible.value && 
            gameState.value.reachableTiles.length > 0) {
            
            // Check if hovered tile is reachable
            const isReachable = gameState.value.reachableTiles.some(t => t.x === tile.x && t.y === tile.y);
            
            if (isReachable) {
                const unit = gameState.value.selectedUnit;
                const start = {x: unit.x, y: unit.y};
                const end = {x: tile.x, y: tile.y};
                // Only recalculate if destination changed
                if (!currentPath.value.length || 
                    currentPath.value[currentPath.value.length-1].x !== end.x || 
                    currentPath.value[currentPath.value.length-1].y !== end.y) {
                    
                    currentPath.value = findPath(start, end, unit);
                }
            } else {
                currentPath.value = [];
            }
        } else {
            currentPath.value = [];
        }

        // Calculate Predicted Damage
        predictedDamage.value = null;
        if (gameState.value && gameState.value.selectedUnit) {
            const unit = gameState.value.selectedUnit;
            // Check if we are targeting an enemy
            const target = gameState.value.attackableTiles.find(t => t.x === tile.x && t.y === tile.y);
            if (target && target.targetUnit) {
                predictedDamage.value = gameState.value.getDamagePreview(unit, target.targetUnit);
            }
        }
    } else {
        hoveredTile.value = null;
        predictedDamage.value = null;
        currentPath.value = [];
    }
};

const getTerrainName = (t) => TERRAIN_NAMES[t] || 'Unknown';
const getTerrainDefense = (t) => (TERRAIN_STATS[t] ? TERRAIN_STATS[t].defense : 0);

const handleOpponentAction = (action) => {
    if (!gameState.value) return;
    console.log("Received opponent action:", action);

    switch (action.type) {
        case 'move': {
            const unit = gameState.value.getUnitAt(action.from.x, action.from.y);
            if (unit) {
                gameState.value.moveUnit(unit, action.to.x, action.to.y);
            }
            break;
        }
        case 'attack': {
            const attacker = gameState.value.getUnitAt(action.attacker.x, action.attacker.y);
            const defender = gameState.value.getUnitAt(action.defender.x, action.defender.y);
            if (attacker && defender) {
                gameState.value.attackUnit(attacker, defender, action.damage);
            }
            break;
        }
        case 'wait': {
            gameState.value.waitUnit(action.x, action.y);
            break;
        }
        case 'buy': {
            gameState.value.buyUnit(action.unitType, action.x, action.y);
            break;
        }
        case 'skill': {
            const unit = gameState.value.getUnitAt(action.unit.x, action.unit.y);
            if (unit) {
                gameState.value.performAction(action.skillName, unit, action.target.x, action.target.y);
            }
            break;
        }
        case 'endTurn': {
            gameState.value.endTurn();
            break;
        }
        case 'cancelMove': {
            gameState.value.cancelMove();
            break;
        }
    }
};

// Helper: RGB to HSL
const rgbToHsl = (r, g, b) => {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s, l];
};

// Helper: HSL to RGB
const hslToRgb = (h, s, l) => {
    let r, g, b;
    h /= 360;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const createRecoloredSprite = (img, team) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a === 0) continue;
        
        const [h, s, l] = rgbToHsl(r, g, b);
        
        // Special handling for Neutral: Grayscale everything that isn't transparent
        if (team === 'neutral') {
             // Simple grayscale
             const gray = 0.299 * r + 0.587 * g + 0.114 * b;
             data[i] = gray;
             data[i + 1] = gray;
             data[i + 2] = gray;
             continue;
        }

        // Check if pixel is "Blue" (Hue 160-280) and has some saturation
        // Widened range to catch Cyan/Purple tints
        if (h >= 160 && h <= 280 && s > 0.10) {
            let newR, newG, newB;
            
            if (team === 'red') {
                // Shift to Red (Hue 0)
                [newR, newG, newB] = hslToRgb(0, s, l); 
            } else if (team === 'green') {
                // Shift to Green (Hue 120)
                [newR, newG, newB] = hslToRgb(120, s, l);
            } else if (team === 'black') {
                // Desaturate and darken for Black team
                // Use a very low saturation and reduce lightness
                [newR, newG, newB] = hslToRgb(0, 0, l * 0.4); 
            }
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    const newImg = new Image();
    newImg.src = canvas.toDataURL();
    return newImg;
};

const createTintedSprite = (img, color) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // Draw original
    ctx.drawImage(img, 0, 0);
    
    // Tint
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6; // Tint strength
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    
    const newImg = new Image();
    newImg.src = canvas.toDataURL();
    return newImg;
};

const loadSprites = () => {
    // Load Unit Sheets (0: Blue, 1: Red, 2: Green, 3: Black)
    for (let i = 0; i < 4; i++) {
        const name = `unit_sheet_${i}`;
        const img = new Image();
        img.src = `/sprites_atlas/${name}.png`;
        img.onload = () => {
            atlasImages[name] = markRaw(img);
            if (grid && ctx.value) grid.draw(ctx.value);
        };
    }

    // Load terrain sprites (t0 to t83)
    for (let i = 0; i <= 83; i++) {
        const name = `t${i}`;
        const img = new Image();
        img.src = `/sprites_atlas/${name}.png`;
        img.onload = () => {
            // Force redraw when image loads
            if (grid && ctx.value) grid.draw(ctx.value, gameState.value);

            // Generate colored versions for buildings
            // t37: Castle, t36: Town. (t30 Village is excluded)
            if (name === 't37' || name === 't36') {
                // Ensure base image is loaded before generating variants
                if (!img.complete) return;

                Object.values(TEAMS).forEach(team => {
                    if (team === 'blue') {
                        // Explicitly set _blue to the base image
                        atlasImages[`${name}_${team}`] = markRaw(img);
                    } else {
                        const recolored = createRecoloredSprite(img, team);
                        atlasImages[`${name}_${team}`] = markRaw(recolored);
                    }
                });
                // Add Neutral
                const neutralImg = createRecoloredSprite(img, 'neutral');
                atlasImages[`${name}_neutral`] = markRaw(neutralImg);
                
                // Force redraw after generating variants
                if (grid && ctx.value) grid.draw(ctx.value, gameState.value);
            }
        };
        atlasImages[name] = markRaw(img);
    }
    // Load UI sprites
    const uiSprites = ['cursor_normal', 'cursor_attack', 'cursor_target', 'list_selection', 'heads', 'tt0', 'smoke', 'icons_menu', 'alpha', 'icons_action', 'arrows', 'icons_arrow', 'button_regular_down', 'chars_small', 'status', 'tombstone', 'dust', 'spark_white'];
    uiSprites.forEach(name => {
        const img = new Image();
        img.src = `/sprites_atlas/${name}.png`;
        atlasImages[name] = markRaw(img);
    });

    // Load individual unit sprites (u0 to u25)
    for (let i = 0; i <= 25; i++) {
        const name = `u${i}`;
        const img = new Image();
        img.src = `/sprites_atlas/${name}.png`;
        atlasImages[name] = markRaw(img);

        // Load animation frames
        const name0 = `u${i}_0`;
        const img0 = new Image();
        img0.src = `/sprites_atlas/${name0}.png`;
        atlasImages[name0] = markRaw(img0);

        const name1 = `u${i}_1`;
        const img1 = new Image();
        img1.src = `/sprites_atlas/${name1}.png`;
        atlasImages[name1] = markRaw(img1);
    }
};

defineExpose({ handleOpponentAction });

onMounted(() => {
  loadSprites();
  initGame();
  if (canvas.value) {
      canvas.value.addEventListener('mousemove', handleMouseMove);
      canvas.value.addEventListener('mouseleave', () => hoveredTile.value = null);
  }
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (canvas.value) {
      canvas.value.removeEventListener('mousemove', handleMouseMove);
  }
});

watch(() => props.levelData, () => {
  initGame();
});

watch(() => gameState.value?.currentTurn, (newTurn, oldTurn) => {
    if (newTurn && newTurn !== oldTurn) {
        soundManager.play('turn_start');
    }
});
</script>

<style scoped>
.canvas-container {
  position: relative;
  display: inline-block;
  background: #000;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  border-radius: 4px;
  overflow: hidden;
}

canvas {
  display: block;
  cursor: crosshair;
}

.tile-info {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}

.damage-preview {
    margin-top: 4px;
    color: #ff6b6b;
    font-weight: bold;
    border-top: 1px solid #555;
    padding-top: 2px;
}

.buy-menu {
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid white;
    border-radius: 4px;
    padding: 10px;
    z-index: 50;
    color: white;
    min-width: 200px;
    max-height: 400px;
    overflow-y: auto;
}

.info-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.info-modal {
    background: #2c3e50;
    color: white;
    border: 2px solid #ecf0f1;
    border-radius: 8px;
    width: 300px;
    max-width: 90%;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: #34495e;
    border-bottom: 1px solid #7f8c8d;
    border-radius: 6px 6px 0 0;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
}

.close-btn {
    background: none;
    border: none;
    color: #bdc3c7;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.close-btn:hover {
    color: white;
}

.modal-content {
    padding: 15px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 4px;
}

.label {
    color: #bdc3c7;
    font-weight: bold;
}

.value {
    font-weight: bold;
}

.info-stats {
    display: flex;
    justify-content: space-between;
    margin: 15px 0;
    background: rgba(0,0,0,0.2);
    padding: 10px;
    border-radius: 4px;
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-label {
    font-size: 10px;
    color: #95a5a6;
    text-transform: uppercase;
}

.stat-value {
    font-size: 16px;
    font-weight: bold;
    color: #f1c40f;
}

.abilities-section {
    margin-top: 15px;
}

.abilities-section h5 {
    margin: 0 0 5px 0;
    color: #bdc3c7;
}

.ability-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.ability-tag {
    background: #16a085;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
}

.building-info {
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.2);
}

.menu-title {
    font-weight: bold;
    margin-bottom: 5px;
    border-bottom: 1px solid #555;
    padding-bottom: 5px;
}

.buy-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px;
    cursor: pointer;
    transition: background 0.2s;
}

.buy-item:hover {
    background: rgba(255, 255, 255, 0.2);
}

.buy-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.buy-item .icon { font-size: 20px; }
.buy-item .unit-preview {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.buy-item .unit-sprite {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
}
.buy-item .name { flex: 1; text-transform: capitalize; }
.buy-item .cost { color: gold; font-weight: bold; }

.close-btn {
    margin-top: 10px;
    width: 100%;
    padding: 5px;
    background: #444;
    color: white;
    border: none;
    cursor: pointer;
}

.cancel-btn {
    background: #e74c3c;
    color: white;
    margin-top: 5px;
}

.game-over-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.ai-turn-overlay {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(231, 76, 60, 0.8);
    color: white;
    padding: 20px 40px;
    font-size: 24px;
    font-weight: bold;
    border-radius: 8px;
    pointer-events: none;
    z-index: 90;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

.winner-text {
    font-size: 48px;
    font-weight: bold;
    margin-bottom: 20px;
    text-shadow: 0 0 10px white;
}

.defense-info {
    color: #aaa;
    font-size: 10px;
}

.dialogue-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    padding-bottom: 100px;
}

.dialogue-box {
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #f1c40f;
    border-radius: 8px;
    padding: 20px;
    width: 80%;
    max-width: 600px;
    color: white;
    position: relative;
    cursor: pointer;
}

.speaker-name {
    font-size: 1.2em;
    font-weight: bold;
    color: #f1c40f;
    margin-bottom: 10px;
}

.dialogue-text {
    font-size: 1.1em;
    line-height: 1.4;
}

.dialogue-hint {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 0.8em;
    color: #aaa;
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.bottom-menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #2c3e50;
    padding: 10px;
    border-top: 2px solid #34495e;
    color: white;
    min-height: 60px;
}

.menu-left, .menu-right {
    display: flex;
    align-items: center;
}

.menu-center {
    flex: 1;
    display: flex;
    justify-content: center;
}

.info-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    transition: transform 0.1s;
}

.info-btn:hover {
    transform: scale(1.1);
}

.info-icon {
    width: 48px;
    height: 48px;
    background-image: url('/sprites_atlas/icons_menu.png');
    background-size: auto 48px;
    background-position: -288px 0;
    image-rendering: pixelated;
}

.end-turn-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 4px 0 #c0392b;
}

.end-turn-btn:active {
    transform: translateY(4px);
    box-shadow: none;
}

.end-turn-btn:disabled {
    background: #95a5a6;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
}

.turn-info {
    display: flex;
    gap: 20px;
    font-size: 18px;
    font-weight: bold;
    text-transform: uppercase;
    align-items: center;
}

.turn-info.blue { color: #3498db; }
.turn-info.red { color: #e74c3c; }

.buy-menu::-webkit-scrollbar {
    width: 8px;
}
.buy-menu::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1); 
}
.buy-menu::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.5); 
    border-radius: 4px;
}
.buy-menu::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.8); 
}

.info-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 10px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    background: rgba(0,0,0,0.3);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
}

.stat-label {
    color: #aaa;
    font-weight: bold;
}

.stat-value {
    color: white;
    font-weight: bold;
}

.description-row {
    margin-bottom: 10px;
    background: rgba(0,0,0,0.2);
    padding: 5px;
    border-radius: 4px;
}

.description-text {
    margin: 0;
    font-size: 14px;
    font-style: italic;
    color: #ddd;
}

.unit-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    background: rgba(0,0,0,0.3);
    padding: 10px;
    border-radius: 6px;
}

.unit-icon-large {
    width: 64px;
    height: 64px;
    background: rgba(0,0,0,0.5);
    border: 2px solid #7f8c8d;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 15px;
}

.unit-sprite-large {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
}

.unit-basic-stats {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stat-row {
    display: flex;
    align-items: center;
    justify-content: space-around;
}

.stat-icon {
    font-size: 16px;
    margin-right: 4px;
}

.stat-val {
    font-size: 18px;
    font-weight: bold;
    color: white;
    min-width: 20px;
}

.unit-secondary-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    background: rgba(0,0,0,0.2);
    padding: 8px;
    border-radius: 4px;
}

.sec-stat {
    font-size: 14px;
    color: white;
}

.sec-stat .label {
    color: #aaa;
    margin-right: 4px;
}

.reference-section {
    margin-top: 15px;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 10px;
}

.reference-section h5 {
    margin: 0 0 5px 0;
    color: #bdc3c7;
}

.reference-text {
    font-size: 13px;
    color: #bdc3c7;
    font-style: italic;
    line-height: 1.4;
}

.no-abilities {
    color: #7f8c8d;
    font-style: italic;
    font-size: 13px;
}
</style>
