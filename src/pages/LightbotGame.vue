<template>
  <div class="lightbot-page" :class="`screen-${screen}`">
    <section v-if="screen === 'tutorial'" class="tutorial-screen">
      <div class="tutorial-hero">
        <div class="hero-copy">
          <p class="screen-kicker">Lightbot Lab</p>
          <h1>Learn programming logic by guiding a robot across light tiles.</h1>
          <p class="hero-text">
            现在默认直接进入选关页，点卡片就能开玩；教程和关卡简介保留为辅助入口，不再强制经过。
          </p>
          <div class="hero-actions">
            <button class="hero-btn primary" @click="goToLevelSelect">Start Learning</button>
            <button class="hero-btn" @click="openLevelBrief(0)">Jump To Level 1</button>
          </div>
        </div>

        <div class="hero-gallery">
          <article v-for="card in tutorialCards" :key="card.title" class="tutorial-card">
            <div class="tutorial-card-visual" :class="card.theme">
              <div class="mini-board">
                <span v-for="n in 6" :key="n" class="mini-tile"></span>
              </div>
              <div class="mini-program">
                <span v-for="step in card.steps" :key="step" class="mini-chip">{{ step }}</span>
              </div>
            </div>
            <h2>{{ card.title }}</h2>
            <p>{{ card.copy }}</p>
          </article>
        </div>
      </div>

      <div class="tutorial-learn">
        <h2>What you'll learn</h2>
        <ul>
          <li v-for="item in learningPoints" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>

    <section v-else-if="screen === 'select'" class="select-screen">
      <header class="select-header">
        <div>
          <p class="screen-kicker">Choose A Puzzle</p>
          <h1>Level Select</h1>
          <p>点关卡卡片直接开始，右下角可以看简介。</p>
        </div>
        <div class="select-actions">
          <button class="hero-btn primary" @click="quickStartLevel()">Continue</button>
          <button class="pill-btn" @click="screen = 'tutorial'">Tutorial</button>
          <button class="pill-btn" @click="openEditor">Level Editor</button>
          <div class="progress-chip">{{ completedLevelIds.length }}/{{ levels.length }} complete</div>
        </div>
      </header>

      <div class="chapter-groups">
        <section v-for="group in levelGroups" :key="group.id" class="chapter-group">
          <header class="chapter-group-header">
            <div>
              <p class="screen-kicker">Chapter {{ group.order + 1 }}</p>
              <h2>{{ group.title }}</h2>
            </div>
            <div class="chapter-progress">
              {{ completedCountForGroup(group) }}/{{ group.levels.length }} complete
            </div>
          </header>

          <div class="level-grid">
            <button
              v-for="(level, index) in group.levels"
              :key="level.id"
              class="level-card"
              :class="{ done: completedLevelIds.includes(level.id), current: levelGlobalIndex(group, index) === selectedLevelIndex }"
              @click="quickStartLevel(levelGlobalIndex(group, index))"
            >
              <div class="level-card-head">
                <span class="level-card-index">{{ index + 1 }}</span>
                <span class="level-card-tag">{{ level.skill }}</span>
              </div>
              <strong>{{ level.title }}</strong>
              <p>{{ level.goal }}</p>
              <div class="level-card-foot">
                <span>Main {{ level.mainLimit }}</span>
                <span v-if="level.procLimits.p1">P1 {{ level.procLimits.p1 }}</span>
                <span v-else>No proc</span>
                <button class="level-brief-btn" @click.stop="openEditor(level)">编辑</button>
                <button class="level-brief-btn" @click.stop="openLevelBrief(levelGlobalIndex(group, index))">简介</button>
              </div>
            </button>
          </div>
        </section>
      </div>
    </section>

    <section v-else-if="screen === 'brief'" class="brief-screen">
      <div class="brief-shell">
        <button class="back-chip" @click="screen = 'select'">← Back</button>
        <div class="brief-copy">
          <p class="screen-kicker">Level Brief</p>
          <h1>{{ currentLevel.title }}</h1>
          <p class="brief-summary">{{ currentLevel.description }}</p>
          <p class="brief-goal">{{ currentLevel.goal }}</p>

          <div class="brief-meta">
            <div>
              <span>Main</span>
              <strong>{{ currentLevel.mainLimit }} slots</strong>
            </div>
            <div>
              <span>P1</span>
              <strong>{{ currentLevel.procLimits.p1 || 0 }} slots</strong>
            </div>
            <div>
              <span>Skill</span>
              <strong>{{ currentLevel.skill }}</strong>
            </div>
          </div>

          <div class="brief-tips">
            <article v-for="tip in currentLevel.tips" :key="tip.title">
              <h2>{{ tip.title }}</h2>
              <p>{{ tip.copy }}</p>
            </article>
          </div>

          <div class="hero-actions">
            <button class="hero-btn primary" @click="startLevel">Enter Puzzle</button>
            <button class="hero-btn" :disabled="!hasCurrentDemo" @click="loadDemoAndStart">Load Demo</button>
            <button class="hero-btn" @click="openEditor(currentLevel)">编辑此关</button>
          </div>
        </div>

        <div class="brief-preview">
          <div class="brief-preview-board">
            <div class="preview-badge">Preview</div>
            <div class="scene-frame preview-frame">
              <div ref="briefSceneHost" class="three-scene-host preview-scene-host"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="screen === 'editor'" class="editor-screen">
      <div class="editor-shell">
        <aside class="editor-sidebar">
          <div class="editor-card">
            <div class="program-header">
              <span>Level Editor</span>
              <button class="pill-btn" @click="leaveEditor">Back</button>
            </div>

            <div class="editor-form-grid">
              <label>
                <span>Title</span>
                <input v-model="editorDraft.title" type="text" maxlength="40">
              </label>
              <label>
                <span>Skill</span>
                <input v-model="editorDraft.skill" type="text" maxlength="24">
              </label>
              <label class="full-span">
                <span>Description</span>
                <input v-model="editorDraft.description" type="text" maxlength="120">
              </label>
              <label class="full-span">
                <span>Goal</span>
                <input v-model="editorDraft.goal" type="text" maxlength="120">
              </label>
              <label>
                <span>Main Slots</span>
                <input v-model.number="editorDraft.mainLimit" type="number" min="1" max="20">
              </label>
              <label>
                <span>P1 Slots</span>
                <input v-model.number="editorDraft.p1Limit" type="number" min="0" max="12">
              </label>
              <label>
                <span>Facing</span>
                <select v-model="editorDraft.start.dir">
                  <option value="forward">East</option>
                  <option value="right">South</option>
                  <option value="backward">West</option>
                  <option value="left">North</option>
                </select>
              </label>
              <label>
                <span>Height</span>
                <input v-model.number="editorHeight" type="number" min="1" max="5">
              </label>
            </div>
          </div>

          <div class="editor-card">
            <p class="screen-kicker">Tools</p>
            <div class="editor-tool-row">
              <button class="tool-btn" :class="{ selected: editorTool === 'platform' }" @click="editorTool = 'platform'">Platform</button>
              <button class="tool-btn" :class="{ selected: editorTool === 'target' }" @click="editorTool = 'target'">Target</button>
              <button class="tool-btn" :class="{ selected: editorTool === 'start' }" @click="editorTool = 'start'">Start</button>
              <button class="tool-btn" :class="{ selected: editorTool === 'erase' }" @click="editorTool = 'erase'">Erase</button>
            </div>

            <p class="editor-grid-hint">先选 Platform，再在左侧网格或右侧 3D 预览中点击或拖拽刷地板。画布会按地图内容自动扩展。</p>

            <div class="editor-grid-board">
              <div
                v-for="(row, y) in editorDraft.board"
                :key="`editor-row-${y}`"
                class="editor-grid-row"
                :style="{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }"
              >
                <button
                  v-for="(_, x) in row"
                  :key="`editor-cell-${x}-${y}`"
                  class="editor-grid-cell"
                  :class="editorCellClass(x, y)"
                  @pointerdown.prevent="beginEditorPaint(x, y)"
                  @pointerenter="continueEditorPaint(x, y)"
                >
                  <span v-if="editorCellAt(x, y)" class="cell-height">{{ editorCellAt(x, y).h }}</span>
                  <span v-if="editorDraft.start.x === x && editorDraft.start.y === y" class="cell-start">S</span>
                  <span v-else-if="editorCellAt(x, y)?.target" class="cell-target">T</span>
                </button>
              </div>
            </div>

            <div class="editor-action-row">
              <button class="pill-btn" @click="saveEditorDraft">保存草稿</button>
              <button class="pill-btn" @click="resetEditorDraft">Reset Draft</button>
              <button class="pill-btn" @click="verifyEditorLevelForPublish">验证通关</button>
              <button class="hero-btn primary" @click="startCustomPlaytest">Playtest</button>
              <button class="hero-btn" :disabled="!canSaveEditorLevel" @click="saveEditorLevelToGame">保存到游戏</button>
            </div>

            <div class="editor-publish-card" :class="editorPublishToneClass">
              <strong>{{ editorPublishTitle }}</strong>
              <p>{{ editorPublishMessage }}</p>
              <template v-if="editorSolvedProgram">
                <div class="editor-solution-line">MAIN: {{ formatOps(editorSolvedProgram.main) }}</div>
                <div v-if="editorSolvedProgram.p1?.length" class="editor-solution-line">P1: {{ formatOps(editorSolvedProgram.p1) }}</div>
              </template>
            </div>
          </div>
        </aside>

        <div class="editor-preview-pane">
          <div class="editor-card grow">
            <div class="program-header">
              <span>Preview</span>
              <span class="editor-preview-hint">在左侧网格编辑，右侧 3D 预览会同步更新。</span>
            </div>
            <div class="scene-frame editor-frame">
              <div ref="editorSceneHost" class="three-scene-host editor-scene-host"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="play-screen">
      <div class="play-shell">
        <aside class="hud-rail">
          <button class="rail-btn" @click="leavePlayScreen">←</button>
          <button class="rail-btn" @click="resetLevel(false)">↺</button>
          <button class="rail-btn muted" @click="openPlayContext">?</button>
        </aside>

        <main class="board-stage">
          <header class="board-topbar">
            <div class="board-topbar-copy">
              <p class="screen-kicker">{{ currentLevel.skill }}</p>
              <h1>{{ currentLevel.title }}</h1>
            </div>
            <div class="board-topbar-actions">
              <button class="run-btn" :disabled="isRunning || mainProcedure.length === 0" @click="runCode">
                <img src="/lightbot/run.png" alt="Run">
              </button>
              <button class="reset-btn" :disabled="isRunning" @click="resetLevel(false)">
                <img src="/lightbot/stop.png" alt="Reset">
              </button>
            </div>
          </header>

          <div class="scene-frame">
            <div class="status-float">
              <span>{{ directionLabel }}</span>
              <strong>{{ litKeys.length }}/{{ targetKeys.length }}</strong>
              <em :class="statusTone">{{ statusText }}</em>
            </div>

            <div ref="playSceneHost" class="three-scene-host play-scene-host"></div>
          </div>

          <footer class="command-bar">
            <button
              v-for="operation in operationPalette"
              :key="operation.id"
              class="command-btn"
              :disabled="isRunning || (operation.id === 'p1' && !availableProcedureKeys.includes('p1'))"
              @click="appendOperation(operation.id)"
            >
              <img :src="operationSprite(operation.id)" :alt="operation.label">
            </button>

            <div class="speed-box">
              <span>Speed</span>
              <input v-model="speedValue" type="range" min="1" max="5" step="1">
            </div>
          </footer>

          <div v-if="showFinishPanel" class="finish-panel">
            <div class="finish-card">
              <p class="screen-kicker">Puzzle Complete</p>
              <h2>{{ currentLevel.title }}</h2>
              <p>所有目标格已经点亮。现在可以继续下一关或返回选关。</p>
              <div class="finish-actions">
                <button class="hero-btn primary" @click="goToNextLevel">{{ isCustomPlaytest ? 'Back To Editor' : 'Next Level' }}</button>
                <button class="hero-btn" @click="resetLevel(false)">Replay</button>
                <button class="hero-btn" @click="leavePlayScreen">{{ isCustomPlaytest ? 'Leave Test' : 'Level Select' }}</button>
              </div>
            </div>
          </div>
        </main>

        <aside class="program-sidebar">
          <section class="program-panel main-tone" :class="{ active: activeProcedureKey === 'main' }">
            <div class="program-header">
              <span>MAIN</span>
              <button class="tab-btn" :class="{ active: activeProcedureKey === 'main' }" @click="activeProcedureKey = 'main'">Edit</button>
            </div>
            <div class="program-grid big">
              <button
                v-for="(operation, index) in mainProcedure"
                :key="`main-${index}`"
                class="program-slot filled"
                :class="{ active: runningProcedureKey === 'main' && runningOperationIndex === index }"
                @click="removeOperation('main', index)"
              >
                <img :src="operationSprite(operation)" :alt="operationLabel(operation)">
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.mainLimit, mainProcedure.length)"
                :key="`main-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </section>

          <section class="program-panel proc-tone" :class="{ disabled: !availableProcedureKeys.includes('p1'), active: activeProcedureKey === 'p1' }">
            <div class="program-header">
              <span>PROC1</span>
              <button
                class="tab-btn"
                :class="{ active: activeProcedureKey === 'p1' }"
                :disabled="!availableProcedureKeys.includes('p1')"
                @click="activeProcedureKey = 'p1'"
              >
                Edit
              </button>
            </div>
            <div class="program-grid">
              <button
                v-for="(operation, index) in procedures.p1"
                :key="`p1-${index}`"
                class="program-slot filled"
                :class="{ active: runningProcedureKey === 'p1' && runningOperationIndex === index }"
                :disabled="!availableProcedureKeys.includes('p1')"
                @click="removeOperation('p1', index)"
              >
                <img :src="operationSprite(operation)" :alt="operationLabel(operation)">
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.procLimits.p1 || 0, procedures.p1.length)"
                :key="`p1-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </section>

          <section class="program-tools">
            <button class="tool-btn" :disabled="isRunning" @click="undoLastOperation">Undo</button>
            <button class="tool-btn" :disabled="isRunning" @click="clearActiveProcedure">Clear Active</button>
            <button class="tool-btn" :disabled="isRunning || !hasCurrentDemo" @click="loadDemoProgram">Load Demo</button>
            <button class="tool-btn" :disabled="isRunning" @click="resetLevel(true)">Clear All</button>
          </section>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { LIGHTBOT_LEVEL_GROUPS, LIGHTBOT_LEVELS, VALID_LEVEL_IDS, makeTile } from '../data/lightbotLevels'
