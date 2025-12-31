<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { request } from '../utils/request.js';

// --- State ---
const grid = ref([]);
const difficulty = ref('easy');
const boardSize = ref(9);
const loading = ref(false);
const message = ref('');
const timer = ref(0);
let timerInterval = null;

const selectedCell = ref(null);
const isNoteMode = ref(false);
const showErrors = ref(true);
const cellSize = ref(55); // Default size
const history = ref([]);
const mistakes = ref(0);
const isPaused = ref(false);
const maxMistakes = 3;
const isDaily = ref(false);

const showLeaderboard = ref(false);
const leaderboardData = ref([]);
const leaderboardLoading = ref(false);

const getBoxDims = () => {
  if (boardSize.value === 4) return { w: 2, h: 2 };
  if (boardSize.value === 6) return { w: 3, h: 2 };
  return { w: 3, h: 3 };
};

const changeSize = (delta) => {
  const newSize = cellSize.value + delta;
  if (newSize >= 30 && newSize <= 100) {
    cellSize.value = newSize;
  }
};

const remainingCounts = computed(() => {
  const counts = {};
  const size = boardSize.value;
  for (let i = 1; i <= size; i++) counts[i] = size;
  
  if (grid.value && grid.value.length) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = grid.value[r][c].val;
        if (val) {
          const num = parseInt(val);
          if (counts[num] !== undefined) counts[num]--;
        }
      }
    }
  }
  return counts;
});

// --- Game Logic ---

