<template>
  <div class="campaign-select">
    <div class="select-container">
      <div class="header-row">
        <button class="back-btn" @click="$emit('cancel')">← Back</button>
        <h2>Campaigns</h2>
      </div>

      <div class="content-row">
        <!-- Campaign List -->
        <div class="list-section">
          <h3>Scenarios</h3>
          <div class="scroll-list">
            <div 
              v-for="camp in campaigns" 
              :key="camp.id" 
              class="list-item" 
              :class="{ selected: selectedCampaignId === camp.id }"
              @click="selectCampaign(camp.id)"
            >
              {{ camp.name }}
            </div>
          </div>
        </div>

        <!-- Stage List -->
        <div class="list-section">
          <h3>Stages</h3>
          <div class="scroll-list" v-if="selectedCampaign">
            <div 
              v-for="(stage, index) in selectedCampaign.stages" 
              :key="index" 
              class="list-item" 
              :class="{ selected: selectedStageIndex === index }"
              @click="selectStage(index)"
            >
              Stage {{ index + 1 }}: {{ stage.name }}
            </div>
          </div>
          <div v-else class="empty-msg">Select a scenario</div>
        </div>
      </div>

      <div class="description-box" v-if="selectedStage">
          <h4>{{ selectedStage.name }}</h4>
          <p>{{ selectedStage.description || 'No description.' }}</p>
      </div>

      <div class="action-row">
        <button class="start-btn" :disabled="!selectedStage" @click="startStage">Start Mission</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { CAMPAIGNS } from '../../game/ancient/campaigns';

const emit = defineEmits(['cancel', 'start']);

const selectedCampaignId = ref(null);
const selectedStageIndex = ref(null);

const campaigns = ref(CAMPAIGNS);

const selectedCampaign = computed(() => campaigns.value.find(c => c.id === selectedCampaignId.value));
const selectedStage = computed(() => {
    if (!selectedCampaign.value || selectedStageIndex.value === null) return null;
    return selectedCampaign.value.stages[selectedStageIndex.value];
});

const selectCampaign = (id) => {
    selectedCampaignId.value = id;
    selectedStageIndex.value = null;
};

const selectStage = (index) => {
    selectedStageIndex.value = index;
};

const startStage = () => {
    if (!selectedStage.value) return;
    emit('start', {
        campaignId: selectedCampaignId.value,
        stageIndex: selectedStageIndex.value,
        stageData: selectedStage.value
    });
};
</script>

<style scoped>
.campaign-select {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: #2c3e50;
  color: white;
  padding: 20px;
}

.select-container {
  background: rgba(0, 0, 0, 0.8);
  padding: 30px;
  border-radius: 10px;
  border: 2px solid #4a6984;
  width: 800px;
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
    margin-bottom: 20px;
}

.list-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 10px;
}

.scroll-list {
    flex: 1;
    overflow-y: auto;
}

.list-item {
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: background 0.2s;
}

.list-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.list-item.selected {
    background: #3498db;
}

.empty-msg {
    color: #7f8c8d;
    text-align: center;
    margin-top: 20px;
}

.description-box {
    height: 100px;
    background: rgba(0, 0, 0, 0.3);
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 4px;
}

.description-box h4 {
    margin: 0 0 5px 0;
    color: #f1c40f;
}

.action-row {
    display: flex;
    justify-content: flex-end;
}

.start-btn {
    padding: 15px 40px;
    font-size: 1.2em;
    background: #e67e22;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.start-btn:disabled {
    background: #7f8c8d;
    cursor: not-allowed;
}
</style>