import { formatOps, solveLevelProgram } from '../utils/lightbotSolver'

const STORAGE_KEY = 'programtools-lightbot-progress-v5'
const EDITOR_DRAFT_STORAGE_KEY = 'programtools-lightbot-editor-draft-v1'
const LEVEL_OVERRIDE_STORAGE_KEY = 'programtools-lightbot-level-overrides-v1'
const EDITOR_GRID_SIZE = 6
const TILE_WIDTH = 96
const TILE_HEIGHT = 48
const TILE_DEPTH = 22
const DIRECTION_ORDER = ['forward', 'right', 'backward', 'left']
const DIRECTION_LABELS = {
  forward: 'Facing east',
  right: 'Facing south',
  backward: 'Facing west',
  left: 'Facing north'
}
const DIRECTION_VECTORS = {
  forward: { x: 1, y: 0 },
  right: { x: 0, y: 1 },
  backward: { x: -1, y: 0 },
  left: { x: 0, y: -1 }
}
const SPEED_MAP = { 1: 560, 2: 420, 3: 300, 4: 200, 5: 130 }
const BLOCK_SIZE = 1
const BLOCK_HEIGHT = 0.5
const BOARD_GAP = 0.04
const MATERIAL_COLORS = {
  topNormal: '#565e68',
  topTarget: '#1e4d6f',
  topLit: '#fffd00',
  side: '#646a71',
  line: '#2e3438',
  player: '#38ff00',
  antenna: '#d8a8ff',
  eye: '#171c22',
  shadow: '#465666'
}
const operationPalette = [
  { id: 'walk', label: 'Walk' },
  { id: 'light', label: 'Light' },
  { id: 'left', label: 'Turn left' },
  { id: 'right', label: 'Turn right' },
  { id: 'jump', label: 'Jump' },
  { id: 'p1', label: 'Call P1' }
]

const tutorialCards = [
  { title: 'Sequencing', copy: '把动作按顺序放入 MAIN，让机器人一步一步执行。', theme: 'mint', steps: ['↑', '💡', '↺'] },
  { title: 'Procedures', copy: '把重复片段放进 PROC1，然后在 MAIN 里调用它。', theme: 'cream', steps: ['P1', '↑', 'P1'] },
  { title: 'Loops By Recursion', copy: 'PROC1 里再调用 P1，就能得到递归式循环。', theme: 'sky', steps: ['P1', '⟳', '💡'] }
]

const learningPoints = ['Sequencing', 'Decomposition', 'Procedures', 'Recursive loops', 'Spatial reasoning']

function createEmptyEditorBoard(size = EDITOR_GRID_SIZE) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null))
}

function getStoredLightbotUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem('user_info') || 'null')
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function getLightbotStorageKey(baseKey) {
  const user = getStoredLightbotUser()
  const userKey = user?.id || user?._id || user?.username || 'guest'
  return `${baseKey}:${String(userKey)}`
}

function readLightbotStorage(baseKey) {
  const scopedKey = getLightbotStorageKey(baseKey)
  const scopedValue = localStorage.getItem(scopedKey)
  if (scopedValue !== null) {
    return scopedValue
  }

  const legacyValue = localStorage.getItem(baseKey)
  if (legacyValue !== null) {
    localStorage.setItem(scopedKey, legacyValue)
    return legacyValue
  }

  return null
}

function writeLightbotStorage(baseKey, value) {
  localStorage.setItem(getLightbotStorageKey(baseKey), value)
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

function cloneLevelDefinition(level) {
  return {
    ...level,
    procLimits: { ...(level.procLimits || {}) },
    tips: (level.tips || []).map((tip) => ({ ...tip })),
    board: cloneBoard(level.board),
    start: { ...level.start },
    demo: {
      main: [...(level.demo?.main || [])],
      p1: [...(level.demo?.p1 || [])]
    }
  }
}

function findOccupiedBounds(board) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    })
  })

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

function normalizeEditorBoard(board, minimumSize = EDITOR_GRID_SIZE) {
  const bounds = findOccupiedBounds(board)
  if (!bounds) {
    return {
      board: createEmptyEditorBoard(minimumSize),
      remapPoint(point) {
        return { ...point }
      }
    }
  }

  const contentWidth = bounds.maxX - bounds.minX + 1
  const contentHeight = bounds.maxY - bounds.minY + 1
  const width = Math.max(minimumSize, contentWidth + 2)
  const height = Math.max(minimumSize, contentHeight + 2)
  const offsetX = Math.floor((width - contentWidth) / 2)
  const offsetY = Math.floor((height - contentHeight) / 2)
  const normalized = Array.from({ length: height }, () => Array.from({ length: width }, () => null))

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const cell = board[y]?.[x] || null
      if (!cell) continue
      normalized[offsetY + y - bounds.minY][offsetX + x - bounds.minX] = { ...cell }
    }
  }

  return {
    board: normalized,
    remapPoint(point) {
      return {
        ...point,
        x: offsetX + point.x - bounds.minX,
        y: offsetY + point.y - bounds.minY
      }
    }
  }
}

function normalizeEditorState(board, start) {
  const normalized = normalizeEditorBoard(board)
  const remappedStart = normalized.remapPoint(start)
  const fallbackStart = findFirstPlatform(normalized.board) || { x: 0, y: 0 }
  const nextStart = normalized.board[remappedStart.y]?.[remappedStart.x]
    ? remappedStart
    : fallbackStart

  return {
    board: normalized.board,
    start: {
      ...start,
      x: nextStart.x,
      y: nextStart.y
    }
  }
}

function findFirstPlatform(board) {
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x]) {
        return { x, y }
      }
    }
  }
  return null
}

