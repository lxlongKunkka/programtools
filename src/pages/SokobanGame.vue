<template>
  <div class="app-container">
    <div v-if="notification.show" class="notification-toast" :class="notification.type">
      {{ notification.message }}
    </div>
    <!-- 顶部导航 -->
    <nav class="top-nav">
      <div class="nav-content">
        <div class="brand">
          <span class="brand-icon">🧩</span>
          <span class="brand-text">Sokoban</span>
        </div>
        <div class="nav-tabs">
          <span class="tab" :class="{ active: viewMode === 'play' }" @click="switchView('play')">Classic</span>
          <span class="tab" :class="{ active: viewMode === 'editor' }" @click="switchView('editor')">Level Editor</span>
        </div>
      </div>
    </nav>

    <!-- 关卡编辑器视图 -->
    <div v-if="viewMode === 'editor'" class="main-container">
      <div class="game-layout">
        <!-- 左侧：工具栏 -->
        <aside class="side-panel left-panel">
          <div class="panel-card">
            <h3>Tools</h3>
            <div class="tools-grid">
              <div 
                v-for="tool in editorTools" 
                :key="tool.id"
                class="tool-item"
                :class="{ active: selectedTool === tool.id }"
                @click="selectedTool = tool.id"
              >
                <span class="tool-icon">{{ tool.icon }}</span>
                <span class="tool-name">{{ tool.name }}</span>
              </div>
            </div>
          </div>
          
          <div class="panel-card">
            <h3>Settings</h3>
            <div class="form-group">
              <label>Level Name</label>
              <input v-model="editorMeta.name" placeholder="My Custom Level" class="input-field" />
            </div>
            <div class="form-group">
              <label>Description</label>
              <input v-model="editorMeta.description" placeholder="Short description" class="input-field" />
            </div>
            <div class="form-group">
              <label>Grid Size</label>
              <div class="size-controls">
                <button @click="resizeGrid(-1)">-</button>
                <span>{{ editorSize }} x {{ editorSize }}</span>
                <button @click="resizeGrid(1)">+</button>
              </div>
            </div>
          </div>
        </aside>

        <!-- 中间：编辑网格 -->
        <main class="game-stage">
          <div class="stage-card">
            <div class="stage-header">
              <div class="level-title">
                <span class="label">DESIGN MODE</span>
                <h2>{{ editorMeta.name || 'Untitled Level' }}</h2>
              </div>
              <div class="status-badge" :class="{ verified: editorVerified }">
                {{ editorVerified ? '✅ Verified' : '⚠️ Unverified' }}
              </div>
            </div>

            <div class="board-wrapper">
              <div class="game-board editor-board">
                <div v-for="(row, y) in editorMap" :key="y" class="game-row">
                  <div 
                    v-for="(tile, x) in row" 
                    :key="`${x}-${y}`"
                    :class="['game-cell', getTileClass(tile)]"
                    @mousedown="startDrawing(x, y)"
                    @mouseenter="continueDrawing(x, y)"
                    @mouseup="stopDrawing"
                  >
                    <div v-if="isTargetCellRaw(tile)" class="target-mark">📍</div>
                    <div class="tile-content">
                      <span v-if="isPlayerRaw(tile)" class="sprite player">🐹</span>
                      <span v-else-if="isBoxRaw(tile)" class="sprite box">📦</span>
                      <span v-else-if="isWall(tile)" class="sprite wall">🧱</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="editor-hint">
              Click and drag to paint. You must <b>Test & Clear</b> your level before publishing.
            </div>
          </div>
        </main>

        <!-- 右侧：操作 -->
        <aside class="side-panel right-panel">
          <div class="panel-card">
            <h3>Actions</h3>
            <div class="action-list">
              <button class="ctrl-btn" @click="clearEditor">
                <span class="icon">🗑️</span> Clear Map
              </button>
              <button class="ctrl-btn" @click="testLevel">
                <span class="icon">🎮</span> Test Play
              </button>
            </div>
          </div>

          <div v-if="editingLevelId" class="edit-actions">
             <button 
              class="big-action-btn secondary" 
              @click="cancelEdit"
            >
              Cancel
            </button>
             <button 
              class="big-action-btn" 
              @click="updateLevel" 
              :disabled="!editorVerified && !isAdmin"
              :title="(editorVerified || isAdmin) ? 'Update level on server' : 'Please test and clear the level first'"
            >
              {{ isPublishing ? 'Updating...' : 'Update Level' }}
            </button>
          </div>
          <button 
            v-else
            class="big-action-btn" 
            @click="publishLevel" 
            :disabled="!editorVerified && !isAdmin"
            :title="(editorVerified || isAdmin) ? 'Publish to server' : 'Please test and clear the level first'"
          >
            {{ isPublishing ? 'Publishing...' : 'Publish Level' }}
          </button>
        </aside>
      </div>
    </div>

    <!-- 主内容区：游戏视图 -->
    <div v-else class="main-container">
      <div class="game-layout">
        
        <!-- 左侧栏：关卡列表 -->
        <aside class="side-panel left-panel">
          <div class="panel-card level-card">
            <div class="card-header">
              <h3>Levels</h3>
              <span class="level-count">{{ levels.length }}</span>
            </div>
            <div class="level-search">
              <input 
                v-model="searchQuery" 
                placeholder="Search levels..." 
                class="search-input"
              />
            </div>
            <div class="level-list-scroll">
              <div 
                v-for="(level, index) in filteredLevels" 
                :key="level.id"
                class="level-item"
                :class="{ active: level.id === (currentLevel ? currentLevel.id : null) }"
                @click="loadLevel(levels.findIndex(l => l.id === level.id))"
              >
                <span class="level-num">{{ levels.findIndex(l => l.id === level.id) + 1 }}</span>
                <div class="level-info">
                  <div class="level-header-row">
                    <span class="level-name">{{ level.name }}</span>
                    <div v-if="isAdmin" class="admin-actions">
                      <button class="edit-btn-mini" @click.stop="openEditLevel(level)" title="Edit Level">✏️</button>
                      <button class="edit-btn-mini delete" @click.stop="deleteLevel(level)" title="Delete Level">🗑️</button>
                    </div>
                  </div>
                  <span class="level-desc">{{ level.description }}</span>
                  <span class="level-author" v-if="level.creatorName">By: {{ level.creatorName }}</span>
                  <div v-if="level.bestRecord && level.bestRecord.moves" class="level-best">
                    🏆 {{ level.bestRecord.moves }} moves by {{ level.bestRecord.username }}
                  </div>
                </div>
                <span v-if="completedLevels.has(level.id)" class="status-icon">✓</span>
              </div>
            </div>
          </div>

          <div class="panel-card help-card">
            <h3>How to Play</h3>
            <div class="key-hints">
              <div class="key-group">
                <span class="key">W</span>
                <span class="key">A</span>
                <span class="key">S</span>
                <span class="key">D</span>
              </div>
              <span class="hint-text">to Move</span>
            </div>
            <ul class="help-list">
              <li>Push boxes 📦 to targets <span class="dot"></span></li>
              <li>Don't get stuck!</li>
            </ul>
          </div>
        </aside>

        <!-- 中间：游戏主舞台 -->
        <main class="game-stage">
          <div class="stage-card">
            <div class="stage-header">
              <div class="level-title">
                <span class="label">Level {{ currentLevelIndex + 1 }}</span>
                <h2>
                  {{ currentLevel ? currentLevel.name : (loading ? 'Loading...' : 'No Levels Found') }}
                  <div class="vote-actions" v-if="currentLevel">
                    <button 
                      class="vote-btn like" 
                      :class="{ active: currentLevel.userVote === 'like' }"
                      @click="voteLevel('like')"
                      title="Like this level"
                    >
                      👍 {{ currentLevel.likesCount || 0 }}
                    </button>
                    <button 
                      class="vote-btn dislike" 
                      :class="{ active: currentLevel.userVote === 'dislike' }"
                      @click="voteLevel('dislike')"
                      title="Dislike this level"
                    >
                      👎 {{ currentLevel.dislikesCount || 0 }}
                    </button>
                  </div>
                </h2>
              </div>
              <div class="timer-badge">
                <span class="icon">⏱️</span>
                <span class="time">{{ formatTime(timeElapsed) }}</span>
              </div>
            </div>

            <div class="board-wrapper">
              <div class="game-board" v-if="gameState.map.length">
                <div v-for="(row, y) in gameState.map" :key="y" class="game-row">
                  <div 
                    v-for="(tile, x) in row" 
                    :key="`${x}-${y}`"
                    :class="['game-cell', getTileClass(tile)]"
                  >
                    <div v-if="isTargetCell(x, y)" class="target-mark">📍</div>
                    <div class="tile-content">
                      <span v-if="isPlayer(tile)" class="sprite player">🐹</span>
                      <span v-else-if="isBox(tile)" class="sprite box">📦</span>
                      <span v-else-if="isWall(tile)" class="sprite wall">🧱</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mobile Controls -->
              <div class="mobile-controls" v-if="!gameState.isVictory && viewMode === 'play'">
                <div class="d-pad">
                   <button class="d-btn up" @click="move('up')">⬆️</button>
                   <div class="d-row">
                     <button class="d-btn left" @click="move('left')">⬅️</button>
                     <button class="d-btn down" @click="move('down')">⬇️</button>
                     <button class="d-btn right" @click="move('right')">➡️</button>
                   </div>
                </div>
                <div class="action-pad">
                   <button class="a-btn" @click="undo" :disabled="!gameState.canUndo" title="Undo">↩️</button>
                   <button class="a-btn" @click="resetLevel" title="Restart">🔄</button>
                </div>
              </div>
              
              <!-- 胜利遮罩 -->
              <div v-if="gameState.isVictory" class="victory-overlay">
                <div class="victory-modal">
                  <div class="victory-icon">🏆</div>
                  <h3>Level Complete!</h3>
                  <div class="victory-stats">
                    <div class="v-stat">
                      <span class="label">Time</span>
                      <span class="value">{{ formatTime(timeElapsed) }}</span>
                    </div>
                    <div class="v-stat">
                      <span class="label">Moves</span>
                      <span class="value">{{ gameState.moves }}</span>
                    </div>
                  </div>
                  <div class="victory-actions">
                    <button @click="resetLevel" class="btn-text">Replay</button>
                    <button @click="nextLevel" v-if="hasNextLevel && !isTesting" class="btn-primary">Next Level ➔</button>
                    <button @click="finishTesting" v-if="isTesting" class="btn-primary">Verify & Return</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- 右侧栏：数据与控制 -->
        <aside class="side-panel right-panel">
          <div class="panel-card stats-card">
            <div class="stat-row">
              <span class="stat-label">Moves</span>
              <span class="stat-value">{{ gameState.moves }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-row">
              <span class="stat-label">Targets</span>
              <span class="stat-value highlight">{{ currentTargetsCount }} / {{ totalTargetsCount }}</span>
            </div>
            <div class="stat-divider" v-if="currentLevelPersonalBest"></div>
            <div class="stat-row" v-if="currentLevelPersonalBest">
              <span class="stat-label">My Best</span>
              <span class="stat-value">{{ currentLevelPersonalBest.moves }} moves</span>
            </div>
          </div>

          <div class="panel-card controls-card">
            <div class="control-buttons">
              <button class="ctrl-btn" @click="undo" :disabled="!gameState.canUndo" title="Undo (Ctrl+Z)">
                <span class="icon">↩️</span>
                <span>Undo</span>
              </button>
              <button class="ctrl-btn" @click="resetLevel" title="Restart Level">
                <span class="icon">🔄</span>
                <span>Restart</span>
              </button>
            </div>
          </div>

          <button class="big-action-btn" @click="nextLevel" :disabled="!hasNextLevel">
            Next Level
          </button>

          <div class="panel-card leaderboard-card" v-if="leaderboard.length > 0">
            <h3>🏆 Leaderboard</h3>
            <div class="leaderboard-list">
              <div v-for="(record, index) in leaderboard" :key="index" class="leaderboard-item">
                <span class="rank">{{ index + 1 }}</span>
                <span class="user">{{ record.username }}</span>
                <div class="score-container">
                  <span class="score">{{ record.moves }} moves</span>
                  <span class="time-hint" v-if="record.timeElapsed">({{ formatTime(record.timeElapsed) }})</span>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-card activity-feed" v-if="activityData.length > 0">
            <h3>📢 Activity Feed</h3>
            <div class="activity-list">
              <div v-for="(item, index) in activityData" :key="index" class="activity-item">
                <div class="activity-header">
                  <span class="user-name">{{ item.username }}</span>
                  <span class="activity-time">{{ formatRelativeTime(item.createdAt) }}</span>
                </div>
                <div class="activity-details">
                  Completed <b>{{ item.levelName }}</b> in {{ item.moves }} moves ({{ formatTime(item.timeElapsed) }})
                </div>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
import { request } from '../utils/request'
import { SokobanEngine, TILES } from '../utils/SokobanEngine'

export default {
  name: 'SokobanGame',
  setup() {
    const loading = ref(true)
    const levels = ref([])
    const currentLevelIndex = ref(0)
    const currentLevel = ref(null)
    const timeElapsed = ref(0)
    const completedLevels = ref(new Set()) // 存储已通关的关卡ID
    const userProgressMap = reactive(new Map())
    const leaderboard = ref([]) // 排行榜数据
    const activityData = ref([]) // 新鲜事数据
    const currentUser = ref(null)
    const editingLevelId = ref(null)
    let timerInterval = null

    const gameState = reactive({
      map: [],
      playerPos: { x: 0, y: 0 },
      moves: 0,
      isVictory: false,
      canUndo: false
    })

    const notification = reactive({
      show: false,
      message: '',
      type: 'info'
    })

    const showNotification = (msg, type = 'info') => {
      notification.message = msg
      notification.type = type
      notification.show = true
      setTimeout(() => {
        notification.show = false
      }, 3000)
    }

    onMounted(() => {
      const userStr = localStorage.getItem('user_info')
      if (userStr) {
        try {
          currentUser.value = JSON.parse(userStr)
        } catch(e) {}
      }
      loadProgress()
      fetchLevels()
      fetchActivity()
    })

    const isAdmin = computed(() => {
      return currentUser.value && (currentUser.value.role === 'admin' || currentUser.value.priv === -1 || currentUser.value.priv === 1)
    })

    const currentLevelPersonalBest = computed(() => {
      if (!currentLevel.value) return null
      return userProgressMap.get(currentLevel.value.id)
    })

    const voteLevel = async (type) => {
      if (!currentLevel.value) return
      
      // Optimistic update
      const level = currentLevel.value
      const oldVote = level.userVote
      
      if (oldVote === type) {
        // Toggle off? Or just ignore? Let's assume toggle off for now if API supports it, 
        // but our API currently just sets it. Let's implement toggle logic in frontend call.
        // Actually, let's just call with 'none' if clicking same type
        type = 'none'
      }

      try {
        const res = await request(`/api/sokoban/levels/${level.id}/vote`, {
          method: 'POST',
          body: JSON.stringify({ type })
        })
        
        if (res && res.success) {
          level.likesCount = res.data.likesCount
          level.dislikesCount = res.data.dislikesCount
          level.userVote = res.data.userVote
        }
      } catch (e) {
        console.error('Vote failed', e)
      }
    }

    const searchQuery = ref('')
    const filteredLevels = computed(() => {
      if (!searchQuery.value) return levels.value
      const query = searchQuery.value.toLowerCase()
      return levels.value.filter((level, index) => {
        const levelNum = (index + 1).toString()
        return (
          levelNum.includes(query) ||
          level.name.toLowerCase().includes(query) || 
          (level.description && level.description.toLowerCase().includes(query)) ||
          (level.creatorName && level.creatorName.toLowerCase().includes(query))
        )
      })
    })

    // 加载通关记录
    const loadProgress = async () => {
      // First load from local storage for immediate feedback
      const saved = localStorage.getItem('sokoban_progress')
      if (saved) {
        try {
          const ids = JSON.parse(saved)
          if (Array.isArray(ids)) {
            ids.forEach(id => completedLevels.value.add(id))
          }
        } catch (e) {
          console.error('Failed to load progress', e)
        }
      }

      // Then sync with server
      if (currentUser.value) {
        try {
          const res = await request('/api/sokoban/my-progress')
          if (res && res.success) {
             res.data.forEach(p => {
               completedLevels.value.add(p.levelId)
               userProgressMap.set(p.levelId, p)
             })
             saveProgress() // Sync back to local storage
          }
        } catch (e) {
          console.error('Failed to sync progress', e)
        }
      }
    }

    // 保存通关记录
    const saveProgress = () => {
      localStorage.setItem('sokoban_progress', JSON.stringify([...completedLevels.value]))
    }

    // --- 编辑器状态 ---
    const viewMode = ref('play') // 'play' | 'editor'
    const isTesting = ref(false)
    const editorVerified = ref(false)
    const isPublishing = ref(false)
    const editorSize = ref(8)
    const selectedTool = ref(1) // 默认墙
    const isDrawing = ref(false)
    
    const editorMeta = reactive({
      name: '',
      description: ''
    })

    const editorTools = [
      { id: TILES.WALL, name: 'Wall', icon: '🧱' },
      { id: TILES.BOX, name: 'Box', icon: '📦' },
      { id: TILES.TARGET, name: 'Target', icon: '' },
      { id: TILES.PLAYER, name: 'Player', icon: '🐹' },
      { id: TILES.EMPTY, name: 'Eraser', icon: '⬜' }
    ]

    // 初始化空地图
    const createEmptyMap = (size) => Array(size).fill(0).map(() => Array(size).fill(TILES.EMPTY))
    const editorMap = ref(createEmptyMap(8))

    const openEditLevel = async (level) => {
      try {
        // Fetch full level details to get the map
        const res = await request(`/api/sokoban/levels/${level.id}`)
        if (res && res.success) {
          const fullLevel = res.data
          editingLevelId.value = fullLevel.id
          editorMeta.name = fullLevel.name
          editorMeta.description = fullLevel.description || ''
          
          // Normalize map to square to ensure all areas are editable
          const rawMap = fullLevel.map
          const height = rawMap.length
          const width = rawMap.reduce((max, row) => Math.max(max, row.length), 0)
          const size = Math.max(height, width, 8) // Ensure at least 8x8
          
          const newMap = createEmptyMap(size)
          for(let y=0; y<height; y++) {
            for(let x=0; x<rawMap[y].length; x++) {
              newMap[y][x] = rawMap[y][x]
            }
          }
          
          editorMap.value = newMap
          editorSize.value = size
          editorVerified.value = true // Assume existing levels are valid
          viewMode.value = 'editor'
        } else {
          showNotification('Failed to load level data for editing', 'error')
        }
      } catch (e) {
        console.error(e)
        showNotification('Error loading level for editing', 'error')
      }
    }

    const cancelEdit = () => {
      editingLevelId.value = null
      editorMeta.name = ''
      editorMeta.description = ''
      editorMap.value = createEmptyMap(8)
      editorVerified.value = false
      viewMode.value = 'play'
    }

    const updateLevel = async () => {
      if (!editingLevelId.value) return
      if (!editorMeta.name) return showNotification('Please name your level', 'error')

      try {
        isPublishing.value = true
        const res = await request(`/api/sokoban/levels/${editingLevelId.value}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: editorMeta.name,
            description: editorMeta.description,
            map: editorMap.value
          })
        })
        
        if (res && res.success) {
          showNotification('Level Updated Successfully!', 'success')
          cancelEdit() // Reset and go back
          fetchLevels(false) // Refresh list
        } else {
          showNotification(res.error || 'Failed to update level', 'error')
        }
      } catch (err) {
        showNotification('Failed to update: ' + (err.message || 'Unknown error'), 'error')
      } finally {
        isPublishing.value = false
      }
    }

    const deleteLevel = async (level) => {
      if (!confirm(`Are you sure you want to delete level "${level.name}"? This cannot be undone.`)) return

      try {
        const res = await request(`/api/sokoban/levels/${level.id}`, {
          method: 'DELETE'
        })
        
        if (res && res.success) {
          showNotification('Level deleted successfully', 'success')
          // If deleting current level, reset
          if (currentLevel.value && currentLevel.value.id === level.id) {
            currentLevel.value = null
            engine = null
          }
          fetchLevels(false)
        } else {
          showNotification(res.error || 'Failed to delete level', 'error')
        }
      } catch (e) {
        console.error(e)
        showNotification('Error deleting level', 'error')
      }
    }

    let engine = null

    // 计时器控制
    const startTimer = () => {
      stopTimer()
      timeElapsed.value = 0
      timerInterval = setInterval(() => {
        timeElapsed.value++
      }, 1000)
    }

    const stopTimer = () => {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    }

    const fetchLeaderboard = async (levelId) => {
      try {
        leaderboard.value = []
        const response = await request(`/api/sokoban/levels/${levelId}/leaderboard`)
        if (response && response.success) {
          leaderboard.value = response.data
        }
      } catch (err) {
        console.error('Fetch leaderboard error:', err)
      }
    }

    const fetchActivity = async () => {
      try {
        const res = await request('/api/sokoban/activity?limit=20')
        if (res && res.success) {
          activityData.value = res.data
        }
      } catch (e) {
        console.error('Failed to fetch activity', e)
      }
    }

    const formatRelativeTime = (dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);
      
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return date.toLocaleDateString();
    };

    const fetchLevels = async (init = true) => {
      try {
        if (init) loading.value = true
        console.log('Fetching levels...')
        const response = await request('/api/sokoban/levels')
        console.log('Levels response:', response)
        if (response && response.success) {
           levels.value = response.data
           console.log('Levels loaded:', levels.value.length)
           
           // Sync completion status from best records
           if (currentUser.value && currentUser.value.username) {
             let changed = false
             levels.value.forEach(level => {
               if (level.bestRecord && level.bestRecord.username === currentUser.value.username) {
                 if (!completedLevels.value.has(level.id)) {
                   completedLevels.value.add(level.id)
                   changed = true
                 }
               }
             })
             if (changed) {
               saveProgress()
             }
           }
        } else {
           console.error('Failed to load levels:', response)
        }
        
        // 如果是初始化且不在测试模式，加载第一关
        if (init && !isTesting.value && levels.value.length > 0) {
          loadLevel(0)
        }
      } catch (err) {
        console.error('Fetch levels error:', err)
      } finally {
        if (init) loading.value = false
      }
    }

    const loadLevel = async (index) => {
      if (index < 0 || index >= levels.value.length) return
      
      try {
        stopTimer()
        isTesting.value = false // 确保退出测试模式
        const levelId = levels.value[index].id
        console.log(`Loading level ${index} (ID: ${levelId})...`)
        const response = await request(`/api/sokoban/levels/${levelId}`)
        console.log('Level details response:', response)
        
        if (response && response.success) {
          const levelData = response.data
          currentLevelIndex.value = index
          currentLevel.value = levelData
          engine = new SokobanEngine(levelData)
          totalTargetsCount.value = engine.targetCount
          updateGameState()
          startTimer()
          fetchLeaderboard(levelId)
        } else {
          console.error('Failed to load level details:', response)
          alert('Failed to load level data')
        }
      } catch (err) {
        console.error('Load level error:', err)
      }
    }

    // --- 编辑器逻辑 ---
    const switchView = (mode) => {
      viewMode.value = mode
      if (mode === 'play') {
        isTesting.value = false
        loadLevel(currentLevelIndex.value)
      }
    }

    const resizeGrid = (delta) => {
      const newSize = Math.max(5, Math.min(15, editorSize.value + delta))
      if (newSize === editorSize.value) return
      
      editorSize.value = newSize
      // 保留原有内容，调整大小
      const newMap = createEmptyMap(newSize)
      for(let y=0; y<Math.min(newSize, editorMap.value.length); y++) {
        for(let x=0; x<Math.min(newSize, editorMap.value[0].length); x++) {
          newMap[y][x] = editorMap.value[y][x]
        }
      }
      editorMap.value = newMap
      editorVerified.value = false
    }

    const startDrawing = (x, y) => {
      isDrawing.value = true
      paintTile(x, y)
    }

    const continueDrawing = (x, y) => {
      if (isDrawing.value) paintTile(x, y)
    }

    const stopDrawing = () => {
      isDrawing.value = false
    }

    const paintTile = (x, y) => {
      // 玩家只能有一个
      if (selectedTool.value === TILES.PLAYER) {
        editorMap.value.forEach((row, ry) => {
          row.forEach((cell, rx) => {
            if (cell === TILES.PLAYER) editorMap.value[ry][rx] = TILES.EMPTY
          })
        })
      }
      editorMap.value[y][x] = selectedTool.value
      editorVerified.value = false // 修改后需要重新验证
    }

    const clearEditor = () => {
      if(confirm('Clear map?')) {
        editorMap.value = createEmptyMap(editorSize.value)
        editorVerified.value = false
      }
    }

    const testLevel = () => {
      // 简单验证
      let hasPlayer = false
      let boxCount = 0
      let targetCount = 0
      editorMap.value.forEach(row => {
        row.forEach(cell => {
          if (cell === TILES.PLAYER) hasPlayer = true
          if (cell === TILES.BOX) boxCount++
          if (cell === TILES.TARGET) targetCount++
        })
      })

      if (!hasPlayer) return alert('Need a player!')
      if (boxCount === 0) return alert('Need at least one box!')
      if (boxCount !== targetCount) return alert(`Boxes (${boxCount}) != Targets (${targetCount})`)

      // 进入测试模式
      const levelData = {
        name: 'TEST RUN',
        map: JSON.parse(JSON.stringify(editorMap.value)),
        targetCount: targetCount
      }
      
      engine = new SokobanEngine(levelData)
      currentLevel.value = levelData
      isTesting.value = true
      viewMode.value = 'play' // 切换到游戏视图
      updateGameState()
      startTimer()
    }

    const finishTesting = () => {
      if (gameState.isVictory) {
        editorVerified.value = true
        showNotification('Verification Complete! You can now publish/update this level.', 'success')
      }
      viewMode.value = 'editor'
      isTesting.value = false
      stopTimer()
    }

    const publishLevel = async () => {
      if (!editorMeta.name) return showNotification('Please name your level', 'error')
      
      try {
        isPublishing.value = true
        await request('/api/sokoban/levels', {
          method: 'POST',
          body: JSON.stringify({
            name: editorMeta.name,
            description: editorMeta.description,
            map: editorMap.value
          })
        })
        showNotification('Level Published Successfully!', 'success')
        // 重置并回到列表
        editorMeta.name = ''
        editorMeta.description = ''
        editorMap.value = createEmptyMap(8)
        editorVerified.value = false
        viewMode.value = 'play'
        fetchLevels() // 刷新列表
      } catch (err) {
        showNotification('Failed to publish: ' + (err.message || 'Unknown error'), 'error')
      } finally {
        isPublishing.value = false
      }
    }

    const updateGameState = async () => {
      const state = engine.getGameState()
      gameState.map = state.map
      gameState.playerPos = { ...state.playerPos }
      gameState.moves = state.moves
      gameState.isVictory = state.isVictory
      gameState.canUndo = state.canUndo

      if (state.isVictory) {
        stopTimer()
        if (!isTesting.value && currentLevel.value) {
          completedLevels.value.add(currentLevel.value.id)
          saveProgress()
          
          // 提交成绩
          console.log('Level complete! Submitting score...', { moves: gameState.moves, time: timeElapsed.value })
          try {
            const res = await request(`/api/sokoban/levels/${currentLevel.value.id}/complete`, {
              method: 'POST',
              body: JSON.stringify({
                moves: gameState.moves,
                timeElapsed: timeElapsed.value
              })
            })
            
            console.log('Submission response:', res)

            if (res && res.success) {
               // Update personal best immediately
               if (res.personalBest) {
                 userProgressMap.set(currentLevel.value.id, res.personalBest)
               }

               if (res.isNewRecord) {
                  // 更新本地显示的记录
                  const level = levels.value.find(l => l.id === currentLevel.value.id)
                  if (level) {
                    level.bestRecord = res.bestRecord
                  }
                  showNotification(`New Record! ${gameState.moves} moves!`, 'success')
                  // 重新获取列表以确保数据同步
                  fetchLevels(false)
                  fetchLeaderboard(currentLevel.value.id)
               }
            } else {
              console.error('Submission failed:', res)
            }
          } catch (e) {
            console.error('Failed to submit score', e)
            showNotification('Failed to submit score', 'error')
          }
        }
      }
    }

    const move = (direction) => {
      if (gameState.isVictory) return
      if (engine.move(direction)) {
        updateGameState()
      }
    }

    const resetLevel = () => {
      engine.reset()
      updateGameState()
      startTimer()
    }

    const nextLevel = () => {
      if (hasNextLevel.value) {
        loadLevel(currentLevelIndex.value + 1)
      }
    }

    const undo = () => {
      if (engine.undo()) {
        updateGameState()
      }
    }

    const hasNextLevel = computed(() => currentLevelIndex.value < levels.value.length - 1)
    
    // 统计目标点
    const totalTargetsCount = ref(0)
    const currentTargetsCount = computed(() => {
      if (!gameState.map.length) return 0
      let count = 0
      gameState.map.forEach(row => {
        row.forEach(tile => {
          if (tile === TILES.BOX_ON_TARGET) count++
        })
      })
      return count
    })

    const isTargetCellRaw = (tile) => tile === TILES.TARGET || tile === TILES.BOX_ON_TARGET || tile === TILES.PLAYER_ON_TARGET
    const isPlayerRaw = (tile) => tile === TILES.PLAYER || tile === TILES.PLAYER_ON_TARGET
    const isBoxRaw = (tile) => tile === TILES.BOX || tile === TILES.BOX_ON_TARGET

    const isTargetCell = (x, y) => {
      const tile = gameState.map[y][x]
      return isTargetCellRaw(tile)
    }

    const getBestRecord = (levelId) => {
      const level = levels.value.find(l => l.id === levelId)
      return level ? level.bestRecord : null
    }

    const isPlayer = (tile) => isPlayerRaw(tile)
    const isBox = (tile) => isBoxRaw(tile)
    const isWall = (tile) => tile === TILES.WALL

    const getTileClass = (tile) => {
      switch (tile) {
        case TILES.WALL: return 'wall'
        case TILES.EMPTY: return 'empty'
        default: return 'floor'
      }
    }

    const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    const handleKeyDown = (e) => {
      if (!engine) return
      const keyMap = {
        'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
        'w': 'up', 's': 'down', 'a': 'left', 'd': 'right', 'W': 'up', 'S': 'down', 'A': 'left', 'D': 'right'
      }
      if (keyMap[e.key]) {
        e.preventDefault()
        move(keyMap[e.key])
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }

    onMounted(() => {
      loadProgress()
      fetchLevels()
      window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      stopTimer()
      window.removeEventListener('keydown', handleKeyDown)
    })

    return {
      loading,
      levels,
      currentLevelIndex,
      currentLevel,
      gameState,
      timeElapsed,
      hasNextLevel,
      totalTargetsCount,
      currentTargetsCount,
      loadLevel,
      nextLevel,
      resetLevel,
      undo,
      getTileClass,
      isTargetCell,
      isPlayer,
      isBox,
      formatTime,
      currentLevelPersonalBest,
      activityData,
      formatRelativeTime,
      // Editor exports
      viewMode,
      switchView,
      editorTools,
      selectedTool,
      editorMeta,
      editorSize,
      resizeGrid,
      editorVerified,
      editorMap,
      startDrawing,
      continueDrawing,
      stopDrawing,
      clearEditor,
      testLevel,
      isPublishing,
      publishLevel,
      isTesting,
      finishTesting,
      isTargetCellRaw,
      isPlayerRaw,
      isBoxRaw,
      isWall,
      completedLevels, // Export completedLevels
      getBestRecord,
      leaderboard,
      formatTime,
      isAdmin,
      openEditLevel,
      editingLevelId,
      cancelEdit,
      updateLevel,
      deleteLevel,
      voteLevel,
      searchQuery,
      filteredLevels,
      notification
    }
  }
}
</script>

<style scoped>
.level-search {
  padding: 0 16px 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #4299e1;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
}

/* --- 全局重置与基础样式 --- */
* {
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  background-color: #f0f4f8; /* 极淡的蓝灰色背景 */
  font-family: 'Segoe UI', 'Roboto', sans-serif;
  color: #2d3748;
  display: flex;
  flex-direction: column;
}

/* --- 顶部导航 --- */
.top-nav {
  background: white;
  height: 64px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  justify-content: center; /* 导航内容居中 */
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-content {
  width: 100%;
  max-width: 1200px; /* 限制最大宽度 */
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 700;
  color: #2b6cb0;
}

.nav-tabs {
  display: flex;
  gap: 32px;
}

.tab {
  padding: 20px 0;
  color: #718096;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.tab:hover {
  color: #2b6cb0;
}

.tab.active {
  color: #2b6cb0;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: #2b6cb0;
  border-radius: 3px 3px 0 0;
}

/* --- 主布局容器 --- */
.main-container {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 32px 24px;
}

.game-layout {
  display: flex;
  gap: 24px;
  width: 100%;
  max-width: 1200px; /* 核心：限制总宽度并居中 */
  align-items: flex-start;
}

/* --- 侧边栏通用 --- */
.side-panel {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  border: 1px solid #e2e8f0;
}

/* --- 左侧栏内容 --- */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #4a5568;
}

.level-count {
  background: #ebf8ff;
  color: #2b6cb0;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.level-list-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

/* 滚动条美化 */
.level-list-scroll::-webkit-scrollbar {
  width: 4px;
}
.level-list-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.level-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.level-item:hover {
  background: #f7fafc;
}

.level-item.active {
  background: #ebf8ff;
  border-left: 3px solid #3182ce;
}

.level-num {
  font-weight: bold;
  color: #a0aec0;
  width: 28px;
}

.level-item.active .level-num {
  color: #3182ce;
}

.level-info {
  flex: 1;
  overflow: hidden;
}

.level-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  color: #2d3748;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-desc {
  display: block;
  font-size: 0.75rem;
  color: #718096;
  margin-top: 2px;
}

.status-icon {
  color: #48bb78;
  font-weight: bold;
}

/* 帮助卡片 */
.key-hints {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  background: #f7fafc;
  padding: 10px;
  border-radius: 8px;
}

.key-group {
  display: flex;
  gap: 4px;
}

.key {
  width: 24px;
  height: 24px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  color: #4a5568;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.hint-text {
  font-size: 0.8rem;
  color: #718096;
}

.help-list {
  padding-left: 0;
  margin: 0;
  list-style: none;
  font-size: 0.85rem;
  color: #4a5568;
}

.help-list li {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #48bb78;
  border-radius: 50%;
  display: inline-block;
}

/* --- 中间游戏舞台 --- */
.game-stage {
  flex: 1;
  display: flex;
  justify-content: center;
}

.stage-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf2f7;
}

.level-title .label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #718096;
  font-weight: 600;
}

.level-title h2 {
  margin: 4px 0 0 0;
  font-size: 1.75rem;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 12px;
}

.vote-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}

.vote-btn {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.85rem;
  color: #718096;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.admin-actions {
  display: flex;
  gap: 4px;
}

.edit-btn-mini.delete {
  color: #e53e3e;
}

.edit-btn-mini.delete:hover {
  background: #fed7d7;
}

.vote-btn:hover {
  background: #edf2f7;
}

.vote-btn.active.like {
  background: #ebf8ff;
  border-color: #4299e1;
  color: #3182ce;
}

.vote-btn.active.dislike {
  background: #fff5f5;
  border-color: #fc8181;
  color: #e53e3e;
}

.current-best-record {
  font-size: 0.9rem;
  color: #d69e2e; /* Gold/Yellowish */
  font-weight: 600;
  margin-top: 4px;
}

.timer-badge {
  background: #edf2f7;
  padding: 6px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4a5568;
  font-weight: 600;
  font-family: monospace;
  font-size: 1rem;
}

.board-wrapper {
  position: relative;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px solid #edf2f7;
}

.game-board {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.game-row {
  display: flex;
}

.game-cell {
  width: 48px;
  height: 48px;
  position: relative;
  box-sizing: border-box;
}

/* 游戏元素样式 */
.game-cell.wall {
  background-color: #f0f4f8; /* 与背景色一致，突出砖块 */
  border: none;
}

.game-cell.floor, .game-cell.empty {
  background-color: #ffffff;
  border: 1px solid #e2e8f0; /* 增加网格线 */
}

.target-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  z-index: 1;
  opacity: 0.6;
}

.game-cell.target .target-mark {
  opacity: 1;
}

.tile-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  position: relative;
}

.sprite {
  font-size: 32px;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));
}

/* --- 右侧栏内容 --- */
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.stat-label {
  color: #718096;
  font-size: 0.9rem;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d3748;
}

.stat-value.highlight {
  color: #3182ce;
}

.stat-divider {
  height: 1px;
  background: #edf2f7;
  margin: 8px 0;
}

.control-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #f7fafc;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a5568;
  font-weight: 500;
}

.ctrl-btn:hover:not(:disabled) {
  background: #ebf8ff;
  color: #2b6cb0;
  border-color: #bee3f8;
}

.ctrl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ctrl-btn .icon {
  font-size: 1.2rem;
  margin-bottom: 4px;
}

.big-action-btn {
  width: 100%;
  padding: 16px;
  background: #3182ce;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(49, 130, 206, 0.3);
  transition: all 0.2s;
}

.big-action-btn:hover:not(:disabled) {
  background: #2c5282;
  transform: translateY(-1px);
}

.big-action-btn:disabled {
  background: #cbd5e0;
  box-shadow: none;
  cursor: not-allowed;
}

.big-action-btn.secondary {
  background: #718096;
  box-shadow: 0 4px 6px rgba(113, 128, 150, 0.3);
}

.big-action-btn.secondary:hover:not(:disabled) {
  background: #4a5568;
}

.edit-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* --- 编辑器样式 --- */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #f7fafc;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-item:hover {
  background: #ebf8ff;
}

.tool-item.active {
  background: #ebf8ff;
  border-color: #3182ce;
  color: #2b6cb0;
}

.level-best {
  font-size: 0.75rem;
  color: #d69e2e;
  margin-top: 4px;
  font-weight: 600;
}

.tool-icon {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.tool-name {
  font-size: 0.8rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  color: #718096;
  margin-bottom: 6px;
  font-weight: 600;
}

.input-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #3182ce;
}

.size-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f7fafc;
  padding: 4px;
  border-radius: 6px;
}

.size-controls button {
  width: 32px;
  height: 32px;
  border: none;
  background: white;
  border-radius: 4px;
  font-weight: bold;
  color: #4a5568;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.size-controls span {
  font-weight: 600;
  color: #2d3748;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: #fff5f5;
  color: #e53e3e;
}

.status-badge.verified {
  background: #f0fff4;
  color: #38a169;
}

.editor-board .game-cell {
  cursor: crosshair;
}

.editor-board .game-cell:hover {
  background-color: #ebf8ff;
}

.editor-hint {
  margin-top: 16px;
  font-size: 0.9rem;
  color: #718096;
  text-align: center;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* --- 胜利弹窗 --- */
.victory-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 10px;
}

.victory-modal {
  text-align: center;
  animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.victory-icon {
  font-size: 3rem;
  margin-bottom: 10px;
}

.victory-modal h3 {
  font-size: 1.5rem;
  color: #2d3748;
  margin: 0 0 20px 0;
}

.victory-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
}

.v-stat {
  display: flex;
  flex-direction: column;
}

.v-stat .label {
  font-size: 0.75rem;
  color: #718096;
  text-transform: uppercase;
}

.v-stat .value {
  font-size: 1.25rem;
  font-weight: bold;
  color: #2b6cb0;
}

.victory-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.btn-primary {
  padding: 10px 20px;
  background: #3182ce;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-text {
  padding: 10px 20px;
  background: transparent;
  color: #718096;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.leaderboard-card {
  margin-top: 16px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  padding: 4px 0;
  border-bottom: 1px solid #edf2f7;
}

.leaderboard-item:last-child {
  border-bottom: none;
}

.leaderboard-item .rank {
  width: 24px;
  font-weight: bold;
  color: #a0aec0;
}

.leaderboard-item:nth-child(1) .rank { color: #ecc94b; }
.leaderboard-item:nth-child(2) .rank { color: #a0aec0; }
.leaderboard-item:nth-child(3) .rank { color: #ed8936; }

.leaderboard-item .user {
  flex: 1;
  color: #4a5568;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.leaderboard-item .score-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.leaderboard-item .score {
  font-weight: 600;
  color: #2d3748;
}

.leaderboard-item .time-hint {
  font-size: 0.75rem;
  color: #a0aec0;
}

.btn-text:hover {
  color: #2d3748;
}

.level-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-btn-mini {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.5;
  padding: 0 4px;
}

.edit-btn-mini:hover {
  opacity: 1;
}

.level-author {
  display: block;
  font-size: 0.75rem;
  color: #a0aec0;
  margin-top: 2px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* --- 响应式调整 --- */
@media (max-width: 1024px) {
  .game-layout {
    flex-direction: column;
    align-items: center;
  }
  
  .side-panel {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .panel-card {
    flex: 1;
    min-width: 250px;
  }
}

.notification-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  z-index: 2000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideDown 0.3s ease-out;
}

.notification-toast.info { background-color: #4299e1; }
.notification-toast.success { background-color: #48bb78; }
.notification-toast.error { background-color: #f56565; }

@keyframes slideDown {
  from { transform: translate(-50%, -20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

.activity-feed {
  margin-top: 16px;
}

.activity-feed h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #2d3748;
  text-align: center;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  border-bottom: 1px solid #edf2f7;
  padding-bottom: 8px;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.user-name {
  font-weight: bold;
  color: #3182ce;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-time {
  color: #a0aec0;
  font-size: 0.75rem;
}

.activity-details {
  font-size: 0.8rem;
  color: #718096;
  line-height: 1.4;
}

.activity-details b {
  color: #4a5568;
}

/* --- Mobile Controls --- */
.mobile-controls {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 10px;
  background: rgba(255,255,255,0.5);
  border-radius: 16px;
}

@media (max-width: 768px) {
  .mobile-controls {
    display: flex;
  }
}

.d-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.d-row {
  display: flex;
  gap: 8px;
}

.d-btn {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  border: none;
  background: #e2e8f0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.1s;
}

.d-btn:active {
  background: #cbd5e0;
  transform: translateY(2px);
  box-shadow: 0 2px 3px rgba(0,0,0,0.1);
}

.action-pad {
  display: flex;
  gap: 24px;
}

.a-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #edf2f7;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s;
}

.a-btn:active {
  background: #e2e8f0;
  transform: translateY(2px);
  box-shadow: 0 2px 3px rgba(0,0,0,0.1);
}

.a-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