const startTimer = () => {
  stopTimer();
  timer.value = 0;
  timerInterval = setInterval(() => {
    timer.value++;
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const loadGameData = (data) => {
    const newGrid = [];
    const size = boardSize.value;
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const charP = data.puzzle[idx];
        const charS = data.solution[idx];
        const isFixed = charP !== '-';
        
        row.push({
          val: isFixed ? charP : '',
          solution: charS,
          isFixed: isFixed,
          notes: [],
          isError: false,
          animationClass: ''
        });
      }
      newGrid.push(row);
    }
    grid.value = newGrid;
    selectedCell.value = null;
    history.value = [];
    mistakes.value = 0;
    isPaused.value = false;
    startTimer();
    saveProgress();
    fetchLeaderboard();
};

const fetchDailyGame = async () => {
  loading.value = true;
  message.value = '';
  stopTimer();
  
  try {
    const res = await fetch(`/api/daily`);
    const data = await res.json();
    
    difficulty.value = data.difficulty;
    boardSize.value = data.size;
    isDaily.value = true;
    
    loadGameData(data);
  } catch (e) {
    console.error(e);
    message.value = 'Error fetching daily challenge';
  } finally {
    loading.value = false;
  }
};

const fetchGame = async () => {
  loading.value = true;
  message.value = '';
  stopTimer();
  isDaily.value = false;
  
  try {
    const res = await fetch(`/api/game?difficulty=${difficulty.value}&size=${boardSize.value}`);
    const data = await res.json();
    loadGameData(data);
  } catch (e) {
    console.error(e);
    message.value = 'Error connecting to server';
  } finally {
    loading.value = false;
  }
};

const handleSizeChange = () => {
  cellSize.value = 55;
  fetchGame();
};

// --- Interaction ---

const selectCell = (r, c) => {
  selectedCell.value = { r, c };
};

const isSelected = (r, c) => {
  return selectedCell.value && selectedCell.value.r === r && selectedCell.value.c === c;
};

const isRelated = (r, c) => {
  if (!selectedCell.value) return false;
  const { r: sr, c: sc } = selectedCell.value;
  if (r === sr || c === sc) return true;
  
  const { w, h } = getBoxDims();
  const boxR = Math.floor(r / h);
  const boxC = Math.floor(c / w);
  const sBoxR = Math.floor(sr / h);
  const sBoxC = Math.floor(sc / w);
  return boxR === sBoxR && boxC === sBoxC;
};

const getBorderClass = (r, c) => {
  const { w, h } = getBoxDims();
  const classes = [];
  if ((c + 1) % w === 0 && c !== boardSize.value - 1) classes.push('border-right');
  if ((r + 1) % h === 0 && r !== boardSize.value - 1) classes.push('border-bottom');
  return classes;
};

const isSameValue = (r, c) => {
  if (!selectedCell.value) return false;
  const { r: sr, c: sc } = selectedCell.value;
  const sVal = grid.value[sr][sc].val;
  return sVal && grid.value[r][c].val === sVal;
};

const pushHistory = () => {
  history.value.push(JSON.stringify(grid.value));
  if (history.value.length > 20) history.value.shift();
};

const undo = () => {
  if (history.value.length === 0) return;
  const prevState = history.value.pop();
  grid.value = JSON.parse(prevState);
  saveProgress();
};

const togglePause = () => {
  isPaused.value = !isPaused.value;
  if (isPaused.value) {
    stopTimer();
  } else {
    startTimer();
  }
};

const handleInput = (num) => {
  if (isPaused.value) return;
  if (!selectedCell.value) {
    alert('请先选择一个格子');
    return;
  }
  const { r, c } = selectedCell.value;
  const cell = grid.value[r][c];
  
  if (cell.isFixed) return;
  if (cell.val === cell.solution) return;

  const numStr = num.toString();
  pushHistory();

  if (isNoteMode.value) {
    if (cell.val) return;
    const idx = cell.notes.indexOf(numStr);
    if (idx > -1) {
      cell.notes.splice(idx, 1);
    } else {
      cell.notes.push(numStr);
      cell.notes.sort();
    }
  } else {
    if (cell.val === numStr) {
      cell.val = '';
    } else {
      cell.val = numStr;
      cell.notes = [];
      
      if (cell.val !== cell.solution) {
        mistakes.value++;
        if (mistakes.value >= maxMistakes) {
          message.value = 'Game Over! Too many mistakes.';
          stopTimer();
        }
      } else {
        // Auto-remove notes from related cells
        const size = boardSize.value;
        const { w, h } = getBoxDims();
        
        // Row & Col
        for (let i = 0; i < size; i++) {
          // Row
          if (grid.value[r][i].notes.includes(numStr)) {
            grid.value[r][i].notes = grid.value[r][i].notes.filter(n => n !== numStr);
          }
          // Col
          if (grid.value[i][c].notes.includes(numStr)) {
            grid.value[i][c].notes = grid.value[i][c].notes.filter(n => n !== numStr);
          }
        }
        
        // Box
        const startR = Math.floor(r / h) * h;
        const startC = Math.floor(c / w) * w;
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            const bCell = grid.value[startR + i][startC + j];
            if (bCell.notes.includes(numStr)) {
              bCell.notes = bCell.notes.filter(n => n !== numStr);
            }
          }
        }
      }
      
      checkCompletion();
      checkCompletedUnits(r, c);
    }
    if (showErrors.value) {
      validateBoard();
    }
  }
  saveProgress();
};

const checkCompletedUnits = (r, c) => {
  const size = boardSize.value;
  const { w, h } = getBoxDims();
  
  // Check Row
  let rowComplete = true;
  for (let i = 0; i < size; i++) {
    if (grid.value[r][i].val !== grid.value[r][i].solution) {
      rowComplete = false;
      break;
    }
  }
  if (rowComplete) {
    triggerAnimation(grid.value[r]);
  }

  // Check Col
  let colComplete = true;
  const colCells = [];
  for (let i = 0; i < size; i++) {
    colCells.push(grid.value[i][c]);
    if (grid.value[i][c].val !== grid.value[i][c].solution) {
      colComplete = false;
      break;
    }
  }
  if (colComplete) {
    triggerAnimation(colCells);
  }

  // Check Box
  let boxComplete = true;
  const boxCells = [];
  const startR = Math.floor(r / h) * h;
  const startC = Math.floor(c / w) * w;
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const cell = grid.value[startR + i][startC + j];
      boxCells.push(cell);
      if (cell.val !== cell.solution) {
        boxComplete = false;
      }
    }
  }
  
  if (boxComplete) {
    triggerAnimation(boxCells);
  }
};

