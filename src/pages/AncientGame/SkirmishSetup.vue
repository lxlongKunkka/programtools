<template>
  <div class="skirmish-setup">
    <div class="setup-container">
      <div class="header-row">
        <button class="back-btn" @click="$emit('cancel')">← Back</button>
        <h2>Skirmish Setup</h2>
      </div>

      <div class="content-row">
        <!-- Map Selection List -->
        <div class="map-list-section">
          <h3>Select Map</h3>
          <div class="map-list">
            <div 
              v-for="map in maps" 
              :key="map._id" 
              class="map-item" 
              :class="{ selected: selectedMapId === map._id }"
              @click="selectMap(map._id)"
            >
              <span class="map-name">{{ map.name }}</span>
              <span class="map-size">{{ map.width }}x{{ map.height }}</span>
            </div>
          </div>
        </div>

        <!-- Map Preview & Settings -->
        <div class="settings-section" v-if="selectedMap">
          <div class="map-preview">
            <!-- Simple canvas preview or placeholder -->
            <div class="preview-placeholder">
                <div class="preview-info">
                    <h4>{{ selectedMap.name }}</h4>
                    <p>Size: {{ selectedMap.width }} x {{ selectedMap.height }}</p>
                    <p>Players: {{ playerCount }}</p>
                </div>
                <!-- We could render a mini-map here later -->
            </div>
          </div>

          <div class="team-settings">
            <h3>Team Settings</h3>
            <div class="team-row" v-for="team in availableTeams" :key="team.color">
              <div class="team-color" :style="{ backgroundColor: team.color }"></div>
              <span class="team-name">{{ team.name }}</span>
              <select v-model="teamConfig[team.id].type">
                <option value="human">Human</option>
                <option value="cpu">CPU</option>
                <option value="none">None</option>
              </select>
              <select v-model="teamConfig[team.id].alliance">
                 <option :value="1">Alliance 1</option>
                 <option :value="2">Alliance 2</option>
                 <option :value="3">Alliance 3</option>
                 <option :value="4">Alliance 4</option>
              </select>
              <div class="gold-input">
                  <span>Gold:</span>
                  <input type="number" v-model.number="teamConfig[team.id].gold" min="0" step="50">
              </div>
            </div>
          </div>

          <div class="action-row">
            <button class="start-btn" @click="startGame">Start Game</button>
          </div>
        </div>
        <div v-else class="settings-section empty">
            <p>Select a map to configure settings.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  maps: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['cancel', 'start']);

const selectedMapId = ref(null);
const teamConfig = ref({
    blue: { type: 'human', alliance: 1, gold: 100 },
    red: { type: 'cpu', alliance: 2, gold: 100 },
    green: { type: 'none', alliance: 3, gold: 100 },
    black: { type: 'none', alliance: 4, gold: 100 }
});

const availableTeams = [
    { id: 'blue', name: 'Blue', color: '#3498db' },
    { id: 'red', name: 'Red', color: '#e74c3c' },
    { id: 'green', name: 'Green', color: '#2ecc71' },
    { id: 'black', name: 'Black', color: '#34495e' }
];

const selectedMap = computed(() => props.maps.find(m => m._id === selectedMapId.value));

const playerCount = computed(() => {
    if (!selectedMap.value) return 0;
    // Estimate player count based on units or buildings in map data
    // For now, just return 2 as default
    return 2; 
});

const selectMap = (id) => {
    selectedMapId.value = id;
    // Reset config or load map defaults if available
};

const startGame = () => {
    if (!selectedMapId.value) return;
    
    // Filter out 'none' teams
    const activeTeams = {};
    Object.entries(teamConfig.value).forEach(([teamId, config]) => {
        if (config.type !== 'none') {
            activeTeams[teamId] = config;
        }
    });

    emit('start', {
        levelId: selectedMapId.value,
        players: activeTeams
    });
};

// Select first map by default if available
watch(() => props.maps, (newMaps) => {
    if (newMaps.length > 0 && !selectedMapId.value) {
        selectedMapId.value = newMaps[0]._id;
    }
}, { immediate: true });

</script>

<style scoped>
.skirmish-setup {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: #2c3e50;
  color: white;
  padding: 20px;
}

.setup-container {
  background: rgba(0, 0, 0, 0.8);
  padding: 30px;
  border-radius: 10px;
  border: 2px solid #4a6984;
  width: 900px;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.header-row {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    position: relative;
}

.header-row h2 {
    flex: 1;
    text-align: center;
    margin: 0;
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

.content-row {
    display: flex;
    flex: 1;
    gap: 20px;
    overflow: hidden;
}

.map-list-section {
    width: 300px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #555;
    padding-right: 20px;
}

.map-list {
    flex: 1;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

.map-item {
    padding: 10px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.map-item:hover {
    background: rgba(255, 255, 255, 0.2);
}

.map-item.selected {
    background: #3498db;
}

.settings-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.map-preview {
    height: 200px;
    background: #000;
    border: 1px solid #555;
    display: flex;
    justify-content: center;
    align-items: center;
}

.preview-info {
    text-align: center;
}

.team-settings {
    flex: 1;
    overflow-y: auto;
}

.team-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    background: rgba(255, 255, 255, 0.05);
    padding: 10px;
    border-radius: 4px;
}

.team-color {
    width: 20px;
    height: 20px;
    border: 1px solid #fff;
}

.team-name {
    width: 60px;
}

.gold-input {
    display: flex;
    align-items: center;
    gap: 5px;
}

.gold-input input {
    width: 60px;
}

.action-row {
    display: flex;
    justify-content: flex-end;
}

.start-btn {
    padding: 15px 40px;
    font-size: 1.2em;
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.start-btn:hover {
    background: #2ecc71;
}
</style>
