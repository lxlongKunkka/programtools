<template>
  <div class="graph-editor-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="tb-group">
        <button :class="['tb-btn', !isDirected && 'active']" @click="setDirected(false)">无向图</button>
        <button :class="['tb-btn', isDirected && 'active']" @click="setDirected(true)">有向图</button>
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <button :class="['tb-btn', indexBase===0 && 'active']" @click="setIndexBase(0)">0起点</button>
        <button :class="['tb-btn', indexBase===1 && 'active']" @click="setIndexBase(1)">1起点</button>
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <button :class="['tb-btn', showWeights && 'active']" @click="toggleWeights">权重</button>
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <button :class="['tb-btn', mode==='force' && 'active']" @click="setMode('force')">Force</button>
        <button :class="['tb-btn', mode==='draw' && 'active']" @click="setMode('draw')">绘制</button>
        <button :class="['tb-btn', mode==='delete' && 'active']" @click="setMode('delete')">删除</button>
      </div>
    </div>

    <!-- Body -->
    <div class="editor-body">
      <!-- Left: data panel -->
      <div class="left-panel">
        <div class="field-row">
          <span class="field-label">节点数:</span>
          <input
            type="number"
            v-model.number="nodeCountInput"
            min="0" max="300"
            class="node-count-input"
            @change="applyNodeCount"
          />
        </div>
        <div class="field-label data-label">图数据:</div>
        <textarea
          class="graph-data-area"
          v-model="graphDataText"
          @keydown="onDataKeyDown"
          spellcheck="false"
          :placeholder="'每行一条边\n格式: u v [w]'"
        ></textarea>
      </div>

      <!-- Center: canvas -->
      <div class="canvas-wrap" ref="canvasWrap">
        <div ref="networkContainer" class="network-canvas"></div>
      </div>

      <!-- Right: mode info + export -->
      <div class="right-panel">
        <div class="mode-card">
          <div class="mode-title">{{ modeTitle }}</div>
          <div class="mode-desc" v-html="modeDescHtml"></div>
        </div>
        <div class="stats-row">
          <span>{{ nodeCount }} 节点</span>
          <span>{{ edgeCount }} 边</span>
        </div>
        <div class="export-group">
          <button @click="copyEdgeList" class="exp-btn">复制边列表</button>
          <button @click="copyAdjList" class="exp-btn">复制邻接表</button>
          <button @click="copyAdjMatrix" class="exp-btn">复制邻接矩阵</button>
          <button @click="fitGraph" class="exp-btn">居中视图</button>
          <button @click="clearGraph" class="exp-btn danger">清空图</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'

