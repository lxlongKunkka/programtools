<template>
  <div class="level-editor">
    <div class="editor-sidebar">
      <h3>Map Settings</h3>
      <div class="form-group">
        <label>Name:</label>
        <input v-model="levelName" placeholder="Level Name" />
      </div>
      <div class="form-group">
        <label>Width:</label>
        <input type="number" v-model.number="width" min="5" max="50" @change="resizeMap" />
      </div>
      <div class="form-group">
        <label>Height:</label>
        <input type="number" v-model.number="height" min="5" max="50" @change="resizeMap" />
      </div>

      <h3>Editor Mode</h3>
      <div class="mode-switcher">
        <button :class="{ active: editorMode === 'terrain' }" @click="editorMode = 'terrain'">Terrain</button>
        <button :class="{ active: editorMode === 'unit' }" @click="editorMode = 'unit'">Units</button>
      </div>

      <h3>Team</h3>
      <div class="team-selector">
        <div 
          v-for="(color, team) in TEAM_COLORS" 
          :key="team"
          class="team-item"
          :class="{ active: selectedTeam === team }"
          :style="{ backgroundColor: color }"
          @click="selectedTeam = team"
          :title="team"
        ></div>
      </div>

      <template v-if="editorMode === 'terrain'">
        <h3>Terrain Brush</h3>
        <div class="brush-palette">
          <div 
            v-for="type in terrainList" 
            :key="type"
            class="brush-item"
            :class="{ active: selectedTerrain == type }"
            :style="{ borderLeft: `5px solid ${terrainColors[type]}` }"
            @click="selectedTerrain = type"
          >
            {{ terrainNames[type] }}
          </div>
        </div>
      </template>

      <template v-if="editorMode === 'unit'">
        <h3>Unit Brush</h3>
        <div class="brush-palette">
          <div 
            v-for="type in unitList" 
            :key="type"
            class="brush-item"
            :class="{ active: selectedUnitType == type }"
            @click="selectedUnitType = type"
          >
            <span class="unit-icon" v-if="unitStats[type]">{{ unitStats[type].symbol }}</span> 
            <span>{{ type }}</span>
          </div>
          <div 
            class="brush-item eraser"
            :class="{ active: selectedUnitType === null }"
            @click="selectedUnitType = null"
          >
            🗑️ Eraser
          </div>
        </div>
      </template>

      <div class="actions">
        <button @click="saveLevel" :disabled="saving">Save Level</button>
        <button @click="$emit('cancel')">Back to Menu</button>
      </div>
      <div v-if="message" class="message" :class="messageType">{{ message }}</div>
    </div>

    <div class="editor-canvas-container" ref="container">
      <canvas 
        ref="canvas" 
        @mousedown="startDrawing" 
        @mousemove="draw" 
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, shallowReactive, markRaw } from 'vue';
import axios from 'axios';
import { Grid } from '../../game/ancient/Grid';
import { TERRAIN, TERRAIN_COLORS, TERRAIN_NAMES, TILE_SIZE, UNIT_TYPES, TEAMS, TEAM_COLORS, UNIT_STATS } from '../../game/ancient/constants';

const props = defineProps({
  initialData: Object
});

const emit = defineEmits(['cancel', 'saved']);

const levelName = ref('New Level');
const width = ref(15);
const height = ref(10);
const mapData = ref([]);
const units = ref([]);
const buildings = ref([]);

const editorMode = ref('terrain'); // 'terrain' or 'unit'
const selectedTeam = ref(TEAMS.BLUE);
const selectedTerrain = ref(TERRAIN.PLAIN);
const selectedUnitType = ref(UNIT_TYPES.SOLDIER);

const saving = ref(false);
const message = ref('');
const messageType = ref('info');

const canvas = ref(null);
const ctx = ref(null);
let grid = null;
let isDrawing = false;
const atlasImages = shallowReactive({});

// Expose constants to template explicitly to ensure availability
const unitStats = UNIT_STATS;
const terrainNames = TERRAIN_NAMES;
const terrainColors = TERRAIN_COLORS;

