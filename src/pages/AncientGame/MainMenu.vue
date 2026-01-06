<template>
  <div class="main-menu" :style="{ backgroundImage: `url(/ui/background.png)` }">
    <div class="menu-overlay">
      <h1 class="game-title">Ancient Empires</h1>
      
      <div class="menu-buttons">
        <button class="menu-btn" @click="$emit('select', 'skirmish')">Skirmish</button>
        <button class="menu-btn" @click="$emit('select', 'campaign')">Campaign</button>
        <button class="menu-btn" @click="$emit('select', 'multiplayer')">Multiplayer</button>
        <button class="menu-btn" @click="$emit('select', 'editor')">Map Editor</button>
        <button class="menu-btn disabled" title="Not implemented">Load Game</button>
        <button class="menu-btn disabled" title="Not implemented">Manage Maps</button>
        <button class="menu-btn disabled" title="Not implemented">Help</button>
        <button class="menu-btn" @click="$emit('select', 'exit')">Exit</button>
      </div>

      <div class="version-label">v0.1.0 (JS Port)</div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['select']);
</script>

<style scoped>
.main-menu {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: #2c3e50;
  background-size: cover;
  background-position: center;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  position: relative;
}

.menu-overlay {
  /* Optional: Darken background slightly to make text pop */
  background: rgba(0, 0, 0, 0.3); 
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.game-title {
  font-size: 4em;
  margin-bottom: 60px;
  color: #f1c40f;
  text-shadow: 4px 4px 0px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  font-family: 'Impact', sans-serif; /* Or a custom font if available */
  letter-spacing: 2px;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 250px;
}

.menu-btn {
  padding: 12px;
  font-size: 1.1em;
  font-weight: bold;
  color: #e0e0e0;
  background: linear-gradient(to bottom, #4a6984, #2c3e50);
  border: 2px solid #7f8c8d;
  border-radius: 8px;
  cursor: pointer;
  text-transform: uppercase;
  box-shadow: 0 4px 0 #1a252f;
  transition: transform 0.1s, box-shadow 0.1s;
  text-shadow: 1px 1px 2px black;
}

.menu-btn:hover:not(.disabled) {
  background: linear-gradient(to bottom, #5d7a96, #34495e);
  border-color: #95a5a6;
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #1a252f;
}

.menu-btn:active:not(.disabled) {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #1a252f;
}

.menu-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(100%);
}

.version-label {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
}
</style>