function createDefaultEditorDraft() {
  const board = createEmptyEditorBoard()
  board[0][0] = makeTile(1)
  board[0][1] = makeTile(1, true)
  return {
    title: 'My Level',
    skill: 'Custom',
    description: '学员自制关卡。',
    goal: '点亮所有目标格。',
    mainLimit: 8,
    p1Limit: 0,
    start: { x: 0, y: 0, dir: 'forward' },
    board
  }
}

function serializeEditorDraft(draft) {
  return {
    sourceLevelId: draft.sourceLevelId || null,
    chapterId: draft.chapterId || null,
    chapterTitle: draft.chapterTitle || null,
    chapterOrder: Number.isFinite(draft.chapterOrder) ? draft.chapterOrder : null,
    demo: {
      main: [...(draft.demo?.main || [])],
      p1: [...(draft.demo?.p1 || [])]
    },
    title: draft.title,
    skill: draft.skill,
    description: draft.description,
    goal: draft.goal,
    mainLimit: Number(draft.mainLimit) || 8,
    p1Limit: Number(draft.p1Limit) || 0,
    start: { ...draft.start },
    board: cloneBoard(draft.board)
  }
}

function loadSavedEditorDraft() {
  try {
    const raw = readLightbotStorage(EDITOR_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.board)) return null

    const normalized = normalizeEditorState(parsed.board, parsed.start || { x: 0, y: 0, dir: 'forward' })
    return {
      sourceLevelId: typeof parsed.sourceLevelId === 'string' ? parsed.sourceLevelId : null,
      chapterId: typeof parsed.chapterId === 'string' ? parsed.chapterId : null,
      chapterTitle: typeof parsed.chapterTitle === 'string' ? parsed.chapterTitle : null,
      chapterOrder: Number.isFinite(parsed.chapterOrder) ? parsed.chapterOrder : null,
      demo: {
        main: [...(parsed.demo?.main || [])],
        p1: [...(parsed.demo?.p1 || [])]
      },
      title: typeof parsed.title === 'string' ? parsed.title : 'My Level',
      skill: typeof parsed.skill === 'string' ? parsed.skill : 'Custom',
      description: typeof parsed.description === 'string' ? parsed.description : '学员自制关卡。',
      goal: typeof parsed.goal === 'string' ? parsed.goal : '点亮所有目标格。',
      mainLimit: Number(parsed.mainLimit) || 8,
      p1Limit: Number(parsed.p1Limit) || 0,
      start: { ...normalized.start, dir: parsed.start?.dir || 'forward' },
      board: normalized.board
    }
  } catch {
    return null
  }
}

function createEditorDraftFromLevel(level) {
  const normalized = normalizeEditorBoard(level.board)
  const start = normalized.remapPoint(level.start)

  return {
    sourceLevelId: level.id,
    chapterId: level.chapterId || null,
    chapterTitle: level.chapterTitle || null,
    chapterOrder: Number.isFinite(level.chapterOrder) ? level.chapterOrder : null,
    demo: {
      main: [...(level.demo?.main || [])],
      p1: [...(level.demo?.p1 || [])]
    },
    title: level.title,
    skill: level.skill,
    description: level.description,
    goal: level.goal,
    mainLimit: Number(level.mainLimit) || 8,
    p1Limit: Number(level.procLimits?.p1) || 0,
    start,
    board: normalized.board
  }
}

function applyDraftToEditor(draft) {
  Object.assign(editorDraft, {
    ...draft,
    start: { ...draft.start },
    board: cloneBoard(draft.board)
  })
  editorVerification.value = null
  editorTool.value = 'platform'
  editorHeight.value = 1
}

function buildCustomLevel(draft) {
  return {
    id: draft.sourceLevelId || 'custom-level',
    chapterId: draft.chapterId || 'custom',
    chapterTitle: draft.chapterTitle || '自定义',
    chapterOrder: Number.isFinite(draft.chapterOrder) ? draft.chapterOrder : -1,
    title: draft.title.trim() || 'My Level',
    skill: draft.skill.trim() || 'Custom',
    description: draft.description.trim() || '学员自制关卡。',
    goal: draft.goal.trim() || '点亮所有目标格。',
    mainLimit: Number(draft.mainLimit) || 8,
    procLimits: Number(draft.p1Limit) > 0 ? { p1: Number(draft.p1Limit) } : {},
    tips: [
      { title: 'Editor', copy: '这是当前编辑器生成的预览关卡。' },
      { title: 'Playtest', copy: '可以直接进入试玩，验证是否能被正常完成。' }
    ],
    board: cloneBoard(draft.board),
    start: { ...draft.start },
    demo: {
      main: [...(draft.demo?.main || [])],
      p1: [...(draft.demo?.p1 || [])]
    }
  }
}

function loadLevelOverrides() {
  try {
    const parsed = JSON.parse(readLightbotStorage(LEVEL_OVERRIDE_STORAGE_KEY) || '{}')
    if (!parsed || typeof parsed !== 'object') return {}

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => value && typeof value === 'object' && Array.isArray(value.board))
        .map(([levelId, value]) => [levelId, cloneLevelDefinition(value)])
    )
  } catch {
    return {}
  }
}

function persistLevelOverrides(overrides) {
  writeLightbotStorage(LEVEL_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides))
}

const levelOverrides = ref(loadLevelOverrides())
const levels = computed(() => LIGHTBOT_LEVELS.map((level) => cloneLevelDefinition(levelOverrides.value[level.id] || level)))
const levelGroups = computed(() => {
  const levelById = new Map(levels.value.map((level) => [level.id, level]))

  return LIGHTBOT_LEVEL_GROUPS.map((group, order) => ({
    ...group,
    order,
    levels: group.levels.map((level) => levelById.get(level.id) || cloneLevelDefinition(level)),
    startIndex: levels.value.findIndex((level) => level.id === group.levels[0]?.id)
  }))
})

function platformKey(x, y) {
  return `${x},${y}`
}

function cloneBot(start) {
  return { x: start.x, y: start.y, dir: start.dir }
}

function loadProgress() {
  try {
    const parsed = JSON.parse(readLightbotStorage(STORAGE_KEY) || '{}')
    return Array.isArray(parsed.completedLevelIds)
      ? parsed.completedLevelIds.filter((levelId) => VALID_LEVEL_IDS.has(levelId))
      : []
  } catch {
    return []
  }
}

function findRecommendedLevelIndex() {
  const completedIds = loadProgress()
  const nextIndex = levels.value.findIndex((level) => !completedIds.includes(level.id))
  return nextIndex >= 0 ? nextIndex : 0
}

function levelGlobalIndex(group, index) {
  return group.startIndex + index
}

function completedCountForGroup(group) {
  return group.levels.filter((level) => completedLevelIds.value.includes(level.id)).length
}

const screen = ref('select')
const selectedLevelIndex = ref(findRecommendedLevelIndex())
const activeProcedureKey = ref('main')
const mainProcedure = ref([])
const procedures = ref({ p1: [] })
const completedLevelIds = ref(loadProgress())
const litKeys = ref([])
const bot = ref(cloneBot(levels.value[0].start))
const isRunning = ref(false)
const runningProcedureKey = ref('')
const runningOperationIndex = ref(-1)
const runNonce = ref(0)
const speedValue = ref(3)
const statusText = ref('Ready')
const statusTone = ref('neutral')
const showFinishPanel = ref(false)
const briefSceneHost = ref(null)
const playSceneHost = ref(null)
const editorSceneHost = ref(null)
const activeCustomLevel = ref(null)
const editorTool = ref('platform')
const editorHeight = ref(1)
const editorReturnScreen = ref('select')
const editorDraft = reactive(createDefaultEditorDraft())
const editorBaseDraft = ref(createDefaultEditorDraft())
const editorVerification = ref(null)
let editorPaintActive = false
let editorPaintedKeys = new Set()

let briefSceneController = null
let playSceneController = null
let editorSceneController = null

const currentLevel = computed(() => activeCustomLevel.value || levels.value[selectedLevelIndex.value])
const isCustomPlaytest = computed(() => Boolean(activeCustomLevel.value))
const hasCurrentDemo = computed(() => {
  const demo = currentLevel.value.demo || { main: [], p1: [] }
  return (demo.main?.length || 0) + (demo.p1?.length || 0) > 0
})
const availableProcedureKeys = computed(() => Object.keys(currentLevel.value.procLimits || {}))
const directionLabel = computed(() => DIRECTION_LABELS[bot.value.dir])
const robotDirClass = computed(() => `dir-${bot.value.dir}`)
const editorLevelPreview = computed(() => buildCustomLevel(editorDraft))
const editorSignature = computed(() => JSON.stringify(editorLevelPreview.value))
const editorSolvedProgram = computed(() => editorVerification.value?.solvable ? editorVerification.value.program : null)
const canSaveEditorLevel = computed(() => {
  return Boolean(editorDraft.sourceLevelId) && editorVerification.value?.solvable && editorVerification.value.signature === editorSignature.value
})
const editorPublishToneClass = computed(() => {
  if (!editorVerification.value) return 'pending'
  return editorVerification.value.solvable ? 'success' : 'danger'
})
const editorPublishTitle = computed(() => {
  if (!editorVerification.value) return '保存前验证'
  if (!editorDraft.sourceLevelId) return '当前是新建草稿'
  return editorVerification.value.solvable ? '可保存到游戏' : '验证未通过'
})
const editorPublishMessage = computed(() => {
  if (!editorVerification.value) {
    return '保存到游戏前需要先验证当前草稿能在现有 MAIN / P1 槽位限制内通关。'
  }
  if (editorVerification.value.signature !== editorSignature.value) {
    return '草稿已经修改，必须重新验证后才能保存到游戏。'
  }
  if (!editorDraft.sourceLevelId) {
    return '当前是新建草稿，还没有对应的内置关卡槽位；请从现有关卡进入编辑器后再保存到游戏。'
  }
  return `${editorVerification.value.message}。点击“保存到游戏”后，这个关卡只会在当前登录账号下替换为你修改后的版本。`
})

const boardPlatforms = computed(() => {
  const platforms = []
  currentLevel.value.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      platforms.push({ x, y, cell, key: platformKey(x, y) })
    })
  })
  return platforms
})

