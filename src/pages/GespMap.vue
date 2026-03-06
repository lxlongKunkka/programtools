<template>
  <div class="gesp-map-page">
    <div class="gesp-map-header">
      <h2>GESP 知识图谱</h2>
      <p>点击节点查看相关题目 · 箭头表示前置知识依赖</p>
      <div class="legend">
        <span v-for="(color, level) in LEVEL_COLORS" :key="level" class="legend-item">
          <span class="legend-dot" :style="{ background: color.bg, border: `2px solid ${color.border}` }"></span>
          {{ level }}
        </span>
      </div>
    </div>

    <div class="gesp-map-scroll">
      <div class="gesp-map-wrap" ref="wrapRef">
        <!-- SVG edges layer -->
        <svg class="edges-svg" ref="svgRef" :width="svgSize.w" :height="svgSize.h">
          <defs>
            <marker id="arr" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#bbb" />
            </marker>
          </defs>
          <path
            v-for="(e, i) in renderedEdges"
            :key="i"
            :d="e.d"
            :class="['edge-path', e.backward ? 'edge-back' : '']"
            marker-end="url(#arr)"
          />
        </svg>

        <!-- Columns -->
        <div class="gesp-columns" ref="columnsRef">
          <div v-for="sg in subgraphs" :key="sg.id" class="gesp-column">
            <div class="column-title" :style="{ background: LEVEL_COLORS[sg.id]?.bg || '#eee', borderColor: LEVEL_COLORS[sg.id]?.border || '#ccc' }">
              {{ sg.shortTitle }}
            </div>
            <div
              v-for="nodeId in sg.nodeIds"
              :key="nodeId"
              class="gesp-node"
              :style="{
                background: LEVEL_COLORS[sg.id]?.bg,
                borderColor: LEVEL_COLORS[sg.id]?.border,
                color: LEVEL_COLORS[sg.id]?.text
              }"
              :ref="el => { if (el) nodeRefs[nodeId] = el }"
              @click="onNodeClick(nodeId, sg.id)"
            >
              {{ nodes[nodeId]?.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'
import mmdRaw from '../../GESP_TAGS.mmd?raw'

const router = useRouter()
const wrapRef = ref(null)
const svgRef = ref(null)
const columnsRef = ref(null)
const nodeRefs = reactive({})
const renderedEdges = ref([])
const svgSize = ref({ w: 0, h: 0 })

// ── Level color scheme ──────────────────────────────────────────────
const LEVEL_COLORS = {
  g1:  { bg: '#e6f4ff', border: '#91caff', text: '#003a8c' },
  g3:  { bg: '#f6ffed', border: '#95de64', text: '#135200' },
  g5:  { bg: '#fff7e6', border: '#ffc069', text: '#610b00' },
  g6:  { bg: '#f9f0ff', border: '#d3adf7', text: '#391085' },
  g7:  { bg: '#fff0f6', border: '#ffadd2', text: '#780650' },
  g8:  { bg: '#e6fffb', border: '#5cdbd3', text: '#00474f' },
  g9:  { bg: '#f0f5ff', border: '#adc6ff', text: '#10239e' },
  g10: { bg: '#f9f0ff', border: '#b37feb', text: '#22075e' },
}

// ── Parse MMD ──────────────────────────────────────────────────────
function parseMmd(raw) {
  const lines = raw.split('\n')
  const subgraphs = []
  const nodes = {}
  const edges = []
  let currentSg = null

  for (const line of lines) {
    const t = line.trim()

    // subgraph g1["gesp1-2 基础语法"]
    const sgM = t.match(/^subgraph\s+(\w+)\["([^"]+)"\]/)
    if (sgM) {
      const fullTitle = sgM[2]
      const shortTitle = fullTitle.replace(/^gesp[\d-]+\s*/, '')
      currentSg = { id: sgM[1], title: fullTitle, shortTitle, nodeIds: [] }
      subgraphs.push(currentSg)
      continue
    }
    if (t === 'end') { currentSg = null; continue }

    // node: A1[顺序/条件/循环结构]
    const nodeM = t.match(/^([A-H]\d+)\[([^\]]+)\]/)
    if (nodeM && currentSg) {
      nodes[nodeM[1]] = { id: nodeM[1], label: nodeM[2], sgId: currentSg.id }
      currentSg.nodeIds.push(nodeM[1])
      continue
    }

    // edges (skip comments)
    if (t.includes('-->') && !t.startsWith('%')) {
      // may have multiple --> in chain: H1 --> H2 --> H3
      const chain = t.split('-->')
      for (let i = 0; i < chain.length - 1; i++) {
        const srcs = chain[i].trim().split('&').map(s => s.match(/([A-H]\d+)/)?.[1]).filter(Boolean)
        const tgts = chain[i + 1].trim().split('&').map(s => s.match(/([A-H]\d+)/)?.[1]).filter(Boolean)
        for (const s of srcs) for (const t2 of tgts) edges.push({ from: s, to: t2 })
      }
    }
  }

  // de-duplicate edges
  const seen = new Set()
  const uniqueEdges = edges.filter(e => {
    const k = `${e.from}->${e.to}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })

  return { subgraphs, nodes, edges: uniqueEdges }
}

const { subgraphs, nodes, edges } = parseMmd(mmdRaw)

// ── Compute SVG edges ──────────────────────────────────────────────
function computeEdges() {
  const wrap = wrapRef.value
  if (!wrap) return
  const wRect = wrap.getBoundingClientRect()
  svgSize.value = { w: wrap.scrollWidth, h: wrap.scrollHeight }

  const rendered = []
  for (const e of edges) {
    const fromEl = nodeRefs[e.from]
    const toEl = nodeRefs[e.to]
    if (!fromEl || !toEl) continue

    const fR = fromEl.getBoundingClientRect()
    const tR = toEl.getBoundingClientRect()

    const x1 = fR.right - wRect.left + wrap.scrollLeft
    const y1 = fR.top + fR.height / 2 - wRect.top + wrap.scrollTop
    const x2 = tR.left - wRect.left + wrap.scrollLeft - 6 // gap before arrowhead
    const y2 = tR.top + tR.height / 2 - wRect.top + wrap.scrollTop

    const backward = x2 < x1
    const dx = Math.abs(x2 - x1)
    const cx1 = x1 + (backward ? -dx * 0.5 : dx * 0.45)
    const cy1 = y1
    const cx2 = x2 - (backward ? -dx * 0.5 : dx * 0.45)
    const cy2 = y2

    rendered.push({ d: `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`, backward })
  }
  renderedEdges.value = rendered
}

// ── Node click → search by tag ─────────────────────────────────────
function onNodeClick(nodeId, sgId) {
  const node = nodes[nodeId]
  if (!node) return
  // 跳转到课程搜索页，按知识点 tag 筛选
  router.push({ path: '/course', query: { tag: node.label } })
}

onMounted(async () => {
  await nextTick()
  // Wait for layout to stabilize
  setTimeout(computeEdges, 100)

  // Recompute on resize
  const ro = new ResizeObserver(() => computeEdges())
  if (wrapRef.value) ro.observe(wrapRef.value)
})
</script>

<style scoped>
.gesp-map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.gesp-map-header {
  padding: 16px 24px 8px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
  flex-shrink: 0;
}

.gesp-map-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
  color: #1a1a1a;
}

.gesp-map-header p {
  margin: 0 0 8px;
  font-size: 13px;
  color: #888;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #555;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

/* Scrollable area */
.gesp-map-scroll {
  flex: 1;
  overflow: auto;
}

.gesp-map-wrap {
  position: relative;
  min-width: max-content;
  min-height: 100%;
  padding: 24px 16px 80px;
}

/* SVG edge layer */
.edges-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: visible;
}

.edge-path {
  fill: none;
  stroke: #c8d6e5;
  stroke-width: 1.4;
  stroke-dasharray: 5 3;
}

.edge-back {
  stroke: #f0c0c0;
  stroke-dasharray: 3 3;
}

/* Columns layout */
.gesp-columns {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.gesp-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 130px;
  flex-shrink: 0;
}

.column-title {
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1.5px solid;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gesp-node {
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 16px;
  border: 1.5px solid;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.15s ease;
  user-select: none;
  line-height: 1.4;
}

.gesp-node:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  filter: brightness(0.95);
}

.gesp-node:active {
  transform: translateY(0);
}
</style>
