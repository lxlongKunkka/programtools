<template>
  <div class="main-menu">
    <div class="menu-container">
      <h1 class="game-title">Ancient Empires Clone</h1>
      
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
  color: white;
  font-family: 'Courier New', Courier, monospace; /* Retro feel */
}

.menu-container {
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 40px;
  border-radius: 10px;
  border: 2px solid #4a6984;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

.game-title {
  font-size: 3em;
  margin-bottom: 40px;
  color: #e0e0e0;
  text-shadow: 2px 2px 4px #000;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 300px;
  margin: 0 auto;
}

.menu-btn {
  padding: 15px;
  font-size: 1.2em;
  background: #34495e;
  color: white;
  border: 1px solid #5d7a96;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.menu-btn:hover:not(.disabled) {
  background: #41b883;
  transform: scale(1.05);
  border-color: #41b883;
}

.menu-btn:active:not(.disabled) {
  transform: scale(0.95);
}

.menu-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #2c3e50;
}
</style>