const boardLookup = computed(() => {
  const lookup = new Map()
  boardPlatforms.value.forEach((item) => {
    lookup.set(item.key, item.cell)
  })
  return lookup
})

const targetKeys = computed(() => boardPlatforms.value.filter((item) => item.cell.target).map((item) => item.key))

const sceneMetrics = computed(() => {
  const cells = boardPlatforms.value.map((item) => {
    const x = (item.x - item.y) * TILE_WIDTH / 2
    const y = (item.x + item.y) * TILE_HEIGHT / 2 - item.cell.h * TILE_DEPTH
    return { ...item, sceneX: x, sceneY: y }
  })

  const minX = Math.min(...cells.map((cell) => cell.sceneX))
  const minY = Math.min(...cells.map((cell) => cell.sceneY))
  const maxX = Math.max(...cells.map((cell) => cell.sceneX + TILE_WIDTH))
  const maxY = Math.max(...cells.map((cell) => cell.sceneY + TILE_HEIGHT + cell.cell.h * TILE_DEPTH))

  return {
    cells,
    minX,
    minY,
    width: Math.ceil(maxX - minX + 120),
    height: Math.ceil(maxY - minY + 120)
  }
})

const sceneScale = computed(() => {
  const widthScale = 860 / sceneMetrics.value.width
  const heightScale = 480 / sceneMetrics.value.height
  return Math.max(1.15, Math.min(2.3, widthScale, heightScale))
})

const sceneStyle = computed(() => ({
  width: `${sceneMetrics.value.width}px`,
  height: `${sceneMetrics.value.height}px`
}))

const sceneViewportStyle = computed(() => ({
  width: `${sceneMetrics.value.width}px`,
  height: `${sceneMetrics.value.height}px`,
  transform: `scale(${sceneScale.value})`
}))

const sceneStacks = computed(() => sceneMetrics.value.cells.map((item) => {
  const left = item.sceneX - sceneMetrics.value.minX + 58
  const baseTop = item.sceneY - sceneMetrics.value.minY + 56
  const isTarget = Boolean(item.cell.target)
  const isLit = litKeys.value.includes(item.key)

  return {
    key: item.key,
    stackStyle: {
      left: `${left}px`,
      top: `${baseTop}px`,
      '--shadow-top': `${item.cell.h * TILE_DEPTH + 38}px`
    },
    blocks: Array.from({ length: item.cell.h }, (_, layerIndex) => {
      const isTopBlock = layerIndex === item.cell.h - 1
      return {
        blockKey: `${item.key}-${layerIndex}`,
        isStart: isTopBlock && currentLevel.value.start.x === item.x && currentLevel.value.start.y === item.y,
        isTarget: isTopBlock && isTarget,
        isLit: isTopBlock && isLit,
        style: {
          left: '0px',
          top: `${(item.cell.h - layerIndex - 1) * TILE_DEPTH}px`
        }
      }
    })
  }
}))

const robotStyle = computed(() => {
  const cell = sceneMetrics.value.cells.find((item) => item.x === bot.value.x && item.y === bot.value.y)
  if (!cell) {
    return { display: 'none' }
  }

  return {
    left: `${cell.sceneX - sceneMetrics.value.minX + 106}px`,
    top: `${cell.sceneY - sceneMetrics.value.minY + 64 - cell.cell.h * 0}px`
  }
})

watch(completedLevelIds, (value) => {
  writeLightbotStorage(STORAGE_KEY, JSON.stringify({ completedLevelIds: value }))
}, { deep: true })

function setStatus(text, tone = 'neutral') {
  statusText.value = text
  statusTone.value = tone
}

function editorCellAt(x, y) {
  return editorDraft.board[y]?.[x] || null
}

function editorCellClass(x, y) {
  const cell = editorCellAt(x, y)
  return {
    filled: Boolean(cell),
    target: Boolean(cell?.target),
    start: editorDraft.start.x === x && editorDraft.start.y === y,
    empty: !cell
  }
}

function resetEditorDraft() {
  applyDraftToEditor(editorBaseDraft.value)
  setStatus('Editor reset')
}

function openEditor(level = null) {
  activeCustomLevel.value = null
  editorReturnScreen.value = screen.value === 'brief' ? 'brief' : 'select'
  const nextDraft = level ? createEditorDraftFromLevel(level) : (loadSavedEditorDraft() || createDefaultEditorDraft())
  editorBaseDraft.value = {
    ...nextDraft,
    start: { ...nextDraft.start },
    board: cloneBoard(nextDraft.board)
  }
  applyDraftToEditor(nextDraft)
  screen.value = 'editor'
  setStatus(level ? 'Loaded level into editor' : (loadSavedEditorDraft() ? '已载入保存草稿' : 'Editor ready'))
}

function leaveEditor() {
  activeCustomLevel.value = null
  screen.value = editorReturnScreen.value === 'brief' ? 'brief' : 'select'
}

function saveEditorDraft() {
  const payload = serializeEditorDraft(editorDraft)
  writeLightbotStorage(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(payload))
  setStatus('草稿已保存到当前账号的本地浏览器数据', 'success')
}

function applyEditorCell(x, y) {
  const board = cloneBoard(editorDraft.board)
  const currentCell = board[y][x]
  let nextStart = { ...editorDraft.start }

  if (editorTool.value === 'erase') {
    board[y][x] = null
    if (editorDraft.start.x === x && editorDraft.start.y === y) {
      const fallbackStart = findFirstPlatform(board)
      if (fallbackStart) {
        nextStart = { ...nextStart, ...fallbackStart }
      }
    }
  } else if (editorTool.value === 'start') {
    if (!currentCell) {
      board[y][x] = makeTile(editorHeight.value)
    }
    nextStart = { ...nextStart, x, y }
  } else {
    board[y][x] = makeTile(editorHeight.value, editorTool.value === 'target')
  }

  const normalized = normalizeEditorState(board, nextStart)
  editorDraft.board = normalized.board
  editorDraft.start = normalized.start
}

function beginEditorPaint(x, y) {
  editorPaintActive = true
  editorPaintedKeys = new Set()
  continueEditorPaint(x, y)
}

function continueEditorPaint(x, y) {
  if (!editorPaintActive) return

  const key = platformKey(x, y)
  if (editorPaintedKeys.has(key)) return

  editorPaintedKeys.add(key)
  applyEditorCell(x, y)
}

function endEditorPaint() {
  editorPaintActive = false
  editorPaintedKeys.clear()
}

function validateEditorLevel() {
  const level = editorLevelPreview.value
  const cells = level.board.flat().filter(Boolean)
  if (!cells.length) {
    return { ok: false, message: 'Place at least one platform' }
  }
  if (!level.board[level.start.y]?.[level.start.x]) {
    return { ok: false, message: 'Start must be on a platform' }
  }
  if (!cells.some((cell) => cell.target)) {
    return { ok: false, message: 'Add at least one target tile' }
  }
  return { ok: true }
}

function verifyEditorLevelForPublish() {
  const validation = validateEditorLevel()
  if (!validation.ok) {
    editorVerification.value = {
      solvable: false,
      signature: editorSignature.value,
      message: validation.message
    }
    setStatus(validation.message, 'danger')
    return
  }

  const level = editorLevelPreview.value
  const solveResult = solveLevelProgram(level)
  if (!solveResult.solvable) {
    editorVerification.value = {
      solvable: false,
      signature: editorSignature.value,
      message: solveResult.reason
    }
    setStatus(solveResult.reason, 'danger')
    return
  }

  editorVerification.value = {
    solvable: true,
    signature: editorSignature.value,
    program: {
      main: [...solveResult.main],
      p1: [...solveResult.p1]
    },
    message: `已验证通过：最短 ${solveResult.rawLength} 步，MAIN ${solveResult.main.length}/${level.mainLimit}${level.procLimits.p1 ? `，P1 ${solveResult.p1.length}/${level.procLimits.p1}` : ''}`
  }
  setStatus('Level verified for publish', 'success')
}

function saveEditorLevelToGame() {
  if (!canSaveEditorLevel.value) {
    if (!editorDraft.sourceLevelId) {
      setStatus('当前草稿没有对应的内置关卡，无法直接保存到游戏', 'danger')
      return
    }
    setStatus('Save blocked: verify current draft first', 'danger')
    return
  }

  const program = editorSolvedProgram.value || { main: [], p1: [] }
  const savedLevel = cloneLevelDefinition({
    ...editorLevelPreview.value,
    demo: {
      main: [...program.main],
      p1: [...program.p1]
    }
  })

  const nextOverrides = {
    ...levelOverrides.value,
    [savedLevel.id]: savedLevel
  }

  levelOverrides.value = nextOverrides
  persistLevelOverrides(nextOverrides)
  editorDraft.demo = {
    main: [...savedLevel.demo.main],
    p1: [...savedLevel.demo.p1]
  }
  editorBaseDraft.value = serializeEditorDraft(editorDraft)

  saveEditorDraft()
  setStatus('已保存到游戏；这个关卡只会在当前登录账号下使用你修改后的版本', 'success')
}

function startCustomPlaytest() {
  const validation = validateEditorLevel()
  if (!validation.ok) {
    setStatus(validation.message, 'danger')
    return
  }
  activeCustomLevel.value = editorLevelPreview.value
  resetLevel(true)
  screen.value = 'play'
  setStatus('Custom level ready')
}

function operationLabel(operationId) {
  return {
    walk: 'Walk',
    light: 'Light',
    left: 'Left',
    right: 'Right',
    jump: 'Jump',
    p1: 'P1'
  }[operationId] || operationId
}

function operationSprite(operationId) {
  return {
    walk: '/lightbot/operation-move.png',
    light: '/lightbot/operation-lamp.png',
    left: '/lightbot/operation-turn-left.png',
    right: '/lightbot/operation-turn-right.png',
    jump: '/lightbot/operation-jump.png',
    p1: '/lightbot/operation-proc.png'
  }[operationId] || '/lightbot/operation-move.png'
}

function emptySlots(limit, used) {
  return Array.from({ length: Math.max(limit - used, 0) }, (_, index) => index)
}

