<template>
  <div class="sprite-gallery">
    <h1>Sprite Gallery</h1>
    <p>Use this gallery to identify sprite IDs for units and terrain.</p>
    
    <div class="controls">
        <label>
            Background: 
            <input type="color" v-model="bgColor">
        </label>
        <label>
            Size:
            <input type="range" min="1" max="5" v-model="scale"> {{ scale }}x
        </label>
    </div>

    <div v-for="(files, category) in categories" :key="category">
        <h2>{{ category }}</h2>
        <div class="gallery-grid">
            <div v-for="file in files" :key="file" class="sprite-item">
                <div class="img-container" :style="{ backgroundColor: bgColor }">
                    <img 
                        :src="`/sprites_atlas/${file}`" 
                        :style="{ transform: `scale(${scale})`, transformOrigin: 'center' }"
                        loading="lazy"
                    />
                </div>
                <div class="sprite-id">{{ file }}</div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const bgColor = ref('#808080');
const scale = ref(2);
const categories = ref({});

// Fetch manifest from public folder
onMounted(() => {
    fetch('/sprites_atlas/manifest.json')
        .then(res => res.json())
        .then(data => {
            categories.value = data;
        })
        .catch(err => console.error("Failed to load manifest", err));
});

</script>

<style scoped>
.sprite-gallery {
  padding: 20px;
  color: white;
  background: #222;
  min-height: 100vh;
}

.controls {
    margin-bottom: 20px;
    display: flex;
    gap: 20px;
    background: #333;
    padding: 10px;
    border-radius: 8px;
}

.gallery-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.sprite-item {
  background: #444;
  border-radius: 4px;
  padding: 5px;
  text-align: center;
  width: 80px;
}

.img-container {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin: 0 auto;
    border: 1px solid #555;
}

.sprite-id {
  margin-top: 5px;
  font-family: monospace;
  font-size: 12px;
  color: #aaa;
}
</style>