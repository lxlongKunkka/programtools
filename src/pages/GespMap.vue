<template>
  <div class="gesp-map-page">
    <div class="gesp-map-header">
      <h2>GESP 知识图谱</h2>
      <p>
        悬停节点查看前置/后继依赖 ·
        <span class="hint-in">■ 绿色 = 前置知识</span> ·
        <span class="hint-out">■ 橙色 = 后续应用</span> ·
        点击跳转题目
      </p>
      <div class="legend">
        <span v-for="(color, level) in LEVEL_COLORS" :key="level" class="legend-item">
          <span class="legend-dot" :style="{ background: color.bg, border: `2px solid ${color.border}` }"></span>
          {{ LEVEL_LABELS[level] || level }}
        </span>
      </div>
    </div>

    <div class="gesp-map-scroll">
      <div class="gesp-map-wrap" ref="wrapRef">
        <!-- SVG edges layer -->
        <svg class="edges-svg" :width="svgSize.w" :height="svgSize.h">
          <defs>
            <marker id="arr-default" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#c8d6e5" />
            </marker>
            <marker id="arr-in" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#52c41a" />
            </marker>
            <marker id="arr-out" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#fa8c16" />
            </marker>
          </defs>
          <path
            v-for="(e, i) in renderedEdges"
            :key="i"
            :d="e.d"
            fill="none"
            :stroke="edgeStroke(e)"
            :stroke-width="edgeWidth(e)"
            :stroke-opacity="edgeOpacity(e)"
            :stroke-dasharray="edgeDash(e)"
            :marker-end="edgeMarker(e)"
            style="transition: stroke 0.15s, stroke-width 0.15s, stroke-opacity 0.15s"
          />
        </svg>

        <!-- Columns -->
        <div class="gesp-columns" ref="columnsRef">
          <div v-for="sg in subgraphs" :key="sg.id" class="gesp-column">
            <div
              class="column-title"
              :style="{ background: LEVEL_COLORS[sg.id]?.border, color: '#fff' }"
            >
              {{ sg.shortTitle }}
            </div>

            <!-- g9/g10: grouped + collapsible -->
            <template v-if="sg.groups.length">
              <div v-for="grp in sg.groups" :key="grp.cat" class="node-group">
                <div
                  class="group-header"
                  :style="{ borderColor: LEVEL_COLORS[sg.id]?.border, color: LEVEL_COLORS[sg.id]?.border }"
                  @click="toggleGroup(sg.id, grp.cat)"
                >
                  <span class="group-toggle">{{ isCollapsed(sg.id, grp.cat) ? '▶' : '▼' }}</span>
                  {{ grp.cat }}
                  <span class="group-count">{{ grp.nodeIds.length }}</span>
                </div>
                <template v-if="!isCollapsed(sg.id, grp.cat)">
                  <div
                    v-for="nodeId in grp.nodeIds"
                    :key="nodeId"
                    class="gesp-node"
                    :class="{
                      'node-hovered':       hoveredId === nodeId,
                      'node-highlight-in':  hoveredId && hoveredAllIn.has(nodeId),
                      'node-highlight-out': hoveredId && hoveredAllOut.has(nodeId),
                      'node-dimmed':        hoveredId && hoveredId !== nodeId
                                              && !hoveredAllIn.has(nodeId)
                                              && !hoveredAllOut.has(nodeId)
                    }"
                    :style="{
                      background:   LEVEL_COLORS[sg.id]?.bg,
                      borderColor:  LEVEL_COLORS[sg.id]?.border,
                      color:        LEVEL_COLORS[sg.id]?.text
                    }"
                    :ref="el => { if (el) nodeRefs[nodeId] = el }"
                    @mouseenter="hoveredId = nodeId"
                    @mouseleave="hoveredId = null"
                    @click="onNodeClick(nodeId)"
                  >
                    {{ nodes[nodeId]?.label }}
                  </div>
                </template>
              </div>
            </template>

            <!-- g1-g8: flat list -->
            <template v-else>
              <div
                v-for="nodeId in sg.nodeIds"
                :key="nodeId"
                class="gesp-node"
                :class="{
                  'node-hovered':       hoveredId === nodeId,
                  'node-highlight-in':  hoveredId && hoveredAllIn.has(nodeId),
                  'node-highlight-out': hoveredId && hoveredAllOut.has(nodeId),
                  'node-dimmed':        hoveredId && hoveredId !== nodeId
                                          && !hoveredAllIn.has(nodeId)
                                          && !hoveredAllOut.has(nodeId)
                }"
                :style="{
                  background:   LEVEL_COLORS[sg.id]?.bg,
                  borderColor:  LEVEL_COLORS[sg.id]?.border,
                  color:        LEVEL_COLORS[sg.id]?.text
                }"
                :ref="el => { if (el) nodeRefs[nodeId] = el }"
                @mouseenter="hoveredId = nodeId"
                @mouseleave="hoveredId = null"
                @click="onNodeClick(nodeId)"
              >
                {{ nodes[nodeId]?.label }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import mmdRaw from '../../GESP_TAGS.mmd?raw'

const router = useRouter()
const wrapRef = ref(null)
const nodeRefs = reactive({})
const renderedEdges = ref([])
const svgSize = ref({ w: 0, h: 0 })
const hoveredId = ref(null)

const LEVEL_COLORS = {
  g1:  { bg: '#e6f4ff', border: '#69c0ff', text: '#0050b3' },
  g2:  { bg: '#d6e4ff', border: '#4096ff', text: '#003a8c' },
  g3:  { bg: '#f6ffed', border: '#73d13d', text: '#135200' },
  g4:  { bg: '#d9f7be', border: '#52c41a', text: '#092b00' },
  g5:  { bg: '#fff7e6', border: '#fa8c16', text: '#612500' },
  g6:  { bg: '#f9f0ff', border: '#9254de', text: '#391085' },
  g7:  { bg: '#fff0f6', border: '#eb2f96', text: '#780650' },
  g8:  { bg: '#e6fffb', border: '#13c2c2', text: '#00474f' },
  g9:  { bg: '#f0f5ff', border: '#2f54eb', text: '#10239e' },
  g10: { bg: '#f9f0ff', border: '#722ed1', text: '#22075e' },
}

const LEVEL_LABELS = {
  g1: 'gesp1', g2: 'gesp2', g3: 'gesp3', g4: 'gesp4',
  g5: 'gesp5', g6: 'gesp6', g7: 'gesp7', g8: 'gesp8',
  g9: 'gesp9', g10: 'gesp10'
}

// ── Parse MMD ─────────────────────────────────────────────────────
function parseMmd(raw) {
  const lines = raw.split('\n')
  const subgraphs = [], nodes = {}, edges = []
  let currentSg = null
  let currentCat = null
  for (const line of lines) {
    const t = line.trim()
    const sgM = t.match(/^subgraph\s+(\w+)\["([^"]+)"\]/)
    if (sgM) {
      const short = sgM[2].replace(/^gesp[\d-]+\s*/, '')
      currentSg = { id: sgM[1], shortTitle: short, nodeIds: [], groups: [] }
      currentCat = null
      subgraphs.push(currentSg); continue
    }
    if (t === 'end') { currentSg = null; currentCat = null; continue }
    const catM = t.match(/^%%\s*cat:(.+)$/)
    if (catM && currentSg) {
      currentCat = catM[1].trim()
      currentSg.groups.push({ cat: currentCat, nodeIds: [] })
      continue
    }
    const nodeM = t.match(/^([A-H]\d+)\[([^\]]+)\]/)
    if (nodeM && currentSg) {
      nodes[nodeM[1]] = { id: nodeM[1], label: nodeM[2], sgId: currentSg.id }
      currentSg.nodeIds.push(nodeM[1])
      if (currentCat && currentSg.groups.length) {
        currentSg.groups[currentSg.groups.length - 1].nodeIds.push(nodeM[1])
      }
      continue
    }
    if (t.includes('-->') && !t.startsWith('%')) {
      const chain = t.split('-->')
      for (let i = 0; i < chain.length - 1; i++) {
        const srcs = chain[i].trim().split('&').map(s => s.match(/([A-H]\d+)/)?.[1]).filter(Boolean)
        const tgts = chain[i+1].trim().split('&').map(s => s.match(/([A-H]\d+)/)?.[1]).filter(Boolean)
        for (const s of srcs) for (const tg of tgts) edges.push({ from: s, to: tg })
      }
    }
  }
  const seen = new Set()
  return { subgraphs, nodes, edges: edges.filter(e => {
    const k = `${e.from}->${e.to}`; if (seen.has(k)) return false; seen.add(k); return true
  })}
}