function resetLevel(clearPrograms = false) {
  runNonce.value += 1
  isRunning.value = false
  runningProcedureKey.value = ''
  runningOperationIndex.value = -1
  showFinishPanel.value = false
  litKeys.value = []
  bot.value = cloneBot(currentLevel.value.start)
  if (clearPrograms) {
    mainProcedure.value = []
    procedures.value = { p1: [] }
    activeProcedureKey.value = 'main'
  }
  setStatus(mainProcedure.value.length ? 'Code reset' : 'Program is empty')
}

function goToLevelSelect() {
  activeCustomLevel.value = null
  screen.value = 'select'
}

function quickStartLevel(index = selectedLevelIndex.value) {
  activeCustomLevel.value = null
  selectedLevelIndex.value = index
  resetLevel(true)
  screen.value = 'play'
  setStatus('Level ready')
}

function openLevelBrief(index) {
  activeCustomLevel.value = null
  selectedLevelIndex.value = index
  resetLevel(true)
  screen.value = 'brief'
}

function startLevel() {
  resetLevel(false)
  screen.value = 'play'
}

function loadDemoProgram() {
  if (!hasCurrentDemo.value) {
    setStatus('No demo for this level', 'danger')
    return
  }
  mainProcedure.value = [...currentLevel.value.demo.main]
  procedures.value = { p1: [...(currentLevel.value.demo.p1 || [])] }
  setStatus('Demo loaded')
}

function loadDemoAndStart() {
  loadDemoProgram()
  startLevel()
}

function appendOperation(operationId) {
  if (activeProcedureKey.value === 'p1' && !availableProcedureKeys.value.includes('p1')) {
    return
  }

  const isMain = activeProcedureKey.value === 'main'
  const currentList = isMain ? mainProcedure.value : procedures.value.p1
  const limit = isMain ? currentLevel.value.mainLimit : (currentLevel.value.procLimits.p1 || 0)
  if (currentList.length >= limit) {
    setStatus('No empty slot left', 'danger')
    return
  }

  if (isMain) {
    mainProcedure.value = [...mainProcedure.value, operationId]
  } else {
    procedures.value = { ...procedures.value, p1: [...procedures.value.p1, operationId] }
  }

  setStatus(`${operationLabel(operationId)} added`)
}

function removeOperation(procKey, index) {
  if (isRunning.value) return
  if (procKey === 'main') {
    mainProcedure.value = mainProcedure.value.filter((_, itemIndex) => itemIndex !== index)
  } else {
    procedures.value = {
      ...procedures.value,
      p1: procedures.value.p1.filter((_, itemIndex) => itemIndex !== index)
    }
  }
  setStatus('Operation removed')
}

function undoLastOperation() {
  if (isRunning.value) return
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = mainProcedure.value.slice(0, -1)
  } else {
    procedures.value = { ...procedures.value, p1: procedures.value.p1.slice(0, -1) }
  }
  setStatus('Last operation removed')
}

function clearActiveProcedure() {
  if (isRunning.value) return
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = []
  } else {
    procedures.value = { ...procedures.value, p1: [] }
  }
  setStatus('Procedure cleared')
}

function platformAt(x, y) {
  return boardLookup.value.get(platformKey(x, y)) || null
}

function nextPosition() {
  const vector = DIRECTION_VECTORS[bot.value.dir]
  return { x: bot.value.x + vector.x, y: bot.value.y + vector.y }
}

function rotateRight() {
  const index = DIRECTION_ORDER.indexOf(bot.value.dir)
  bot.value = { ...bot.value, dir: DIRECTION_ORDER[(index + 1) % DIRECTION_ORDER.length] }
}

function rotateLeft() {
  const index = DIRECTION_ORDER.indexOf(bot.value.dir)
  bot.value = { ...bot.value, dir: DIRECTION_ORDER[(index + 3) % DIRECTION_ORDER.length] }
}

function toggleCurrentTarget() {
  const key = platformKey(bot.value.x, bot.value.y)
  if (!targetKeys.value.includes(key)) return false
  if (litKeys.value.includes(key)) {
    litKeys.value = litKeys.value.filter((item) => item !== key)
  } else {
    litKeys.value = [...litKeys.value, key]
  }
  return true
}

function markFinished() {
  if (!targetKeys.value.length || !targetKeys.value.every((key) => litKeys.value.includes(key))) {
    return false
  }
  if (!isCustomPlaytest.value && !completedLevelIds.value.includes(currentLevel.value.id)) {
    completedLevelIds.value = [...completedLevelIds.value, currentLevel.value.id]
  }
  showFinishPanel.value = true
  setStatus('Level complete', 'success')
  return true
}

function waitStep() {
  return new Promise((resolve) => window.setTimeout(resolve, SPEED_MAP[String(speedValue.value)] || SPEED_MAP[3]))
}

async function executeOperation(operationId, nonce, depth) {
  if (nonce !== runNonce.value) return

  if (operationId === 'right') {
    rotateRight()
    await waitStep()
    return
  }

  if (operationId === 'left') {
    rotateLeft()
    await waitStep()
    return
  }

  if (operationId === 'light') {
    if (!toggleCurrentTarget()) {
      setStatus('Light ignored: no target here', 'danger')
    }
    await waitStep()
    markFinished()
    return
  }

  if (operationId === 'p1') {
    await runProcedure('p1', procedures.value.p1, nonce, depth + 1)
    return
  }

  const next = nextPosition()
  const currentPlatform = platformAt(bot.value.x, bot.value.y)
  const nextPlatform = platformAt(next.x, next.y)

  if (!currentPlatform || !nextPlatform) {
    setStatus(`${operationLabel(operationId)} ignored`, 'danger')
    await waitStep()
    return
  }

  if (operationId === 'walk') {
    if (currentPlatform.h === nextPlatform.h) {
      bot.value = { ...bot.value, x: next.x, y: next.y }
    } else {
      setStatus('Walk ignored: different height', 'danger')
    }
    await waitStep()
    return
  }

  if (operationId === 'jump') {
    const heightDiff = nextPlatform.h - currentPlatform.h
    if (heightDiff === 1 || heightDiff < 0) {
      bot.value = { ...bot.value, x: next.x, y: next.y }
    } else {
      setStatus('Jump ignored', 'danger')
    }
    await waitStep()
  }
}

async function runProcedure(procKey, operations, nonce, depth = 0) {
  if (depth > 8 || nonce !== runNonce.value) return
  for (let index = 0; index < operations.length; index += 1) {
    if (nonce !== runNonce.value) return
    runningProcedureKey.value = procKey
    runningOperationIndex.value = index
    await executeOperation(operations[index], nonce, depth)
    if (markFinished()) return
  }
}

async function runCode() {
  if (!mainProcedure.value.length || isRunning.value) return
  resetLevel(false)
  const nonce = runNonce.value
  isRunning.value = true
  setStatus('Program running')

  try {
    await runProcedure('main', mainProcedure.value, nonce)
    if (nonce === runNonce.value && !markFinished()) {
      setStatus('Program finished', 'neutral')
    }
  } finally {
    if (nonce === runNonce.value) {
      isRunning.value = false
      runningProcedureKey.value = ''
      runningOperationIndex.value = -1
    }
  }
}

function goToNextLevel() {
  if (isCustomPlaytest.value) {
    activeCustomLevel.value = null
    screen.value = 'editor'
    return
  }
  if (selectedLevelIndex.value < levels.value.length - 1) {
    quickStartLevel(selectedLevelIndex.value + 1)
  } else {
    screen.value = 'select'
  }
}

function leavePlayScreen() {
  if (isCustomPlaytest.value) {
    activeCustomLevel.value = null
    screen.value = 'editor'
    return
  }
  goToLevelSelect()
}

function openPlayContext() {
  if (isCustomPlaytest.value) {
    activeCustomLevel.value = null
    screen.value = 'editor'
    return
  }
  screen.value = 'brief'
}

