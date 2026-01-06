<template>
  <div class="unit-store-dialog-overlay" @click.self="close">
    <div class="unit-store-dialog">
      <div class="dialog-content">
        <!-- Left Column: Unit List -->
        <div class="unit-list-container">
          <div class="unit-list">
            <div 
              v-for="unitType in buyableUnits" 
              :key="unitType"
              class="unit-list-item"
              :class="{ selected: selectedUnitType === unitType }"
              @click="selectUnit(unitType)"
            >
              <div class="unit-icon-wrapper">
                 <div v-if="UNIT_STATS[unitType].spriteAtlas" class="unit-icon" :style="getUnitIconStyle(unitType)"></div>
                 <span v-else class="unit-symbol">{{ UNIT_STATS[unitType].symbol }}</span>
              </div>
              <span class="unit-name">{{ formatName(unitType) }}</span>
            </div>
          </div>
        </div>

        <!-- Right Column: Unit Details -->
        <div class="unit-details-container">
          <div class="unit-detail-header">
             <div class="detail-unit-icon-wrapper">
                <div v-if="currentStats.spriteAtlas" class="detail-unit-icon" :style="getDetailIconStyle(selectedUnitType)"></div>
             </div>
             <h2 class="detail-unit-name">{{ formatName(selectedUnitType) }}</h2>
          </div>

          <div class="unit-header-info">
            <div class="info-item">
              <span class="label">Price:</span>
              <span class="value price" :class="{ affordable: canAfford }">{{ currentStats.cost }}G</span>
            </div>
            <div class="info-item">
              <span class="label">Range:</span>
              <span class="value">{{ formatRange(currentStats.range) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Pop:</span>
              <span class="value">{{ currentStats.population }}</span>
            </div>
          </div>

          <div class="unit-stats-grid">
            <div class="stat-circle">
              <span class="stat-label">ATK</span>
              <span class="stat-value" :class="currentStats.attackType">{{ currentStats.attack }}</span>
            </div>
            <div class="stat-circle">
              <span class="stat-label">MOV</span>
              <span class="stat-value">{{ currentStats.move }}</span>
            </div>
            <div class="stat-circle">
              <span class="stat-label">DEF</span>
              <span class="stat-value">{{ currentStats.physDef }}</span>
            </div>
            <div class="stat-circle">
              <span class="stat-label">M.DEF</span>
              <span class="stat-value">{{ currentStats.magDef }}</span>
            </div>
          </div>

          <div class="unit-description-box">
            <p>{{ description }}</p>
            <p class="quote" v-if="quote">"{{ quote }}"</p>
          </div>

          <div class="dialog-actions">
            <button 
              class="recruit-btn" 
              :disabled="!canBuy"
              @click="recruit"
            >
              Recruit
            </button>
            <button class="close-btn" @click="close">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { UNIT_STATS, UNIT_TYPES, UNIT_DESCRIPTIONS, UNIT_QUOTES, ATTACK_TYPES } from '../game/ancient/constants';

const props = defineProps({
  gameState: {
    type: Object,
    required: true
  },
  castle: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'buy']);
const TEAMS_LIST = ['blue', 'red', 'green', 'black'];

// Filter out non-buyable units (King, Skeleton, etc.)
const buyableUnits = computed(() => {
  return Object.values(UNIT_TYPES).filter(type => {
    const stats = UNIT_STATS[type];
    // Exclude King, Skeleton, Wisdom Crystal
    return type !== UNIT_TYPES.KING && type !== UNIT_TYPES.SKELETON && type !== UNIT_TYPES.WISDOM_CRYSTAL && stats;
  }).sort((a, b) => {
    const statsA = UNIT_STATS[a];
    const statsB = UNIT_STATS[b];
    
    // Primary sort: Cost (Low to High) - Matching Rule.java logic
    if (statsA.cost !== statsB.cost) {
      return statsA.cost - statsB.cost;
    }
    
    // Secondary sort: Unit ID (inferred from spriteAtlas 'uX')
    // This mimics the stable sort on original indices in Java
    const idA = parseInt(statsA.spriteAtlas.substring(1)) || 0;
    const idB = parseInt(statsB.spriteAtlas.substring(1)) || 0;
    return idA - idB;
  });
});

const selectedUnitType = ref(buyableUnits.value[0]);

const currentStats = computed(() => UNIT_STATS[selectedUnitType.value]);
const description = computed(() => UNIT_DESCRIPTIONS[selectedUnitType.value] || 'No description available.');
const quote = computed(() => UNIT_QUOTES[selectedUnitType.value]);

const currentPlayerMoney = computed(() => {
  return props.gameState.money[props.gameState.currentTurn];
});

const canAfford = computed(() => {
  return currentPlayerMoney.value >= currentStats.value.cost;
});

const canBuy = computed(() => {
  return canAfford.value; // Add population check later if needed
});

function selectUnit(type) {
  selectedUnitType.value = type;
}

function formatName(type) {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatRange(range) {
  if (Array.isArray(range)) {
    return `${range[0]}-${range[1]}`;
  }
  return range;
}

function recruit() {
  if (canBuy.value) {
    emit('buy', selectedUnitType.value);
  }
}

function close() {
  emit('close');
}

// Helper to get unit sprite style (handling team colors)
function getUnitIconStyle(type) {
    const stats = UNIT_STATS[type];
    if (!stats || !stats.spriteAtlas) return {};

    const unitIndex = parseInt(stats.spriteAtlas.substring(1));
    
    // Removed individual sprite check as requested. All units in sheets.
    // const isIndividual = unitIndex >= 19 || unitIndex === 11;

    // Use Team Sheet
    const team = props.gameState.currentTurn;
    const teamIndex = Math.max(0, TEAMS_LIST.indexOf(team));
    
    // Assumption: Sheet has 2 rows (Active, Done).
    // Height of sheet is roughly 2 * TILE_SIZE.
    // We want to display the sprite in a 32px box.
    // The original sprites are likely 48px (TILE_SIZE).
    // If we set background-height to 64px (32*2), the sprite will be 32px tall.
    // Offset X is unitIndex * 32px.
    
    return {
        backgroundImage: `url(/sprites_atlas/unit_sheet_${teamIndex}.png)`,
        backgroundSize: `auto 64px`, // Scale height to fit 2 rows of 32px
        backgroundPosition: `-${unitIndex * 32}px 0px`, // Frame 0
        imageRendering: 'pixelated' // Keep sprites crisp
    };
}

function getDetailIconStyle(type) {
    const stats = UNIT_STATS[type];
    if (!stats || !stats.spriteAtlas) return {};

    const unitIndex = parseInt(stats.spriteAtlas.substring(1));
    const team = props.gameState.currentTurn;
    const teamIndex = Math.max(0, TEAMS_LIST.indexOf(team));
    
    // Scale for detail view (64x64px)
    return {
        backgroundImage: `url(/sprites_atlas/unit_sheet_${teamIndex}.png)`,
        backgroundSize: `auto 128px`, 
        backgroundPosition: `-${unitIndex * 64}px 0px`, 
        imageRendering: 'pixelated'
    };
}
</script>

<style scoped>
.unit-store-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.unit-store-dialog {
  background: #2c3e50;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  width: 600px;
  height: 450px;
  color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

.dialog-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 10px;
}

/* Left Column */
.unit-list-container {
  width: 200px;
  border-right: 1px solid #34495e;
  overflow-y: auto;
  padding-right: 10px;
}

.unit-list-item {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
  transition: background 0.2s;
}

.unit-list-item:hover {
  background: #34495e;
}

.unit-list-item.selected {
  background: #3498db;
}

.unit-icon-wrapper {
  width: 32px;
  height: 32px;
  margin-right: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
}

.unit-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.unit-symbol {
  font-size: 20px;
}

.unit-name {
  font-size: 14px;
  font-weight: bold;
}

/* Right Column */
.unit-details-container {
  flex: 1;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
}

.unit-detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  gap: 15px;
}

.detail-unit-icon-wrapper {
  width: 64px;
  height: 64px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid #34495e;
  flex-shrink: 0;
}

.detail-unit-icon {
  width: 64px;
  height: 64px;
}

.detail-unit-name {
  font-size: 24px;
  color: #ecf0f1;
  margin: 0;
  text-transform: capitalize;
}

.unit-header-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  background: rgba(0,0,0,0.2);
  padding: 10px;
  border-radius: 4px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info-item .label {
  font-size: 12px;
  color: #bdc3c7;
}

.info-item .value {
  font-size: 16px;
  font-weight: bold;
}

.info-item .value.price {
  color: #e74c3c;
}

.info-item .value.price.affordable {
  color: #2ecc71;
}

.unit-stats-grid {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.stat-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #34495e;
  border: 2px solid #7f8c8d;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.stat-label {
  font-size: 10px;
  color: #bdc3c7;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
}

.stat-value.physical {
  color: #e67e22; /* Orange for physical */
}

.stat-value.magical {
  color: #9b59b6; /* Purple for magical */
}

.unit-description-box {
  flex: 1;
  background: rgba(0,0,0,0.2);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.4;
}

.unit-description-box .quote {
  margin-top: 10px;
  font-style: italic;
  color: #95a5a6;
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
}

.recruit-btn {
  background: #2ecc71;
  color: white;
}

.recruit-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.close-btn {
  background: #e74c3c;
  color: white;
}
</style>