const { subgraphs, nodes, edges } = parseMmd(mmdRaw)

// ── Collapsed state for category groups (g9/g10) ─────────────────
// key: `${sgId}::${cat}`, true = collapsed
const collapsedGroups = reactive({})
for (const sg of subgraphs) {
  for (const grp of sg.groups) {
    collapsedGroups[`${sg.id}::${grp.cat}`] = true  // default collapsed
  }
}
function toggleGroup(sgId, cat) {
  const k = `${sgId}::${cat}`
  collapsedGroups[k] = !collapsedGroups[k]
  nextTick(() => computeEdges())
}
function isCollapsed(sgId, cat) {
  return collapsedGroups[`${sgId}::${cat}`]
}

// ── Adjacency maps ────────────────────────────────────────────────
const inNeighbors = {}
const outNeighbors = {}
for (const e of edges) {
  if (!inNeighbors[e.to])    inNeighbors[e.to]    = new Set()
  if (!outNeighbors[e.from]) outNeighbors[e.from] = new Set()
  inNeighbors[e.to].add(e.from)
  outNeighbors[e.from].add(e.to)
}

// BFS 传递闭包
function bfsAll(startId, neighborFn) {
  const result = new Set()
  const queue = [startId]
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of (neighborFn(cur) || [])) {
      if (!result.has(nb)) { result.add(nb); queue.push(nb) }
    }
  }
  return result
}