const triggerAnimation = (cells) => {
  cells.forEach(cell => {
    cell.animationClass = 'success-pulse';
  });
  setTimeout(() => {
    cells.forEach(cell => {
      cell.animationClass = '';
    });
  }, 1500);
};

const eraseCell = () => {
  if (isPaused.value) return;
  if (!selectedCell.value) return;
  const { r, c } = selectedCell.value;
  const cell = grid.value[r][c];
  if (cell.isFixed) return;
  if (cell.val === cell.solution) return;
  
  pushHistory();
  cell.val = '';
  cell.notes = [];
  cell.isError = false;
  saveProgress();
};

const validateBoard = () => {
  const size = boardSize.value;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid.value[r][c].isFixed) {
        grid.value[r][c].isError = false;
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid.value[r][c];
      if (cell.val && cell.val !== cell.solution) {
        cell.isError = true;
      }
    }
  }
};

const submitScore = async () => {
  try {
    const res = await request('/api/submit', {
      method: 'POST',
      body: JSON.stringify({
        difficulty: difficulty.value,
        size: boardSize.value,
        timeElapsed: timer.value,
        mistakes: mistakes.value,
        isDaily: isDaily.value
      })
    });
    
    if (res && res.success) {
      fetchLeaderboard();
    } else {
      console.error('Score submission failed:', res);
    }
  } catch (e) {
    console.error('Failed to submit score', e);
  }
};

const fetchLeaderboard = async () => {
  leaderboardLoading.value = true;
  try {
    const data = await request(`/api/leaderboard?difficulty=${difficulty.value}&size=${boardSize.value}`);
    leaderboardData.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to fetch leaderboard', e);
    leaderboardData.value = [];
  } finally {
    leaderboardLoading.value = false;
  }
};

const checkCompletion = () => {
  const size = boardSize.value;
  let isFull = true;
  let isCorrect = true;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid.value[r][c];
      if (!cell.val) {
        isFull = false;
        break;
      }
      if (cell.val !== cell.solution) {
        isCorrect = false;
      }
    }
  }
  
  if (isFull && isCorrect) {
    stopTimer();
    message.value = `Complete! Time: ${formatTime(timer.value)}`;
    submitScore();
  }
};

const getHint = () => {
  if (isPaused.value) return;
  const size = boardSize.value;
  let targetR = -1, targetC = -1;
  
  if (selectedCell.value && !grid.value[selectedCell.value.r][selectedCell.value.c].val) {
    targetR = selectedCell.value.r;
    targetC = selectedCell.value.c;
  } else {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid.value[r][c].val) {
          targetR = r;
          targetC = c;
          break;
        }
      }
      if (targetR !== -1) break;
    }
  }
  
  if (targetR !== -1) {
    const cell = grid.value[targetR][targetC];
    cell.val = cell.solution;
    cell.notes = [];
    cell.isFixed = true; 
    checkCompletion();
    saveProgress();
  }
};

const onKeyDown = (e) => {
  if (loading.value) return;
  
  const key = e.key;
  const size = boardSize.value;
  
  if (/^[1-9]$/.test(key)) {
    const num = parseInt(key);
    if (num <= size) {
      handleInput(num);
    }
    return;
  }
  
  if (selectedCell.value) {
    let { r, c } = selectedCell.value;
    if (key === 'ArrowUp') r = (r - 1 + size) % size;
    if (key === 'ArrowDown') r = (r + 1) % size;
    if (key === 'ArrowLeft') c = (c - 1 + size) % size;
    if (key === 'ArrowRight') c = (c + 1) % size;
    selectCell(r, c);
  }
  
  if (key === 'Backspace' || key === 'Delete') {
    eraseCell();
  }
  if (key === 'n' || key === 'N') {
    isNoteMode.value = !isNoteMode.value;
  }
};