// Reactive lists
const unitList = ref([]);
const terrainList = ref([]);

// Mock GameState for Grid rendering
const mockGameState = {
  getBuildingAt: (x, y) => {
    return buildings.value.find(b => b.x === x && b.y === y);
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
        if (h >= 160 && h <= 280 && s > 0.10) {
            let newR, newG, newB;
            
            if (team === 'red') {
                [newR, newG, newB] = hslToRgb(0, s, l); 
            } else if (team === 'green') {
                [newR, newG, newB] = hslToRgb(120, s, l);
            } else if (team === 'black') {
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

const loadImages = async () => {
    try {
        const response = await fetch('/sprites_atlas/manifest.json');
        const manifest = await response.json();
        
        // Load Terrain
        manifest.terrain.forEach(filename => {
            const name = filename.replace('.png', '');
            const img = new Image();
            img.src = `/sprites_atlas/${filename}`;
            img.onload = () => {
                if (grid && ctx.value) grid.draw(ctx.value, mockGameState);
                
                // Handle recoloring for buildings (t36, t37)
                if (name === 't37' || name === 't36') {
                     Object.values(TEAMS).forEach(team => {
                        if (team === 'blue') {
                            atlasImages[`${name}_${team}`] = markRaw(img);
                        } else {
                            const recolored = createRecoloredSprite(img, team);
                            atlasImages[`${name}_${team}`] = markRaw(recolored);
                        }
                    });
                    const neutralImg = createRecoloredSprite(img, 'neutral');
                    atlasImages[`${name}_neutral`] = markRaw(neutralImg);
                }
            };
            atlasImages[name] = markRaw(img);
        });

        // Load Units
        manifest.units.forEach(filename => {
            const name = filename.replace('.png', '');
            const img = new Image();
            img.src = `/sprites_atlas/${filename}`;
            atlasImages[name] = markRaw(img);
            
            // Load animation frames if they exist
            const name0 = `${name}_0`;
            const img0 = new Image();
            img0.src = `/sprites_atlas/${name}_0.png`;
            img0.onload = () => {
                // Generate recolored versions for Frame 0
                Object.values(TEAMS).forEach(team => {
                    if (team !== 'blue') {
                        const recolored = createRecoloredSprite(img0, team);
                        atlasImages[`${name0}_${team}`] = markRaw(recolored);
                    }
                });
            };
            atlasImages[name0] = markRaw(img0);
            
            const name1 = `${name}_1`;
            const img1 = new Image();
            img1.src = `/sprites_atlas/${name}_1.png`;
            atlasImages[name1] = markRaw(img1);
        });
        
        // Load UI Sprites
        const uiSprites = ['cursor_normal', 'cursor_attack', 'cursor_target', 'list_selection', 'heads', 'tt0', 'smoke', 'icons_menu', 'alpha', 'icons_action', 'arrows', 'icons_arrow', 'button_regular_down', 'chars_small', 'status', 'tombstone', 'dust', 'spark_white'];
        uiSprites.forEach(name => {
            const img = new Image();
            img.src = `/sprites_atlas/${name}.png`;
            atlasImages[name] = markRaw(img);
        });
        
        // Load Unit Sheets
        for (let i = 0; i < 4; i++) {
            const name = `unit_sheet_${i}`;
            const img = new Image();
            img.src = `/sprites_atlas/${name}.png`;
            atlasImages[name] = markRaw(img);
        }

    } catch (e) {
        console.error("Failed to load sprite manifest", e);
    }
};

const initMap = () => {
  // Initialize map data with Plain if empty
  if (mapData.value.length !== height.value || mapData.value[0].length !== width.value) {
    const newMap = [];
    for (let y = 0; y < height.value; y++) {
      const row = [];
      for (let x = 0; x < width.value; x++) {
        // Preserve existing data if resizing
        if (mapData.value[y] && mapData.value[y][x] !== undefined) {
          row.push(mapData.value[y][x]);
        } else {
          row.push(TERRAIN.PLAIN);
        }
      }
      newMap.push(row);
    }
    mapData.value = newMap;
  }

  // Init Grid renderer
  grid = new Grid(width.value, height.value, mapData.value);
  grid.setAtlasImages(atlasImages);
  
  // Resize canvas
  if (canvas.value) {
    canvas.value.width = width.value * TILE_SIZE;
    canvas.value.height = height.value * TILE_SIZE;
    ctx.value = canvas.value.getContext('2d');
    render();
  }
};

const resizeMap = () => {
  initMap();
};

const render = () => {
  if (!ctx.value || !grid) return;
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height);
  
  // Draw Grid (Terrain + Buildings)
  grid.draw(ctx.value, mockGameState);

  // Draw Units
  units.value.forEach(unit => {
      const x = unit.x * TILE_SIZE;
      const y = unit.y * TILE_SIZE;
      
      let drawn = false;
      
      // Try drawing from Unit Sheet first (Better performance & guaranteed colors)
      const teamIndex = ['blue', 'red', 'green', 'black'].indexOf(unit.team);
      const sheetKey = `unit_sheet_${teamIndex}`;
      
      // Correctly calculate unitIndex from spriteAtlas (uX -> X)
      const stats = UNIT_STATS[unit.type];
      let unitIndex = -1;
      if (stats && stats.spriteAtlas && typeof stats.spriteAtlas === 'string' && stats.spriteAtlas.startsWith('u')) {
          unitIndex = parseInt(stats.spriteAtlas.substring(1));
      }
      
      // Skip sheet for special units (Mermaid, Druid, Wisdom Crystal) which are not in the standard sheet
      const useIndividual = unitIndex >= 19 || unitIndex === 11;

      if (!useIndividual && teamIndex >= 0 && unitIndex >= 0 && atlasImages[sheetKey] && atlasImages[sheetKey].complete) {
          const img = atlasImages[sheetKey];
          const textureSize = Math.floor(img.height / 2); // Assuming 2 rows
          const sx = unitIndex * textureSize;
          const sy = 0; // Frame 0
          
          // Check if index is within bounds of the sheet
          const maxUnits = Math.floor(img.width / textureSize);
          
          if (unitIndex < maxUnits) {
              // Target size: TILE_SIZE - 4 (padding)
              const targetSize = TILE_SIZE - 4;
              
              const oldSmoothing = ctx.value.imageSmoothingEnabled;
              ctx.value.imageSmoothingEnabled = false;
              
              ctx.value.drawImage(img, 
                  sx, sy, textureSize, textureSize,
                  x + (TILE_SIZE - targetSize)/2, y + (TILE_SIZE - targetSize)/2, targetSize, targetSize
              );

              // Draw Commander Head
              if (unit.type === UNIT_TYPES.KING && atlasImages['heads'] && atlasImages['heads'].complete) {
                  const headImg = atlasImages['heads'];
                  const headSize = headImg.width / 4; // 4 heads in a row
                  // Use teamIndex as headIndex (Blue=0, Red=1, Green=2, Black=3)
                  const headIndex = teamIndex >= 0 ? teamIndex : 0;
                  
                  const hsx = headIndex * headSize;
                  
                  // Position logic from GameCanvas
                  const destX = x + TILE_SIZE * (7/24);
                  const destY = y; // Frame 0 offset is 0
                  const destW = TILE_SIZE * (13/24);
                  const destH = TILE_SIZE * (12/24);
                  
                  ctx.value.drawImage(headImg,
                      hsx, 0, headSize, headSize,
                      destX, destY, destW, destH
                  );
              }
              
              ctx.value.imageSmoothingEnabled = oldSmoothing;
              drawn = true;
          }
      }

      // Fallback to individual sprites
      if (!drawn) {
          const stats = UNIT_STATS[unit.type];
          if (stats && stats.spriteAtlas) {
              const baseKey = stats.spriteAtlas;
              const coloredKey = `${baseKey}_${unit.team}`;
              const baseSpriteKey = baseKey;
              
              // New Logic: Prioritize Colored Frame 0
              const frame0Key = `${baseKey}_0`;
              const frame0ColoredKey = `${baseKey}_0_${unit.team}`;
              
              let img = null;
              
              // 1. Try Colored Frame 0 (Generated in loadImages)
              if (atlasImages[frame0ColoredKey]) {
                  img = atlasImages[frame0ColoredKey];
              }
              // 2. Try Base Frame 0 (Blue/Neutral)
              else if (atlasImages[frame0Key]) {
                  img = atlasImages[frame0Key];
              }
              // 3. Try Team Colored Base Image (if available)
              else if (atlasImages[coloredKey]) {
                  img = atlasImages[coloredKey];
              }
              // 4. Try Base Image
              else if (atlasImages[baseSpriteKey]) {
                  img = atlasImages[baseSpriteKey];
              }
              
              if (img && img.complete) {
                  const oldSmoothing = ctx.value.imageSmoothingEnabled;
                  ctx.value.imageSmoothingEnabled = false;
                  
                  let sw = img.width;
                  let sh = img.height;
                  
                  // Handle Horizontal Strip (2 frames side-by-side)
                  if (img.width > img.height) {
                      sw = img.width / 2;
                  }
                  // Handle Vertical Strip (2 frames top-bottom)
                  else if (img.height > img.width) {
                      sh = img.height / 2;
                  }

                  ctx.value.drawImage(img, 0, 0, sw, sh, x, y, TILE_SIZE, TILE_SIZE);
                  ctx.value.imageSmoothingEnabled = oldSmoothing;
                  drawn = true;
              }
          }
      }
      
      if (!drawn) {
          // Fallback text/symbol
          const stats = UNIT_STATS[unit.type];
          ctx.value.fillStyle = TEAM_COLORS[unit.team];
          ctx.value.font = '30px Arial';
          ctx.value.textAlign = 'center';
          ctx.value.textBaseline = 'middle';
          ctx.value.fillText(stats ? stats.symbol : '?', x + TILE_SIZE/2, y + TILE_SIZE/2);
      }
      
      // Selection highlight (optional)
  });
};

const getTileFromEvent = (e) => {
  const rect = canvas.value.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
  return { x, y };
};

const startDrawing = (e) => {
  isDrawing = true;
  draw(e);
};

const stopDrawing = () => {
  isDrawing = false;
};

const draw = (e) => {
  if (!isDrawing) return;
  const { x, y } = getTileFromEvent(e);
  
  if (x >= 0 && x < width.value && y >= 0 && y < height.value) {
    
    if (editorMode.value === 'terrain') {
        // Update Terrain
        if (mapData.value[y][x] !== selectedTerrain.value) {
            mapData.value[y][x] = selectedTerrain.value;
        }
        
        // Handle Building Logic
        const isBuildingTerrain = [TERRAIN.CASTLE, TERRAIN.VILLAGE, TERRAIN.TOWN, TERRAIN.CASTLE_2].includes(selectedTerrain.value);
        
        // Remove existing building at this location
        const existingBuildingIndex = buildings.value.findIndex(b => b.x === x && b.y === y);
        if (existingBuildingIndex !== -1) {
            buildings.value.splice(existingBuildingIndex, 1);
        }
        
        if (isBuildingTerrain) {
            // Add new building with selected team
            let type = 'village';
            if (selectedTerrain.value === TERRAIN.CASTLE || selectedTerrain.value === TERRAIN.CASTLE_2) type = 'castle';
            if (selectedTerrain.value === TERRAIN.TOWN) type = 'town';
            
            buildings.value.push({
                type,
                team: selectedTeam.value, // Use currently selected team
                x,
                y
            });
        }
        
    } else if (editorMode.value === 'unit') {
        // Remove existing unit
        const existingUnitIndex = units.value.findIndex(u => u.x === x && u.y === y);
        if (existingUnitIndex !== -1) {
            units.value.splice(existingUnitIndex, 1);
        }
        
        if (selectedUnitType.value) {
            // Add new unit
            units.value.push({
                type: selectedUnitType.value,
                team: selectedTeam.value,
                x,
                y
            });
        }
    }
    
    render();
  }
};

const saveLevel = async () => {
  if (!levelName.value) {
    message.value = 'Please enter a level name';
    messageType.value = 'error';
    return;
  }

  saving.value = true;
  message.value = 'Saving...';
  
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const payload = {
      name: levelName.value,
      width: width.value,
      height: height.value,
      mapData: mapData.value,
      units: units.value,
      buildings: buildings.value
    };

    // Check if we are updating or creating (for now always create new for simplicity)
    await axios.post('/api/ancient/levels', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    message.value = 'Level saved successfully!';
    messageType.value = 'success';
    setTimeout(() => emit('saved'), 1000);
  } catch (err) {
    console.error(err);
    message.value = 'Failed to save level';
    messageType.value = 'error';
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  console.log('LevelEditor Mounted');
  console.log('UNIT_STATS keys:', Object.keys(UNIT_STATS));
  
  // Populate lists
  unitList.value = Object.keys(UNIT_STATS);
  terrainList.value = Object.keys(TERRAIN_NAMES).map(k => parseInt(k));

  loadImages();
  if (props.initialData) {
    levelName.value = props.initialData.name;
    width.value = props.initialData.width;
    height.value = props.initialData.height;
    mapData.value = JSON.parse(JSON.stringify(props.initialData.mapData));
    if (props.initialData.units) units.value = JSON.parse(JSON.stringify(props.initialData.units));
    if (props.initialData.buildings) buildings.value = JSON.parse(JSON.stringify(props.initialData.buildings));
  }
  initMap();
});
</script>

<style scoped>
.level-editor {
  display: flex;
  gap: 20px;
  height: calc(100vh - 80px); /* Force height to fill screen minus header */
  min-height: 600px; /* Ensure minimum usable height */
}

.editor-sidebar {
  width: 300px;
  background: #2c3e50;
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%; /* Fill parent height */
  overflow: hidden; /* Prevent sidebar itself from scrolling */
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0; /* Prevent shrinking */
}

.form-group input {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.mode-switcher {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
}

.mode-switcher button {
    flex: 1;
    background: #34495e;
}

.mode-switcher button.active {
    background: #3498db;
}

.team-selector {
    display: flex;
    gap: 10px;
    background: #34495e;
    padding: 10px;
    border-radius: 4px;
    justify-content: center;
    flex-shrink: 0;
}

.team-item {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.2s;
}

.team-item:hover {
    transform: scale(1.1);
}

.team-item.active {
    border-color: white;
    box-shadow: 0 0 10px rgba(255,255,255,0.5);
}

.brush-palette {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: #34495e;
  padding: 10px;
  border-radius: 4px;
  flex: 1; /* Take remaining space */
  overflow-y: auto; /* Scroll internally */
  min-height: 200px; /* Ensure it has height even if flex fails */
}

.brush-item {
  padding: 8px 12px;
  background: #2c3e50;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0; /* Prevent items from squishing */
}

.brush-item:hover {
  background: #3e5871;
}

.brush-item.active {
  background: #3498db;
  font-weight: bold;
}

.brush-item.eraser {
    color: #e74c3c;
}

.unit-icon {
    font-size: 20px;
    width: 24px;
    text-align: center;
}

.editor-canvas-container {
  flex: 1;
  background: #1a1a1a;
  padding: 20px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  cursor: crosshair;
}

.actions {
  margin-top: auto; /* Push to bottom if space allows, but flex:1 on palette handles it */
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 10px;
}

button {
  padding: 10px;
  cursor: pointer;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
}

button:disabled {
  background: #7f8c8d;
  cursor: not-allowed;
}

button:last-child {
  background: #7f8c8d;
}

.message {
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}
.message.success { background: #27ae60; }
.message.error { background: #c0392b; }
.message.info { background: #2980b9; }
</style>