// 当前悬停节点的全量祖先/后代集合（缓存避免每次重算）
const hoveredAllIn  = ref(new Set())
const hoveredAllOut = ref(new Set())

watch(() => hoveredId.value, (id) => {
  if (!id) { hoveredAllIn.value = new Set(); hoveredAllOut.value = new Set(); return }
  hoveredAllIn.value  = bfsAll(id, n => inNeighbors[n])
  hoveredAllOut.value = bfsAll(id, n => outNeighbors[n])
})

// ── Edge visual state helpers ─────────────────────────────────────
function edgeState(e) {
  if (!hoveredId.value) return 'default'
  const id     = hoveredId.value
  const allIn  = hoveredAllIn.value
  const allOut = hoveredAllOut.value
  // from 是祖先，to 也是祖先或就是悬停节点 → 祠绿路径
  if (allIn.has(e.from) && (allIn.has(e.to)  || e.to   === id)) return 'in'
  // to 是后代，from 也是后代或就是悬停节点 → 橙色路径
  if (allOut.has(e.to)  && (allOut.has(e.from) || e.from === id)) return 'out'
  return 'dim'
}
function edgeStroke(e) {
  const s = edgeState(e)
  if (s === 'in')  return '#52c41a'
  if (s === 'out') return '#fa8c16'
  return '#c8d6e5'
}
function edgeWidth(e) {
  return (edgeState(e) === 'in' || edgeState(e) === 'out') ? 2.5 : 1
}
function edgeOpacity(e) {
  const s = edgeState(e)
  if (s === 'dim')     return 0.06
  if (s === 'default') return 0.35
  return 1
}
function edgeDash(e) {
  return edgeState(e) === 'default' ? '4 3' : 'none'
}
function edgeMarker(e) {
  const s = edgeState(e)
  if (s === 'in')  return 'url(#arr-in)'
  if (s === 'out') return 'url(#arr-out)'
  return 'url(#arr-default)'
}