function createSceneController(host, options = {}) {
  if (!host) return null

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = false
  host.innerHTML = ''
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100)
  const boardGroup = new THREE.Group()
  const robotGroup = new THREE.Group()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const interactiveTargets = []

  scene.add(boardGroup)
  scene.add(robotGroup)

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.9)
  const keyLight = new THREE.DirectionalLight(0xf7fbff, 1.35)
  const fillLight = new THREE.DirectionalLight(0xd8f0ff, 0.55)
  keyLight.position.set(8, 14, 10)
  fillLight.position.set(-6, 9, -8)
  scene.add(ambientLight, keyLight, fillLight)

  let currentViewSize = 3.55
  let currentMaxHeight = 1

  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 40),
    new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.shadow, transparent: true, opacity: 0.2 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -0.6
  scene.add(shadowPlane)

  const sharedMaterials = {
    topNormal: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topNormal }),
    topTarget: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topTarget }),
    topLit: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topLit }),
    side: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.side }),
    line: new THREE.LineBasicMaterial({ color: MATERIAL_COLORS.line }),
    player: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.player }),
    antenna: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.antenna }),
    eye: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.eye }),
    targetRing: new THREE.MeshBasicMaterial({ color: 0xf3fbff }),
    targetCore: new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.topLit }),
    editorGhost: new THREE.MeshBasicMaterial({ color: 0x8fb0c4, transparent: true, opacity: 0.18 }),
    editorGhostLine: new THREE.LineBasicMaterial({ color: 0x8ea7bb, transparent: true, opacity: 0.4 }),
    hitArea: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  }

  const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE)
  const outlineGeometry = new THREE.EdgesGeometry(blockGeometry)
  const editorGhostGeometry = new THREE.BoxGeometry(BLOCK_SIZE * 0.94, 0.02, BLOCK_SIZE * 0.94)
  const editorGhostOutline = new THREE.EdgesGeometry(editorGhostGeometry)
  const hitPlaneGeometry = new THREE.PlaneGeometry(BLOCK_SIZE * 0.94, BLOCK_SIZE * 0.94)

  function resize() {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    const aspect = width / height
    camera.left = -currentViewSize * aspect
    camera.right = currentViewSize * aspect
    camera.top = currentViewSize
    camera.bottom = -currentViewSize
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render()
  }

  function clearGroup(group) {
    if (group === boardGroup) {
      interactiveTargets.length = 0
    }
    group.children.slice().forEach((child) => {
      child.traverse?.((node) => {
        if (!node.geometry) return
        if (
          node.geometry !== blockGeometry &&
          node.geometry !== outlineGeometry &&
          node.geometry !== editorGhostGeometry &&
          node.geometry !== editorGhostOutline &&
          node.geometry !== hitPlaneGeometry
        ) {
          node.geometry.dispose()
        }
      })
      group.remove(child)
    })
  }

  function buildBoard(level, litKeyList) {
    clearGroup(boardGroup)
    const litSet = new Set(litKeyList)
    const tiles = []
    const boardHeight = level.board.length
    const boardWidth = Math.max(...level.board.map((row) => row.length), 0)

    level.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return
        tiles.push({ x, y, cell })
      })
    })

    if (!tiles.length && !options.onCellSelect) {
      render()
      return
    }

    const layoutCells = options.onCellSelect
      ? Array.from({ length: boardHeight }, (_, y) => Array.from({ length: boardWidth }, (_, x) => ({ x, y }))).flat()
      : tiles

    const xs = layoutCells.map((item) => item.x * (BLOCK_SIZE + BOARD_GAP))
    const zs = layoutCells.map((item) => item.y * (BLOCK_SIZE + BOARD_GAP))
    const heights = tiles.map((item) => item.cell.h)
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2
    const spanX = Math.max(...xs) - Math.min(...xs) + BLOCK_SIZE
    const spanZ = Math.max(...zs) - Math.min(...zs) + BLOCK_SIZE
    currentMaxHeight = Math.max(...heights, 1)
    currentViewSize = Math.max(2.15, Math.min(3.55, Math.max(spanX, spanZ) * 0.56 + currentMaxHeight * 0.18))
    boardGroup.position.set(-centerX, 0, -centerZ)
    shadowPlane.position.x = -centerX
    shadowPlane.position.z = -centerZ
    shadowPlane.scale.setScalar(Math.max(spanX, spanZ) / 2.8)

    if (options.onCellSelect) {
      for (let y = 0; y < boardHeight; y += 1) {
        for (let x = 0; x < boardWidth; x += 1) {
          const existingCell = level.board[y]?.[x] || null
          const hitY = (existingCell?.h || 0) * BLOCK_HEIGHT + 0.03

          if (!existingCell) {
            const ghost = new THREE.Mesh(editorGhostGeometry, sharedMaterials.editorGhost)
            ghost.position.set(x * (BLOCK_SIZE + BOARD_GAP), 0.01, y * (BLOCK_SIZE + BOARD_GAP))
            boardGroup.add(ghost)

            const ghostOutline = new THREE.LineSegments(editorGhostOutline, sharedMaterials.editorGhostLine)
            ghostOutline.position.copy(ghost.position)
            boardGroup.add(ghostOutline)
          }

          const hitArea = new THREE.Mesh(hitPlaneGeometry, sharedMaterials.hitArea)
          hitArea.rotation.x = -Math.PI / 2
          hitArea.position.set(x * (BLOCK_SIZE + BOARD_GAP), hitY, y * (BLOCK_SIZE + BOARD_GAP))
          hitArea.userData.editorCell = { x, y }
          boardGroup.add(hitArea)
          interactiveTargets.push(hitArea)
        }
      }
    }

    tiles.forEach((item) => {
      const tileGroup = new THREE.Group()
      tileGroup.position.set(item.x * (BLOCK_SIZE + BOARD_GAP), 0, item.y * (BLOCK_SIZE + BOARD_GAP))

      for (let layer = 0; layer < item.cell.h; layer += 1) {
        const isTop = layer === item.cell.h - 1
        const isLit = isTop && litSet.has(platformKey(item.x, item.y))
        const topMaterial = isTop
          ? (isLit ? sharedMaterials.topLit : item.cell.target ? sharedMaterials.topTarget : sharedMaterials.topNormal)
          : sharedMaterials.side
        const materials = [sharedMaterials.side, sharedMaterials.side, topMaterial, sharedMaterials.side, sharedMaterials.side, sharedMaterials.side]
        const block = new THREE.Mesh(blockGeometry, materials)
        block.position.y = (layer + 0.5) * BLOCK_HEIGHT
        block.userData.editorCell = { x: item.x, y: item.y }
        tileGroup.add(block)
        interactiveTargets.push(block)

        const outline = new THREE.LineSegments(outlineGeometry, sharedMaterials.line)
        outline.position.copy(block.position)
        tileGroup.add(outline)
      }

      if (item.cell.target) {
        const topY = item.cell.h * BLOCK_HEIGHT + 0.03
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 12, 32), sharedMaterials.targetRing)
        ring.rotation.x = Math.PI / 2
        ring.position.set(0, topY, 0)
        tileGroup.add(ring)

        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24), sharedMaterials.targetCore)
        core.position.set(0, topY, 0)
        tileGroup.add(core)
      }

      boardGroup.add(tileGroup)
    })

    render()
  }

  function updateRobot(level, robotState) {
    clearGroup(robotGroup)
    const cell = level.board[robotState.y]?.[robotState.x]
    if (!cell) {
      render()
      return
    }

    const robotBase = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.44), sharedMaterials.player)
    body.position.y = 0.56
    robotBase.add(body)

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.32), sharedMaterials.player)
    head.position.y = 0.96
    robotBase.add(head)

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 12), sharedMaterials.antenna)
    antenna.position.y = 1.18
    robotBase.add(antenna)

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), sharedMaterials.antenna)
    antennaTip.position.y = 1.34
    robotBase.add(antennaTip)

    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), sharedMaterials.eye)
    const eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), sharedMaterials.eye)
    eyeLeft.position.set(-0.075, 0.985, 0.172)
    eyeRight.position.set(0.075, 0.985, 0.172)
    robotBase.add(eyeLeft, eyeRight)

    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.03), sharedMaterials.eye)
    facePlate.position.set(0, 0.85, 0.225)
    robotBase.add(facePlate)

    const browPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.04), sharedMaterials.antenna)
    browPlate.position.set(0, 1.055, 0.18)
    robotBase.add(browPlate)

    const frontNose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), sharedMaterials.antenna)
    frontNose.position.set(0, 0.86, 0.26)
    robotBase.add(frontNose)

    const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.03), sharedMaterials.eye)
    chestPanel.position.set(0, 0.57, 0.235)
    robotBase.add(chestPanel)

    const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), sharedMaterials.side)
    const footRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), sharedMaterials.side)
    footLeft.position.set(-0.1, 0.14, 0)
    footRight.position.set(0.1, 0.14, 0)
    robotBase.add(footLeft, footRight)

    const dirRotation = {
      forward: Math.PI / 2,
      right: 0,
      backward: -Math.PI / 2,
      left: Math.PI
    }

    robotBase.rotation.y = dirRotation[robotState.dir] || 0
    robotGroup.position.set(
      robotState.x * (BLOCK_SIZE + BOARD_GAP) + boardGroup.position.x,
      cell.h * BLOCK_HEIGHT,
      robotState.y * (BLOCK_SIZE + BOARD_GAP) + boardGroup.position.z
    )
    robotGroup.add(robotBase)
    render()
  }

  function update(level, robotState, litKeyList) {
    buildBoard(level, litKeyList)
    updateRobot(level, robotState)
    resize()

    camera.position.set(5.6, 6.5 + currentMaxHeight * 0.44, 5.6)
    camera.lookAt(0, currentMaxHeight * BLOCK_HEIGHT * 0.58, 0)
    render()
  }

  function render() {
    renderer.render(scene, camera)
  }

  function pickEditorCell(event) {
    if (!options.onCellSelect) return null

    if (!options.onCellSelect) return

    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    const hit = raycaster.intersectObjects(interactiveTargets, false).find((entry) => entry.object.userData?.editorCell)
    return hit?.object.userData?.editorCell || null
  }

  function handleScenePointerDown(event) {
    if (!options.onCellSelect) return

    const cell = pickEditorCell(event)
    if (!cell) return

    renderer.domElement.setPointerCapture?.(event.pointerId)
    options.onPaintStart?.(cell.x, cell.y)
  }

  function handleScenePointerMove(event) {
    if (!options.onCellSelect || !editorPaintActive) return

    const cell = pickEditorCell(event)
    if (!cell) return

    options.onPaintMove?.(cell.x, cell.y)
  }

  function handleScenePointerUp(event) {
    if (!options.onCellSelect) return

    renderer.domElement.releasePointerCapture?.(event.pointerId)
    options.onPaintEnd?.()
  }

  function handleScenePointerCancel(event) {
    if (!options.onCellSelect) return

    renderer.domElement.releasePointerCapture?.(event.pointerId)
    options.onPaintEnd?.()
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => resize())
    : null

  if (resizeObserver) {
    resizeObserver.observe(host)
  }
  if (options.onCellSelect) {
    renderer.domElement.addEventListener('pointerdown', handleScenePointerDown)
    renderer.domElement.addEventListener('pointermove', handleScenePointerMove)
    renderer.domElement.addEventListener('pointerup', handleScenePointerUp)
    renderer.domElement.addEventListener('pointercancel', handleScenePointerCancel)
  }
  resize()

  return {
    host,
    update,
    resize,
    dispose() {
      resizeObserver?.disconnect()
      if (options.onCellSelect) {
        renderer.domElement.removeEventListener('pointerdown', handleScenePointerDown)
        renderer.domElement.removeEventListener('pointermove', handleScenePointerMove)
        renderer.domElement.removeEventListener('pointerup', handleScenePointerUp)
        renderer.domElement.removeEventListener('pointercancel', handleScenePointerCancel)
      }
      renderer.dispose()
      blockGeometry.dispose()
      outlineGeometry.dispose()
      editorGhostGeometry.dispose()
      editorGhostOutline.dispose()
      hitPlaneGeometry.dispose()
      Object.values(sharedMaterials).forEach((material) => material.dispose())
      host.innerHTML = ''
    }
  }
}