export default {
  name: 'GraphEditor',
  data() {
    return {
      network: null,
      nodes: null,
      edges: null,
      isDirected: false,
      showWeights: false,
      indexBase: 1,
      mode: 'force',
      nodeCountInput: 0,
      graphDataText: '',
      edgeIdCounter: 1,
      nodeIdCounter: 1,
      drawFrom: null,
      _parsing: false,
    }
  },
  computed: {
    nodeCount() {
      return this.nodes ? this.nodes.length : 0
    },
    edgeCount() {
      return this.edges ? this.edges.length : 0
    },
    modeTitle() {
      return { force: 'Force 模式', draw: '绘制模式', delete: '删除模式' }[this.mode]
    },
    modeDescHtml() {
      if (this.mode === 'force') {
        return '物理引擎驱动，节点自动排布。<br><br>交互方式：<ul><li>双击空白处：添加节点</li><li>拖动节点：移动（松开后固定）</li><li>单击固定节点：解除固定</li></ul>'
      } else if (this.mode === 'draw') {
        return '手动绘制模式，物理引擎关闭。<br><br>交互方式：<ul><li>双击空白处：添加节点</li><li>单击节点 A → 单击节点 B：添加边</li><li>拖动节点：移动</li></ul>'
      } else {
        return '单击节点或边即可删除。<br><br>其他操作仍然有效：<ul><li>双击空白处：添加节点</li><li>拖动节点：移动</li></ul>'
      }
    }
  },
  mounted() {
    this.initNetwork()
    this.$nextTick(() => this.resizeCanvas())
    window.addEventListener('resize', this.resizeCanvas)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvas)
    if (this.network) this.network.destroy()
  },
  methods: {
    onDataKeyDown(e) {
      if (e.key === 'Enter') {
        // 让换行先写入，再解析
        this.$nextTick(() => this.parseGraphData(false))
      }
    },
    initNetwork() {
      const container = this.$refs.networkContainer
      this.nodes = new DataSet([])
      this.edges = new DataSet([])

      const sync = () => {
        this.nodeCountInput = this.nodes.length
        this.updateGraphDataText()
      }
      this.nodes.on('add', sync)
      this.nodes.on('remove', sync)
      this.edges.on('add', sync)
      this.edges.on('remove', sync)

      const options = this.buildOptions()
      this.network = new Network(container, { nodes: this.nodes, edges: this.edges }, options)

      this.network.on('doubleClick', (params) => {
        if (params.nodes.length === 0 && params.edges.length === 0) {
          const id = this.nodeIdCounter++
          const label = String(id - 1 + this.indexBase)
          this.nodes.add({ id, label, x: params.pointer.canvas.x, y: params.pointer.canvas.y })
        }
      })

      this.network.on('click', (params) => {
        if (this.mode === 'delete') {
          if (params.nodes.length > 0) {
            this.nodes.remove(params.nodes[0])
          } else if (params.edges.length > 0) {
            this.edges.remove(params.edges[0])
          }
          return
        }
        if (this.mode === 'draw') {
          if (params.nodes.length > 0) {
            const clicked = params.nodes[0]
            if (this.drawFrom === null) {
              this.drawFrom = clicked
              this.network.selectNodes([clicked])
            } else {
              if (this.drawFrom !== clicked) {
                this.edges.add({
                  id: this.edgeIdCounter++,
                  from: this.drawFrom,
                  to: clicked,
                  label: '',
                  weight: 1
                })
              }
              this.drawFrom = null
              this.network.unselectAll()
            }
          } else {
            this.drawFrom = null
            this.network.unselectAll()
          }
        }
      })

      this.network.on('oncontext', (params) => {
        params.event.preventDefault()
        if (params.nodes.length > 0) {
          this.nodes.remove(params.nodes[0])
        } else if (params.edges.length > 0) {
          this.edges.remove(params.edges[0])
        }
      })
    },

    buildOptions() {
      return {
        nodes: {
          shape: 'circle',
          size: 22,
          font: { size: 15, color: '#222' },
          color: {
            background: '#fff',
            border: '#333',
            highlight: { background: '#dbeafe', border: '#2563eb' }
          },
          borderWidth: 2,
          borderWidthSelected: 3,
        },
        edges: {
          width: 2,
          color: { color: '#555', highlight: '#1a73e8' },
          smooth: { type: 'continuous', roundness: 0.15 },
          arrows: { to: { enabled: this.isDirected, scaleFactor: 0.8 } },
          font: { size: 13, color: '#333', strokeWidth: 2, strokeColor: '#fff' },
          selectionWidth: 3,
        },
        physics: {
          enabled: true,
          stabilization: { iterations: 150 },
          barnesHut: { gravitationalConstant: -6000, springConstant: 0.04, springLength: 120 }
        },
        interaction: {
          hover: true,
          multiselect: false,
          selectConnectedEdges: false,
        },
        manipulation: { enabled: false }
      }
    },

    setDirected(val) {
      this.isDirected = val
      this.network.setOptions({ edges: { arrows: { to: { enabled: val } } } })
    },

    setIndexBase(base) {
      const old = this.indexBase
      this.indexBase = base
      if (old !== base) {
        const updates = this.nodes.get().map(n => ({
          id: n.id,
          label: String(n.id - 1 + base)
        }))
        this.nodes.update(updates)
        this.updateGraphDataText()
      }
    },

    toggleWeights() {
      this.showWeights = !this.showWeights
      const updates = this.edges.get().map(e => ({
        id: e.id,
        label: this.showWeights && e.weight ? String(e.weight) : ''
      }))
      this.edges.update(updates)
    },

    setMode(m) {
      this.mode = m
      this.drawFrom = null
      this.network.unselectAll()
      this.network.setOptions({ physics: { enabled: m === 'force' } })
    },

    applyNodeCount() {
      const n = Math.max(0, Math.min(300, this.nodeCountInput || 0))
      this.nodeCountInput = n
      const current = this.nodes.getIds().sort((a, b) => a - b)
      if (n > current.length) {
        for (let i = current.length + 1; i <= n; i++) {
          this.nodeIdCounter = Math.max(this.nodeIdCounter, i + 1)
          this.nodes.add({ id: i, label: String(i - 1 + this.indexBase) })
        }
      } else if (n < current.length) {
        const toRemove = current.slice(n)
        this.nodes.remove(toRemove)
        this.edges.remove(
          this.edges.get().filter(e => toRemove.includes(e.from) || toRemove.includes(e.to)).map(e => e.id)
        )
      }
      this.network.fit()
    },

    updateGraphDataText() {
      if (this._parsing) return   // 解析期间不覆盖 textarea
      const edges = this.edges.get()
      if (edges.length === 0) {
        this.graphDataText = ''
        return
      }
      const base = this.indexBase
      this.graphDataText = edges.map(e => {
        const u = e.from - 1 + base
        const v = e.to - 1 + base
        return this.showWeights && e.weight ? `${u} ${v} ${e.weight}` : `${u} ${v}`
      }).join('\n')
    },

    parseGraphData(fit = true) {
      this._parsing = true
      const lines = this.graphDataText.trim().split('\n').filter(l => l.trim())
      this.edges.clear()
      this.edgeIdCounter = 1
      const base = this.indexBase
      // collect required node ids first
      const requiredNodes = new Set()
      const validLines = []
      for (const line of lines) {
        const parts = line.trim().split(/\s+/).map(Number)
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          requiredNodes.add(parts[0] - base + 1)
          requiredNodes.add(parts[1] - base + 1)
          validLines.push(parts)
        }
      }
      // remove nodes not referenced
      const existingIds = new Set(this.nodes.getIds())
      for (const id of existingIds) {
        if (!requiredNodes.has(id)) this.nodes.remove(id)
      }
      // add missing nodes
      for (const id of requiredNodes) {
        if (!this.nodes.get(id)) {
          this.nodes.add({ id, label: String(id - 1 + base) })
        }
      }
      // add edges
      for (const parts of validLines) {
        const u = parts[0] - base + 1
        const v = parts[1] - base + 1
        const w = parts[2] !== undefined && !isNaN(parts[2]) ? parts[2] : 1
        this.edges.add({
          id: this.edgeIdCounter++,
          from: u, to: v,
          label: this.showWeights ? String(w) : '',
          weight: w
        })
      }
      this.nodeCountInput = this.nodes.length
      const ids = this.nodes.getIds()
      this.nodeIdCounter = ids.length > 0 ? Math.max(...ids) + 1 : 1
      this._parsing = false
      if (fit) this.network.fit()
      else this.fitIfNeeded()
    },

    fitIfNeeded() {
      if (!this.network || this.nodes.length === 0) return
      const positions = this.network.getPositions()
      const viewPos = this.network.getViewPosition()
      const scale = this.network.getScale()
      const w = this.$refs.canvasWrap?.offsetWidth || 800
      const h = this.$refs.canvasWrap?.offsetHeight || 600
      const halfW = w / 2 / scale
      const halfH = h / 2 / scale
      for (const id in positions) {
        const dx = Math.abs(positions[id].x - viewPos.x)
        const dy = Math.abs(positions[id].y - viewPos.y)
        if (dx > halfW * 0.9 || dy > halfH * 0.9) {
          this.network.fit({ animation: { duration: 250, easingFunction: 'easeInOutQuad' } })
          return
        }
      }
    },

    fitGraph() {
      this.network.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
    },

    clearGraph() {
      if (!confirm('确定清空图吗？')) return
      this.nodes.clear()
      this.edges.clear()
      this.nodeIdCounter = 1
      this.edgeIdCounter = 1
      this.nodeCountInput = 0
      this.graphDataText = ''
      this.drawFrom = null
    },

    toClipboard(text) {
      navigator.clipboard.writeText(text).then(
        () => alert('已复制到剪贴板'),
        () => prompt('请手动复制：', text)
      )
    },

    copyEdgeList() {
      const edges = this.edges.get()
      const base = this.indexBase
      const n = this.nodeCount, m = edges.length
      const lines = [`${n} ${m}`, ...edges.map(e => {
        const u = e.from - 1 + base, v = e.to - 1 + base
        return e.weight && this.showWeights ? `${u} ${v} ${e.weight}` : `${u} ${v}`
      })]
      this.toClipboard(lines.join('\n'))
    },

    copyAdjList() {
      const base = this.indexBase
      const adj = {}
      this.nodes.getIds().forEach(id => { adj[id] = [] })
      this.edges.get().forEach(e => {
        adj[e.from].push(e.to - 1 + base)
        if (!this.isDirected) adj[e.to].push(e.from - 1 + base)
      })
      const text = Object.keys(adj).sort((a, b) => a - b).map(id => {
        const label = Number(id) - 1 + base
        return `${label}: ${adj[id].join(' ')}`
      }).join('\n')
      this.toClipboard(text)
    },

    copyAdjMatrix() {
      const base = this.indexBase
      const ids = this.nodes.getIds().sort((a, b) => a - b)
      const n = ids.length
      const idx = {}
      ids.forEach((id, i) => { idx[id] = i })
      const mat = Array.from({ length: n }, () => Array(n).fill(0))
      this.edges.get().forEach(e => {
        mat[idx[e.from]][idx[e.to]] = e.weight || 1
        if (!this.isDirected) mat[idx[e.to]][idx[e.from]] = e.weight || 1
      })
      const header = ids.map(id => Number(id) - 1 + base).join(' ')
      const text = `  ${header}\n` + mat.map((row, i) => `${ids[i] - 1 + base} ${row.join(' ')}`).join('\n')
      this.toClipboard(text)
    },

    resizeCanvas() {
      const wrap = this.$refs.canvasWrap
      const container = this.$refs.networkContainer
      if (!wrap || !container) return
      container.style.width = wrap.offsetWidth + 'px'
      container.style.height = wrap.offsetHeight + 'px'
      if (this.network) this.network.redraw()
    }
  }
}
</script>

