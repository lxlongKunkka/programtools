<template>
  <div class="ancient-game-page">
    <!-- Main Menu -->
    <MainMenu v-if="mode === 'menu'" @select="handleMenuSelect" />

    <!-- Skirmish Setup -->
    <SkirmishSetup 
        v-else-if="mode === 'skirmish_setup'" 
        :maps="levels" 
        @cancel="mode = 'menu'" 
        @start="handleSkirmishStart" 
    />

    <!-- Campaign Select -->
    <CampaignSelect 
        v-else-if="mode === 'campaign_select'" 
        @cancel="mode = 'menu'" 
        @start="handleCampaignStart" 
    />

    <!-- Game/Editor Interface -->
    <template v-else>
      <div class="header">
        <div class="header-top">
            <button class="back-btn" @click="mode = 'menu'">← Main Menu</button>
            <h1>Ancient Empires Clone</h1>
        </div>
        
        <div class="mode-switcher">
            <button :class="{ active: mode === 'play' }" @click="mode = 'play'">Skirmish</button>
            <button :class="{ active: mode === 'multiplayer' }" @click="mode = 'multiplayer'">Multiplayer</button>
            <button :class="{ active: mode === 'editor' }" @click="mode = 'editor'">Level Editor</button>
        </div>

        <div class="controls" v-if="mode === 'play'">
            <span v-if="currentLevel">{{ currentLevel.name }}</span>
            <button @click="mode = 'skirmish_setup'">New Game</button>
        </div>

        <div class="controls" v-if="mode === 'multiplayer'">
            <div v-if="!mpState.connected">Connecting to server...</div>
            <div v-else-if="mpState.status === 'idle'">
                <button @click="findMatch">Find Match</button>
            </div>
            <div v-else-if="mpState.status === 'searching'">
                Searching for opponent...
            </div>
            <div v-else-if="mpState.status === 'playing'">
                Playing vs {{ mpState.opponentId }} (You are {{ mpState.team.toUpperCase() }})
            </div>
        </div>
      </div>

      <div class="game-viewport" :class="{ 'editor-mode': mode === 'editor' }">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        
        <template v-else>
            <LevelEditor 
                v-if="mode === 'editor'" 
                @cancel="mode = 'menu'" 
                @saved="onLevelSaved" 
            />
            <GameCanvas 
                v-else-if="mode === 'play' && currentLevel" 
                :levelData="currentLevel" 
                :gameConfig="skirmishConfig"
                :campaignConfig="campaignConfig"
                :key="currentLevel._id + '_' + gameKey" 
            />
            <GameCanvas 
                v-else-if="mode === 'multiplayer' && mpState.status === 'playing' && currentLevel" 
                ref="gameCanvasRef"
                :levelData="currentLevel" 
                :multiplayer="mpState"
                @mp-action="sendMpAction"
            />
            <div v-else-if="mode === 'multiplayer'" class="no-level">
                {{ mpState.status === 'searching' ? 'Waiting for opponent...' : 'Click Find Match to start' }}
            </div>
            <div v-else class="no-level">No level loaded. Start a new game!</div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue';
import axios from 'axios';
import { io } from 'socket.io-client';
import GameCanvas from './GameCanvas.vue';
import LevelEditor from './LevelEditor.vue';
import MainMenu from './MainMenu.vue';
import SkirmishSetup from './SkirmishSetup.vue';
import CampaignSelect from './CampaignSelect.vue';

const loading = ref(false);
const error = ref(null);
const levels = ref([]);
const currentLevelId = ref(null);
const mode = ref('menu');
const socket = ref(null);
const gameCanvasRef = ref(null);
const skirmishConfig = ref(null);
const campaignConfig = ref(null);
const gameKey = ref(0); // To force re-render

const mpState = reactive({
    connected: false,
    status: 'idle', // idle, searching, playing
    roomId: null,
    team: null,
    opponentId: null
});

const handleMenuSelect = (selection) => {
    if (selection === 'skirmish') {
        mode.value = 'skirmish_setup';
    } else if (selection === 'campaign') {
        mode.value = 'campaign_select';
    } else if (selection === 'multiplayer') {
        mode.value = 'multiplayer';
    } else if (selection === 'editor') {
        mode.value = 'editor';
    } else if (selection === 'exit') {
        window.location.href = '/';
    }
};

const handleSkirmishStart = ({ levelId, players }) => {
    currentLevelId.value = levelId;
    skirmishConfig.value = { players };
    campaignConfig.value = null;
    mode.value = 'play';
    gameKey.value++;
};

const handleCampaignStart = ({ campaignId, stageIndex, stageData }) => {
    // For now, we need to find a map that matches the stage
    // In a real implementation, we would load the map data from the stage definition
    // For this POC, we'll try to find a map with a similar name or just use the first one
    
    // Try to find map by ID if provided in stageData
    let levelId = null;
    if (stageData.mapId) {
        // Check if we have this map loaded
        // The mapId in stageData might be a filename like 'classic 1 200.aem'
        // Our levels have _id which might be 'static_classic 1 200.aem'
        const targetId = `static_${stageData.mapId}`;
        const level = levels.value.find(l => l._id === targetId);
        if (level) {
            levelId = level._id;
        }
    }
    
    if (!levelId && levels.value.length > 0) {
        levelId = levels.value[0]._id; // Fallback
    }

    if (levelId) {
        currentLevelId.value = levelId;
        skirmishConfig.value = null;
        campaignConfig.value = {
            campaignId,
            stageIndex,
            stageData
        };
        mode.value = 'play';
        gameKey.value++;
    } else {
        alert("Could not load campaign map!");
    }
};