function syncSceneControllers() {
  if (screen.value === 'brief' && briefSceneHost.value) {
    if (!briefSceneController) {
      briefSceneController = createSceneController(briefSceneHost.value)
    }
    briefSceneController?.update(currentLevel.value, currentLevel.value.start, [])
  } else if (briefSceneController) {
    briefSceneController.dispose()
    briefSceneController = null
  }

  if (screen.value === 'play' && playSceneHost.value) {
    if (!playSceneController) {
      playSceneController = createSceneController(playSceneHost.value)
    }
    playSceneController?.update(currentLevel.value, bot.value, litKeys.value)
  } else if (playSceneController) {
    playSceneController.dispose()
    playSceneController = null
  }

  if (screen.value === 'editor' && editorSceneHost.value) {
    if (!editorSceneController) {
      editorSceneController = createSceneController(editorSceneHost.value, {
        onCellSelect: applyEditorCell,
        onPaintStart: beginEditorPaint,
        onPaintMove: continueEditorPaint,
        onPaintEnd: endEditorPaint
      })
    }
    editorSceneController?.update(editorLevelPreview.value, editorLevelPreview.value.start, [])
  } else if (editorSceneController) {
    editorSceneController.dispose()
    editorSceneController = null
  }
}

watch(
  () => [screen.value, currentLevel.value.id, editorSignature.value],
  async () => {
    await nextTick()
    syncSceneControllers()
  },
  { immediate: true }
)

watch(
  () => [currentLevel.value.id, bot.value.x, bot.value.y, bot.value.dir, litKeys.value.join('|')],
  () => {
    playSceneController?.update(currentLevel.value, bot.value, litKeys.value)
    briefSceneController?.update(currentLevel.value, currentLevel.value.start, [])
  }
)

watch(editorSignature, () => {
  if (editorVerification.value && editorVerification.value.signature !== editorSignature.value) {
    editorVerification.value = null
  }
  editorSceneController?.update(editorLevelPreview.value, editorLevelPreview.value.start, [])
})

watch(screen, () => {
  endEditorPaint()
})

onMounted(async () => {
  window.addEventListener('pointerup', endEditorPaint)
  await nextTick()
  syncSceneControllers()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', endEditorPaint)
  briefSceneController?.dispose()
  playSceneController?.dispose()
  editorSceneController?.dispose()
  briefSceneController = null
  playSceneController = null
  editorSceneController = null
})

resetLevel(true)
</script>

<style scoped>
.lightbot-page {
  min-height: calc(100vh - 80px);
  padding: 12px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 32%),
    linear-gradient(180deg, #eff4f1 0%, #e1ebf5 100%);
  color: #34414d;
}