const saveProgress = () => {
  const state = {
    grid: grid.value,
    timer: timer.value,
    difficulty: difficulty.value,
    boardSize: boardSize.value,
    mistakes: mistakes.value
  };
  localStorage.setItem('sudoku-state', JSON.stringify(state));
};

const loadProgress = () => {
  const saved = localStorage.getItem('sudoku-state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      grid.value = state.grid;
      timer.value = state.timer;
      difficulty.value = state.difficulty;
      boardSize.value = state.boardSize || 9;
      mistakes.value = state.mistakes || 0;
      startTimer();
      return true;
    } catch (e) {
      console.error('Failed to load save', e);
      return false;
    }
  }
  return false;
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  if (!loadProgress()) {
    fetchGame();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  stopTimer();
});
</script>

<template>
  <div class="game-container" :style="{ 
    '--cell-size': cellSize + 'px', 
    '--font-size': (cellSize * 0.55) + 'px',
    '--note-size': (cellSize * 0.25) + 'px',
    '--ui-size': (cellSize * 0.3) + 'px'
  }">
    <div class="top-bar">
      <div class="difficulty-tabs">
        <button 
          v-for="diff in ['easy', 'medium', 'hard', 'expert']" 
          :key="diff"
          :class="{ active: difficulty === diff }"
          @click="difficulty = diff; fetchGame()"
        >
          {{ diff.charAt(0).toUpperCase() + diff.slice(1) }}
        </button>
      </div>
      <div class="size-selector">
        <select v-model="boardSize" @change="handleSizeChange">
          <option :value="4">4x4</option>
          <option :value="6">6x6</option>
          <option :value="9">9x9</option>
        </select>
      </div>
    </div>

    <div class="main-content">
      <div class="daily-section">
        <h3>Daily Challenge</h3>
        <div class="daily-card" @click="fetchDailyGame" :class="{ active: isDaily }">
          <div class="daily-icon">📅</div>
          <div class="daily-info">
            <div class="daily-title">{{ new Date().toLocaleDateString() }}</div>
            <div class="daily-desc">Hard • 9x9</div>
          </div>
        </div>
      </div>

      <div class="board-section">
        <div class="board-wrapper">
          <div v-if="isPaused" class="paused-overlay">
            <div class="paused-text">PAUSED</div>
            <button class="resume-btn" @click="togglePause">Resume</button>
          </div>
          <div class="board" :class="{ loading, paused: isPaused }">
            <div v-for="(row, r) in grid" :key="r" class="row">
              <div 
                v-for="(cell, c) in row" 
                :key="c" 
                class="cell"
                :class="[
                  ...getBorderClass(r, c),
                  {
                    'selected': isSelected(r, c),
                    'related': isRelated(r, c) && !isSelected(r, c),
                    'same-value': isSameValue(r, c) && !isSelected(r, c),
                    'fixed': cell.isFixed,
                    'error': cell.isError,
                    [cell.animationClass]: !!cell.animationClass
                  }
                ]"
                @click="selectCell(r, c)"
              >
                <span v-if="cell.val" class="value">{{ cell.val }}</span>
                <div v-else-if="cell.notes.length" class="notes-grid" :style="{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(boardSize))}, 1fr)` }">
                  <span v-for="n in boardSize" :key="n" class="note-num">
                    {{ cell.notes.includes(n.toString()) ? n : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="controls-section">
        <div class="status-bar">
          <div class="stat-item">
            <span class="label">Mistakes:</span>
            <span class="value">{{ mistakes }}/{{ maxMistakes }}</span>
          </div>
          <div class="stat-item">
            <span class="label">Time:</span>
            <span class="value">{{ formatTime(timer) }}</span>
            <button class="pause-btn" @click="togglePause">{{ isPaused ? '▶' : '⏸' }}</button>
          </div>
        </div>

        <div class="tools-grid">
          <button class="tool-btn-circle" @click="undo" title="Undo">
            <span class="icon">↩</span>
            <span class="text">Undo</span>
          </button>
          <button class="tool-btn-circle" @click="eraseCell" title="Erase">
            <span class="icon">⌫</span>
            <span class="text">Erase</span>
          </button>
          <button class="tool-btn-circle" :class="{ active: isNoteMode }" @click="isNoteMode = !isNoteMode" title="Notes">
            <span class="icon">✎</span>
            <span class="text">Notes</span>
            <span class="badge" v-if="isNoteMode">ON</span>
          </button>
          <button class="tool-btn-circle" @click="getHint" title="Hint">
            <span class="icon">💡</span>
            <span class="text">Hint</span>
          </button>
        </div>

        <div class="numpad-grid" :style="{ gridTemplateColumns: boardSize > 6 ? 'repeat(3, 1fr)' : `repeat(${Math.ceil(Math.sqrt(boardSize))}, 1fr)` }">
          <button v-for="n in boardSize" :key="n" @click="handleInput(n)" :class="{ 'completed': remainingCounts[n] <= 0 }">
            <span class="num">{{ n }}</span>
            <span class="count">{{ remainingCounts[n] }}</span>
          </button>
        </div>

        <div class="action-buttons">
          <button class="new-game-btn" @click="fetchGame">New Game</button>
          <div class="zoom-controls">
            <button @click="changeSize(-5)">-</button>
            <span>Size</span>
            <button @click="changeSize(5)">+</button>
          </div>
        </div>
      </div>

      <div class="leaderboard-section">
        <h3>Leaderboard</h3>
        <div v-if="leaderboardLoading">Loading...</div>
        <div v-else-if="leaderboardData.length === 0">No records yet.</div>
        <table v-else class="leaderboard-table-small">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, index) in leaderboardData.slice(0, 10)" :key="index">
              <td>{{ index + 1 }}</td>
              <td class="user-cell" :title="entry.username">{{ entry.username }}</td>
              <td>{{ formatTime(entry.timeElapsed) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div v-if="message" class="modal-overlay">
      <div class="modal">
        <h2>{{ message }}</h2>
        <button @click="message = ''">Close</button>
        <button @click="fetchGame">Play Again</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  user-select: none;
  padding: 20px;
  background-color: #eaf2f8;
  min-height: 100vh;
}

.top-bar {
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.difficulty-tabs {
  display: flex;
  gap: 10px;
}

.difficulty-tabs button {
  background: none;
  border: none;
  font-size: 16px;
  color: #7f8c8d;
  cursor: pointer;
  padding: 5px 10px;
  font-weight: 600;
}

.difficulty-tabs button.active {
  color: #3498db;
  border-bottom: 2px solid #3498db;
}

.size-selector select {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  background-color: white;
}

.main-content {
  display: flex;
  flex-direction: row;
  gap: 40px;
  align-items: flex-start;
  justify-content: center;
}

@media (max-width: 1100px) {
  .main-content {
    flex-wrap: wrap;
  }
  .leaderboard-section, .daily-section {
    width: 100%;
    max-width: 500px;
    margin-top: 20px;
  }
  .daily-section {
    order: -1; /* Keep daily on top on mobile if desired, or remove to keep order */
  }
}

@media (max-width: 800px) {
  .main-content {
    flex-direction: column;
    align-items: center;
  }
}

.board-section {
  display: flex;
  justify-content: center;
}

.controls-section {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  font-size: 18px;
  color: #2c3e50;
  font-weight: bold;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tools-grid {
  display: flex;
  justify-content: space-between;
}

.tool-btn-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #eef2f5;
  border: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: #3498db;
  position: relative;
  transition: background 0.2s;
}

.tool-btn-circle:hover {
  background: #e0e6ed;
}

.tool-btn-circle.active {
  background: #3498db;
  color: white;
}

.tool-btn-circle .icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.tool-btn-circle .text {
  font-size: 10px;
  font-weight: bold;
}

.tool-btn-circle .badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #3498db;
  color: white;
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 10px;
  border: 2px solid white;
}

.numpad-grid {
  display: grid;
  gap: 10px;
}

.numpad-grid button {
  height: 60px;
  background: #eef2f5;
  border: none;
  border-radius: 5px;
  color: #3498db;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.numpad-grid button .num {
  font-size: 32px;
  line-height: 1;
}

.numpad-grid button .count {
  font-size: 14px;
  color: #7f8c8d;
  margin-top: -2px;
  font-weight: 500;
}

.numpad-grid button.completed {
  opacity: 0.5;
  background: #f8f9fa;
  color: #bdc3c7;
}

.numpad-grid button:hover {
  background: #dbe2e8;
}

.numpad-grid button:active {
  background: #cbd5e0;
}

.new-game-btn {
  width: 100%;
  padding: 15px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 30px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 10px;
}

.new-game-btn:hover {
  background: #2980b9;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.board-wrapper {
  position: relative;
  padding: 5px;
  background: #2c3e50;
  border-radius: 4px;
}

.board {
  display: flex;
  flex-direction: column;
  background: #fff;
}

.board.loading {
  opacity: 0.5;
  pointer-events: none;
}

.board.paused {
  filter: blur(5px);
  pointer-events: none;
}

.paused-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  background: rgba(255,255,255,0.6);
}

.paused-text {
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
}

.resume-btn {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.pause-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: #555;
}

.row {
  display: flex;
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border: 1px solid #bdc3c7;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
  font-size: var(--font-size);
  color: #2980b9;
  transition: background-color 0.1s;
}

/* Grid Borders */
.border-right { border-right: 2px solid #2c3e50; }
.border-bottom { border-bottom: 2px solid #2c3e50; }

/* States */
.cell.fixed {
  background-color: #e8f4f8;
  color: #154360;
  font-weight: bold;
}

.cell.selected {
  background-color: #bbdefb !important;
}

.cell.related {
  background-color: #e3f2fd;
}

.cell.same-value {
  background-color: #c5cae9;
}

.cell.error {
  background-color: #ffcdd2 !important;
  color: #d32f2f;
}

.cell.success-pulse {
  z-index: 2;
  background-color: #B3E5FC !important; /* Macaron Blue */
  transition: background-color 0.3s;
}

.cell.success-pulse .value {
  display: inline-block;
  animation: jump 0.5s ease-in-out 2;
}

@keyframes jump {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Notes */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  font-size: var(--note-size);
  line-height: 1;
  color: #7f8c8d;
}

.note-num {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.leaderboard-section {
  width: 250px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.daily-section {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.daily-section h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  text-align: center;
}

.daily-card {
  background: white;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}

.daily-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.daily-card.active {
  border-color: #3498db;
  background-color: #f0f9ff;
}

.daily-icon {
  font-size: 24px;
}

.daily-info {
  display: flex;
  flex-direction: column;
}

.daily-title {
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
}

.daily-desc {
  font-size: 12px;
  color: #7f8c8d;
}

.leaderboard-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #2c3e50;
  text-align: center;
}

.leaderboard-table-small {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.leaderboard-table-small th, .leaderboard-table-small td {
  padding: 6px 4px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.leaderboard-table-small th {
  font-weight: bold;
  color: #7f8c8d;
}

.user-cell {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal h2 { margin-top: 0; }
.modal button {
  margin: 10px;
  padding: 8px 20px;
  cursor: pointer;
}

.zoom-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  color: #666;
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
}
</style>