const currentLevel = computed(() => levels.value.find(l => l._id === currentLevelId.value));

const initSocket = () => {
    // Assuming socket server is on same host/port or configured via proxy
    // If dev environment, might need specific URL
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    socket.value = io(socketUrl);

    socket.value.on('connect', () => {
        mpState.connected = true;
    });

    socket.value.on('ancient_waiting', () => {
        mpState.status = 'searching';
    });

    socket.value.on('ancient_opponent_action', (action) => {
        if (gameCanvasRef.value) {
            gameCanvasRef.value.handleOpponentAction(action);
        }
    });

    socket.value.on('ancient_match_found', async ({ roomId, team, opponentId, levelId }) => {
        mpState.status = 'playing';
        mpState.roomId = roomId;
        mpState.team = team;
        mpState.opponentId = opponentId;
        
        if (levelId) {
            const existing = levels.value.find(l => l._id === levelId);
            if (existing) {
                currentLevelId.value = levelId;
            } else {
                try {
                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                    const res = await axios.get(`/api/ancient/levels/${levelId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.data.success) {
                        levels.value.push(res.data.data);
                        currentLevelId.value = levelId;
                    }
                } catch (e) {
                    console.error("Failed to fetch match level", e);
                }
            }
        } else if (levels.value.length > 0) {
            currentLevelId.value = levels.value[0]._id;
        }
    });

    socket.value.on('ancient_opponent_left', () => {
        alert('Opponent disconnected!');
        mpState.status = 'idle';
        mpState.roomId = null;
    });
};

const findMatch = () => {
    if (socket.value) {
        socket.value.emit('ancient_find_match');
        mpState.status = 'searching';
    }
};

const sendMpAction = (action) => {
    if (socket.value && mpState.roomId) {
        socket.value.emit('ancient_action', { roomId: mpState.roomId, action });
    }
};

const fetchLevels = async () => {
  loading.value = true;
  error.value = null;
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // Parallel fetch: API levels and Static maps
    const [apiRes, staticListRes] = await Promise.allSettled([
        axios.get('/api/ancient/levels', { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get('/maps/map_list.json')
    ]);

    let allLevels = [];

    // Process API Levels
    if (apiRes.status === 'fulfilled' && apiRes.value.data.success) {
        allLevels = [...apiRes.value.data.data];
    }

    // Process Static Maps
    if (staticListRes.status === 'fulfilled' && Array.isArray(staticListRes.value.data)) {
        const mapFiles = staticListRes.value.data;
        const mapPromises = mapFiles.map(f => axios.get(`/maps/${f}`));
        const mapsRes = await Promise.allSettled(mapPromises);
        
        mapsRes.forEach((res, idx) => {
            if (res.status === 'fulfilled') {
                const mapData = res.value.data;
                // Add ID if missing
                if (!mapData._id) {
                    mapData._id = `static_${mapFiles[idx]}`;
                }
                // Normalize terrain -> mapData for static maps
                if (mapData.terrain && !mapData.mapData) {
                    mapData.mapData = mapData.terrain;
                }
                allLevels.push(mapData);
            }
        });
    }

    levels.value = allLevels;
    
    if (levels.value.length > 0 && !currentLevelId.value) {
      currentLevelId.value = levels.value[0]._id;
    }

  } catch (err) {
    console.error(err);
    error.value = 'Failed to load levels';
  } finally {
    loading.value = false;
  }
};

const selectLevel = () => {
    // handled by v-model
};

const onLevelSaved = () => {
    fetchLevels();
    // Optional: switch back to play mode
    // mode.value = 'play';
};

const initTestLevel = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const res = await axios.post('/api/ancient/init-test', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.data.success) {
        await fetchLevels();
    }
  } catch (err) {
    console.error(err);
    error.value = 'Failed to init test level';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchLevels();
  initSocket();
});
</script>

<style scoped>
.ancient-game-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background-color: #2c3e50;
  color: white;
}

.header {
  margin-bottom: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
  width: 100%;
}

.header-top {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 100%;
    max-width: 1200px;
}

.back-btn {
    position: absolute;
    left: 0;
    padding: 8px 16px;
    background: #7f8c8d;
    border: none;
    color: white;
    border-radius: 4px;
    cursor: pointer;
}

.back-btn:hover {
    background: #95a5a6;
}

.mode-switcher {
    display: flex;
    gap: 10px;
    background: #34495e;
    padding: 5px;
    border-radius: 8px;
}

.mode-switcher button {
    padding: 8px 20px;
    background: transparent;
    border: none;
    color: #bdc3c7;
    cursor: pointer;
    font-weight: bold;
    border-radius: 4px;
    transition: all 0.2s;
}

.mode-switcher button.active {
    background: #3498db;
    color: white;
}

.controls {
    display: flex;
    gap: 10px;
    align-items: center;
}

.controls select {
    padding: 8px;
    border-radius: 4px;
    background: white;
    border: none;
}

.controls button {
  padding: 8px 16px;
  background: #e67e22;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.game-viewport {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #34495e;
  padding: 20px;
  border-radius: 8px;
  min-width: 800px;
  min-height: 600px;
  width: 90%;
  max-width: 1200px;
}

.game-viewport.editor-mode {
    align-items: stretch;
    height: 700px;
}

.loading, .error, .no-level {
  font-size: 1.5rem;
  color: #bdc3c7;
}

.error {
  color: #e74c3c;
}
</style>