.screen-kicker {
  margin: 0 0 8px;
  color: #5ba9d6;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.tutorial-screen,
.select-screen,
.brief-screen,
.play-screen {
  min-height: calc(100vh - 104px);
}

.tutorial-screen {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tutorial-hero {
  display: grid;
  grid-template-columns: minmax(300px, 420px) 1fr;
  gap: 24px;
}

.hero-copy,
.tutorial-card,
.tutorial-learn,
.select-header,
.level-card,
.brief-shell,
.board-stage,
.program-panel,
.program-tools {
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(103, 126, 157, 0.18);
}

.hero-copy {
  padding: 32px;
  background: linear-gradient(180deg, rgba(188, 239, 224, 0.95), rgba(226, 245, 235, 0.95));
}

.hero-copy h1,
.select-header h1,
.brief-copy h1,
.board-topbar h1 {
  margin: 0;
  line-height: 1.04;
}

.hero-copy h1 {
  font-size: clamp(36px, 4.2vw, 58px);
}

.hero-text,
.brief-summary,
.brief-goal,
.level-card p,
.tutorial-card p {
  line-height: 1.6;
  color: #425363;
}

.hero-actions,
.finish-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
}

.hero-btn,
.pill-btn,
.tab-btn,
.tool-btn,
.rail-btn,
.level-card,
.command-btn,
.program-slot.filled,
.back-chip,
.run-btn,
.reset-btn {
  border: 0;
  cursor: pointer;
}

.hero-btn,
.pill-btn,
.back-chip,
.tool-btn {
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: #314454;
  font-weight: 800;
}

.hero-btn.primary,
.run-btn,
.tab-btn.active {
  background: linear-gradient(180deg, #68d16f, #43b653);
  color: #fff;
}

.hero-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.tutorial-card {
  padding: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.tutorial-card-visual {
  min-height: 180px;
  padding: 16px;
  border-radius: 18px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tutorial-card-visual.mint { background: linear-gradient(180deg, #c8efe0, #f0f5d9); }
.tutorial-card-visual.cream { background: linear-gradient(180deg, #fbf0d7, #f7f8ea); }
.tutorial-card-visual.sky { background: linear-gradient(180deg, #dbe6ff, #eef2ff); }

.mini-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mini-tile {
  display: block;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(180deg, #66a9df, #8ecdf0);
  box-shadow: inset 0 -6px 0 rgba(255, 255, 255, 0.35);
}

.mini-program {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-chip {
  min-width: 40px;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  display: grid;
  place-items: center;
  font-weight: 800;
}

.tutorial-learn {
  padding: 28px 32px;
  background: rgba(255, 255, 255, 0.82);
}

.tutorial-learn h2 {
  margin: 0 0 12px;
  font-size: 34px;
  color: #5ba9d6;
}

.tutorial-learn ul {
  margin: 0;
  padding-left: 22px;
  columns: 2;
  line-height: 1.8;
}

.select-screen {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
}

.select-header h1 {
  font-size: 30px;
}

.select-header p:last-child {
  margin: 4px 0 0;
  font-size: 14px;
}

.select-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.progress-chip {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: #edf5cf;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}

.chapter-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chapter-group {
  padding: 14px 16px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 16px 32px rgba(103, 126, 157, 0.1);
}

.chapter-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.chapter-group-header h2 {
  margin: 0;
  font-size: 20px;
}

.chapter-progress {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eef6ff;
  color: #456176;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.level-card {
  padding: 14px;
  background: rgba(255, 255, 255, 0.88);
  text-align: left;
}

.level-card strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
}

.level-card p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
}

.level-card.current {
  outline: 3px solid #8dc9ef;
}

.level-card.done {
  background: linear-gradient(180deg, #e5f6de, #ffffff);
}

.level-brief-btn {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(91, 169, 214, 0.14);
  color: #3d6078;
  font-size: 11px;
  font-weight: 800;
}

.level-card-head,
.level-card-foot,
.program-header,
.board-topbar,
.select-header,
.brief-meta,
.status-float,
.program-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.level-card-index {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #66c7dc;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 800;
}

.level-card-tag {
  color: #5e7f98;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.level-card-foot {
  margin-top: 10px;
  font-size: 13px;
}

.brief-shell {
  display: grid;
  grid-template-columns: minmax(360px, 460px) 1fr;
  gap: 24px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.88);
  position: relative;
}

.back-chip {
  position: absolute;
  top: 18px;
  left: 18px;
}

.brief-copy {
  padding: 60px 10px 10px 10px;
}

.brief-meta {
  margin: 24px 0;
  padding: 18px 20px;
  border-radius: 18px;
  background: #f7f8ea;
}

.brief-meta span {
  display: block;
  margin-bottom: 6px;
  color: #6b7c88;
  font-size: 12px;
  text-transform: uppercase;
}

.brief-tips {
  display: grid;
  gap: 14px;
}

.brief-tips article {
  padding: 16px 18px;
  border-radius: 18px;
  background: #eef6fb;
}

.brief-tips h2,
.tutorial-card h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.brief-preview {
  display: grid;
  place-items: center;
}

.editor-screen {
  min-height: calc(100vh - 104px);
}

.editor-shell {
  display: grid;
  grid-template-columns: minmax(360px, 460px) 1fr;
  gap: 20px;
}

.editor-sidebar,
.editor-preview-pane {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.editor-card {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 24px 60px rgba(103, 126, 157, 0.18);
}

.editor-card.grow {
  flex: 1;
}

.editor-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.editor-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #556675;
  font-size: 13px;
  font-weight: 700;
}

.editor-form-grid label.full-span {
  grid-column: 1 / -1;
}

.editor-form-grid input,
.editor-form-grid select {
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(94, 117, 137, 0.2);
  border-radius: 12px;
  background: #f8fbfd;
  color: #334350;
}

.editor-tool-row,
.editor-action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.editor-publish-card {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f3f7fa;
  border: 1px solid rgba(91, 113, 130, 0.16);
}

.editor-publish-card.success {
  background: #edf8ee;
  border-color: rgba(76, 176, 101, 0.28);
}

.editor-publish-card.danger {
  background: #fff2f1;
  border-color: rgba(216, 89, 89, 0.26);
}

.editor-publish-card strong {
  display: block;
  margin-bottom: 6px;
}

.editor-publish-card p {
  margin: 0;
  color: #526575;
  line-height: 1.5;
}

.editor-solution-line {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #324555;
  word-break: break-word;
}

.editor-grid-board {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-grid-hint {
  margin: 14px 0 0;
  color: #6f8190;
  font-size: 13px;
  line-height: 1.5;
}

.editor-grid-row {
  display: grid;
  gap: 8px;
}

.editor-grid-cell {
  position: relative;
  min-height: 52px;
  border-radius: 14px;
  border: 2px dashed rgba(84, 101, 119, 0.22);
  background: rgba(226, 234, 241, 0.45);
  color: #2d3f4d;
  font-weight: 800;
  user-select: none;
}

.editor-grid-cell.filled {
  border-style: solid;
  border-color: rgba(67, 77, 88, 0.54);
  background: linear-gradient(180deg, #666f79, #59616a);
  color: #fff;
}

.editor-grid-cell.target {
  background: linear-gradient(180deg, #246591, #1e4d6f);
}

.editor-grid-cell.start {
  box-shadow: inset 0 0 0 3px #5ccf7a;
}

.editor-grid-cell .cell-height {
  font-size: 18px;
}

.editor-grid-cell .cell-start,
.editor-grid-cell .cell-target {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 12px;
}

.editor-preview-hint {
  color: #6f8190;
  font-size: 13px;
}

.editor-frame {
  min-height: 640px;
}

.tool-btn.selected {
  background: linear-gradient(180deg, #68d16f, #43b653);
  color: #fff;
}

.brief-preview-board {
  width: 100%;
  padding: 20px;
  border-radius: 26px;
  background: linear-gradient(180deg, #f9efdc, #fdfbf3);
}

.preview-badge {
  width: fit-content;
  margin: 0 auto 14px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff;
  color: #6d8190;
  font-weight: 800;
}

.play-shell {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) 320px;
  gap: 18px;
}

.hud-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rail-btn {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(180deg, #90d4e8, #5db4d2);
  color: #fff;
  font-size: 24px;
  font-weight: 800;
}

.rail-btn.muted {
  background: rgba(255, 255, 255, 0.86);
  color: #5f7e91;
}

.board-stage {
  position: relative;
  overflow: hidden;
  padding: 22px;
  background: linear-gradient(180deg, #eff5ec, #dff0e7 58%, #e3ebf9);
}

.board-topbar {
  margin-bottom: 14px;
}

.board-topbar-actions {
  display: flex;
  gap: 10px;
}

.run-btn,
.reset-btn {
  width: 74px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
}

.run-btn img,
.reset-btn img,
.command-btn img,
.program-slot.filled img {
  width: 28px;
  height: 28px;
}

.reset-btn {
  background: linear-gradient(180deg, #f9f9f9, #e4e6eb);
}

.scene-frame {
  position: relative;
  min-height: 560px;
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 38%),
    linear-gradient(180deg, rgba(203, 239, 221, 0.8), rgba(242, 248, 250, 0.92));
}

.preview-frame {
  min-height: 440px;
}

.three-scene-host {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.three-scene-host :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}

.editor-scene-host :deep(canvas) {
  cursor: crosshair;
  touch-action: none;
}

.scene-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(30deg, rgba(112, 154, 160, 0.12) 12%, transparent 12.5%, transparent 87%, rgba(112, 154, 160, 0.12) 87.5%, rgba(112, 154, 160, 0.12)),
    linear-gradient(150deg, rgba(112, 154, 160, 0.12) 12%, transparent 12.5%, transparent 87%, rgba(112, 154, 160, 0.12) 87.5%, rgba(112, 154, 160, 0.12));
  background-size: 58px 102px;
}

.status-float {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 4;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
}

.status-float strong {
  font-size: 22px;
}

.status-float em {
  font-style: normal;
  font-weight: 700;
  color: #657686;
}

.status-float em.success {
  color: #42a351;
}

.status-float em.danger {
  color: #d6605c;
}

.scene-viewport {
  position: absolute;
  left: 50%;
  top: 58%;
  transform-origin: center center;
}

.preview-viewport {
  top: 63%;
}

.play-viewport {
  top: 59%;
}

.iso-scene {
  position: relative;
  transform: translate(-50%, -50%);
}

.platform-stack,
.platform-block,
.block-top,
.block-left,
.block-right {
  position: absolute;
}

.platform-stack {
  width: 96px;
  height: 96px;
}

.stack-shadow {
  position: absolute;
  left: 18px;
  top: var(--shadow-top);
  width: 64px;
  height: 20px;
  border-radius: 50%;
  background: rgba(45, 56, 69, 0.16);
  filter: blur(8px);
}

.platform-block {
  width: 96px;
  height: 96px;
}

.block-top {
  left: 0;
  top: 0;
  width: 96px;
  height: 48px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: #565e68;
  border: 3px solid #2e3438;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.block-top::after {
  content: '';
  position: absolute;
  inset: 7px 9px 11px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.block-left {
  left: 0;
  top: 24px;
  width: 48px;
  height: 22px;
  clip-path: polygon(100% 0, 100% 100%, 0 78%, 0 24%);
  background: #646a71;
  border-left: 3px solid #2e3438;
  border-bottom: 3px solid #2e3438;
}

.block-right {
  right: 0;
  top: 24px;
  width: 48px;
  height: 22px;
  clip-path: polygon(0 0, 100% 24%, 100% 78%, 0 100%);
  background: #646a71;
  border-right: 3px solid #2e3438;
  border-bottom: 3px solid #2e3438;
}

.block-top.target {
  background: #1e4d6f;
}

.block-top.start:not(.target):not(.lit) {
  background: #1e4d6f;
}

.block-top.lit {
  background: #fffd00;
}

.target-ring,
.target-core {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
}

.target-ring {
  width: 28px;
  height: 28px;
  border: 5px solid rgba(232, 245, 255, 0.92);
}

.target-core {
  width: 16px;
  height: 16px;
  background: rgba(255, 252, 165, 0.96);
  box-shadow: 0 0 18px rgba(255, 235, 59, 0.9);
  animation: lampPulse 1.2s ease-in-out infinite;
}

.robot-layer {
  position: absolute;
  z-index: 5;
  width: 42px;
  height: 62px;
  margin-left: -21px;
  margin-top: -52px;
  transition: left 260ms cubic-bezier(.22, 1, .36, 1), top 260ms cubic-bezier(.22, 1, .36, 1), transform 220ms ease;
}

.robot-body {
  position: relative;
  width: 38px;
  height: 56px;
  margin-left: 2px;
  border-radius: 18px 18px 20px 20px;
  background: #38ff00;
  border: 3px solid #2e3438;
  box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.16), 0 8px 16px rgba(88, 90, 121, 0.12);
  animation: robotBob 1.25s ease-in-out infinite;
}

.robot-eye,
.robot-antenna,
.robot-shadow,
.robot-foot {
  position: absolute;
}

.robot-eye {
  top: 18px;
  width: 6px;
  height: 10px;
  border-radius: 999px;
  background: #171c22;
}

.robot-eye.left { left: 10px; }
.robot-eye.right { right: 11px; }

.robot-antenna {
  left: 50%;
  top: -13px;
  width: 4px;
  height: 16px;
  background: #7b8292;
  transform: translateX(-50%);
}

.robot-antenna::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -6px;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 999px;
  background: #d8a8ff;
  border: 2px solid #7b8292;
}

.robot-shadow {
  left: 50%;
  bottom: -14px;
  width: 34px;
  height: 12px;
  margin-left: -17px;
  border-radius: 50%;
  background: rgba(65, 79, 95, 0.18);
  filter: blur(4px);
}

.robot-foot {
  bottom: -10px;
  width: 7px;
  height: 16px;
  border-radius: 999px;
  background: #727790;
}

.robot-foot.left { left: 10px; }
.robot-foot.right { right: 10px; }

.robot-layer.dir-right { transform: rotate(90deg); }
.robot-layer.dir-backward { transform: rotate(180deg); }
.robot-layer.dir-left { transform: rotate(-90deg); }

.command-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
}

.command-btn {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: linear-gradient(180deg, #eef2f6, #c5ced7);
  box-shadow: inset 0 0 0 3px #58646f, 0 8px 16px rgba(79, 94, 111, 0.14);
  display: grid;
  place-items: center;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.command-btn:hover:not(:disabled),
.program-slot.filled:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 3px #58646f, 0 12px 18px rgba(79, 94, 111, 0.18);
}

.command-btn:disabled,
.run-btn:disabled,
.reset-btn:disabled,
.tool-btn:disabled,
.tab-btn:disabled,
.program-slot.filled:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.speed-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-weight: 700;
}

.speed-box input {
  width: 110px;
  accent-color: #60c883;
}

.program-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.program-panel {
  padding: 16px;
}

.program-panel.main-tone {
  background: linear-gradient(180deg, #f9eea3, #f2e37d);
}

.program-panel.proc-tone {
  background: linear-gradient(180deg, #d5d7dd, #bcc2cb);
}

.program-panel.disabled {
  opacity: 0.55;
}

.program-panel.active {
  box-shadow: 0 24px 60px rgba(103, 126, 157, 0.18), inset 0 0 0 3px rgba(88, 200, 124, 0.45);
}

.program-header span {
  font-weight: 900;
  letter-spacing: 0.08em;
}

.tab-btn {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 800;
}

.program-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.program-grid.big {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.program-slot {
  min-height: 62px;
  border-radius: 14px;
  border: 2px dashed rgba(58, 71, 84, 0.3);
  background: rgba(255, 255, 255, 0.26);
}

.program-slot.filled {
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.86);
  border-style: solid;
  box-shadow: inset 0 0 0 3px #58646f;
}

.program-slot.filled.active {
  outline: 3px solid #4ec96b;
}

.program-tools {
  padding: 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.84);
  flex-wrap: wrap;
}

.tool-btn {
  flex: 1 1 44%;
}

.finish-panel {
  position: absolute;
  inset: 0;
  z-index: 7;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
}

.finish-card {
  width: min(520px, calc(100% - 40px));
  padding: 30px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  text-align: center;
  box-shadow: 0 24px 80px rgba(86, 118, 145, 0.26);
}

.finish-card h2 {
  margin: 0;
  font-size: 34px;
}

@keyframes robotBob {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}

@keyframes lampPulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.92;
  }

  50% {
    transform: translate(-50%, -50%) scale(1.08);
    opacity: 1;
  }
}

@media (max-width: 1180px) {
  .tutorial-hero,
  .brief-shell,
  .play-shell,
  .editor-shell {
    grid-template-columns: 1fr;
  }

  .hud-rail {
    flex-direction: row;
  }

  .level-grid,
  .hero-gallery {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  }
}

@media (max-width: 760px) {
  .lightbot-page {
    padding: 8px;
  }

  .hero-copy,
  .select-header,
  .brief-shell,
  .board-stage,
  .program-panel,
  .program-tools,
  .tutorial-learn {
    border-radius: 18px;
  }

  .hero-gallery,
  .level-grid,
  .program-grid,
  .program-grid.big,
  .editor-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chapter-group {
    padding: 12px;
  }

  .level-card {
    padding: 12px;
  }

  .editor-form-grid label.full-span {
    grid-column: auto;
  }

  .select-header,
  .board-topbar,
  .status-float,
  .brief-meta,
  .program-tools,
  .editor-tool-row,
  .editor-action-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .scene-frame {
    min-height: 420px;
  }

  .tutorial-learn ul {
    columns: 1;
  }

  .speed-box {
    width: 100%;
    margin-left: 0;
  }
}
</style>