// ── Compute edge paths ────────────────────────────────────────────
function computeEdges() {
  const wrap = wrapRef.value
  if (!wrap) return
  const wRect = wrap.getBoundingClientRect()
  svgSize.value = { w: wrap.scrollWidth, h: wrap.scrollHeight }

  const rendered = []
  for (const e of edges) {
    const fromEl = nodeRefs[e.from]
    const toEl   = nodeRefs[e.to]
    if (!fromEl || !toEl) continue

    const fR = fromEl.getBoundingClientRect()
    const tR = toEl.getBoundingClientRect()

    const x1 = fR.right  - wRect.left + wrap.scrollLeft
    const y1 = (fR.top + fR.bottom) / 2 - wRect.top + wrap.scrollTop
    const x2 = tR.left   - wRect.left + wrap.scrollLeft - 7
    const y2 = (tR.top + tR.bottom) / 2 - wRect.top + wrap.scrollTop

    const dx = x2 - x1
    const cx1 = x1 + dx * 0.55
    const cx2 = x2 - dx * 0.55

    rendered.push({ from: e.from, to: e.to, d: `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}` })
  }
  renderedEdges.value = rendered
}

function onNodeClick(nodeId) {
  const node = nodes[nodeId]
  if (node) router.push({ path: '/course', query: { tag: node.label } })
}

onMounted(async () => {
  await nextTick()
  setTimeout(computeEdges, 120)
  const ro = new ResizeObserver(computeEdges)
  if (wrapRef.value) ro.observe(wrapRef.value)
})
</script>

<style scoped>
.gesp-map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f9fc;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.gesp-map-header {
  padding: 14px 24px 10px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
  flex-shrink: 0;
}
.gesp-map-header h2 { margin: 0 0 4px; font-size: 18px; color: #1a1a1a; }
.gesp-map-header p  { margin: 0 0 8px; font-size: 12px; color: #888; }

.hint-in  { color: #52c41a; font-weight: 600; }
.hint-out { color: #fa8c16; font-weight: 600; }

.legend { display: flex; flex-wrap: wrap; gap: 8px; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #555; }
.legend-dot  { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

/* ── scroll ── */
.gesp-map-scroll { flex: 1; overflow: auto; background: #f7f9fc; }

.gesp-map-wrap {
  position: relative;
  min-width: max-content;
  padding: 16px 20px 60px;
}

/* ── svg ── */
.edges-svg {
  position: absolute;
  top: 0; left: 0;
  pointer-events: none;
  overflow: visible;
}

/* ── columns ── */
.gesp-columns {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: clamp(14px, 2vw, 48px);
  position: relative;
  z-index: 1;
}

.gesp-column {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.4vw, 8px);
  width: clamp(80px, 7.5vw, 148px);
  flex-shrink: 0;
}

.column-title {
  font-size: clamp(10px, 0.85vw, 13px);
  font-weight: 700;
  text-align: center;
  padding: clamp(4px, 0.4vw, 6px) 8px;
  border-radius: 8px;
  margin-bottom: 6px;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* ── nodes ── */
.gesp-node {
  font-size: clamp(10px, 0.85vw, 13px);
  padding: clamp(3px, 0.3vw, 6px) clamp(4px, 0.5vw, 10px);
  border-radius: 16px;
  border: 1.5px solid;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform 0.12s, box-shadow 0.12s, opacity 0.12s, filter 0.12s;
  user-select: none;
  line-height: 1.5;
}

.gesp-node:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.node-hovered {
  transform: scale(1.06) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22) !important;
  z-index: 10;
  position: relative;
}

.node-highlight-in {
  outline: 2.5px solid #52c41a;
  outline-offset: 2px;
  z-index: 8;
  position: relative;
}

.node-highlight-out {
  outline: 2.5px solid #fa8c16;
  outline-offset: 2px;
  z-index: 8;
  position: relative;
}

.node-dimmed {
  opacity: 0.22;
  filter: grayscale(50%);
}

/* ── category groups (g9/g10) ── */
.node-group {
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.3vw, 6px);
  margin-bottom: 4px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: clamp(9px, 0.78vw, 11px);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1.5px solid;
  cursor: pointer;
  background: rgba(255,255,255,0.6);
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.12s;
}
.group-header:hover {
  background: rgba(255,255,255,0.9);
}
.group-toggle {
  font-size: 8px;
  flex-shrink: 0;
}
.group-count {
  margin-left: auto;
  font-size: 9px;
  opacity: 0.65;
  font-weight: 400;
  flex-shrink: 0;
}
</style>