<style scoped>
.graph-editor-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ===== Toolbar ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #1e2533;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.tb-group {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.15);
}

.tb-btn {
  padding: 5px 14px;
  background: transparent;
  color: rgba(255,255,255,0.65);
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.tb-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.tb-btn.active { background: #2563eb; color: #fff; }

.tb-sep {
  width: 1px;
  background: rgba(255,255,255,0.12);
  margin: 2px 6px;
}

/* ===== Body ===== */
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ===== Left panel ===== */
.left-panel {
  width: 190px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #dde1e7;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 6px;
  overflow: hidden;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  color: #555;
  font-weight: 600;
  white-space: nowrap;
}

.data-label {
  margin-top: 4px;
}

.node-count-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #ccd0d9;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #222;
}
.node-count-input:focus { outline: none; border-color: #2563eb; }

.graph-data-area {
  flex: 1;
  min-height: 0;
  resize: none;
  border: 1px solid #ccd0d9;
  border-radius: 4px;
  padding: 6px 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #222;
  background: #fafafa;
}
.graph-data-area:focus { outline: none; border-color: #2563eb; background: #fff; }

/* ===== Canvas ===== */
.canvas-wrap {
  flex: 1;
  min-width: 0;
  position: relative;
  background: #fff;
  border-right: 1px solid #dde1e7;
  overflow: hidden;
}

.network-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ===== Right panel ===== */
.right-panel {
  width: 210px;
  flex-shrink: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 10px;
  overflow-y: auto;
}

.mode-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.mode-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.mode-desc {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
}

.mode-desc :deep(ul) {
  margin: 4px 0 0 0;
  padding-left: 18px;
}

.mode-desc :deep(li) {
  margin-bottom: 4px;
}

.stats-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
  padding: 6px 10px;
  background: #f1f5f9;
  border-radius: 6px;
}

.export-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exp-btn {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}
.exp-btn:hover { background: #e0f2fe; border-color: #38bdf8; color: #0369a1; }
.exp-btn.danger { color: #dc2626; border-color: #fca5a5; }
.exp-btn.danger:hover { background: #fee2e2; border-color: #ef4444; }

.right-panel::-webkit-scrollbar { width: 4px; }
.right-panel::-webkit-scrollbar-track { background: transparent; }
.right-panel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

@media (max-width: 768px) {
  .left-panel { width: 150px; }
  .right-panel { display: none; }
}
</style>
