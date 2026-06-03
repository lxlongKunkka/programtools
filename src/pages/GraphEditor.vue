<template>
  <div class="graph-editor-page">
    <!-- Header -->
    <div class="editor-header">
      <h1>图编辑器</h1>
      <div class="header-controls">
        <label class="switch-label">
          <input type="checkbox" v-model="isDirected" @change="toggleDirection" />
          <span>有向图</span>
        </label>
        <label class="switch-label">
          <input type="checkbox" v-model="showWeights" @change="redrawNetwork" />
          <span>显示权重</span>
        </label>
        <select v-model="layoutType" @change="applyLayout" class="layout-select">
          <option value="default">默认布局</option>
          <option value="hierarchical">层次布局</option>
          <option value="circular">环形布局</option>
        </select>
      </div>
    </div>

    <!-- Main Content -->
    <div class="editor-content">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="section">
          <h3>节点操作</h3>
          <button @click="addNode" class="btn-primary">➕ 添加节点</button>
          <button @click="deleteSelected" class="btn-danger">🗑️ 删除选中</button>
          <button @click="clearGraph" class="btn-secondary">🧹 清空图</button>
        </div>

        <div class="section">
          <h3>边操作</h3>
          <div class="edge-controls">
            <label>起点:</label>
            <input v-model.number="edgeFrom" type="number" min="1" placeholder="节点ID" />
            <label>终点:</label>
            <input v-model.number="edgeTo" type="number" min="1" placeholder="节点ID" />
            <label v-if="showWeights">权重:</label>
            <input v-if="showWeights" v-model.number="edgeWeight" type="number" placeholder="权重" />
            <button @click="addEdge" class="btn-primary">添加边</button>
          </div>
        </div>

        <div class="section">
          <h3>批量导入</h3>
          <textarea 
            v-model="batchInput" 
            placeholder="输入格式：
节点数 边数
u1 v1 [w1]
u2 v2 [w2]
...

例如：
5 6
1 2 3
2 3 5
..."
            rows="8"
          ></textarea>
          <button @click="importBatch" class="btn-primary">导入</button>
        </div>

        <div class="section">
          <h3>导出</h3>
          <button @click="exportEdgeList" class="btn-export">📋 边列表</button>
          <button @click="exportAdjList" class="btn-export">📋 邻接表</button>
          <button @click="exportAdjMatrix" class="btn-export">📋 邻接矩阵</button>
          <button @click="exportJSON" class="btn-export">📋 JSON</button>
        </div>

        <div class="section stats">
          <h3>图信息</h3>
          <p>节点数: {{ nodeCount }}</p>
          <p>边数: {{ edgeCount }}</p>
          <p>类型: {{ isDirected ? '有向图' : '无向图' }}</p>
        </div>
      </div>

      <!-- Canvas -->
      <div class="canvas-container">
        <div ref="networkContainer" class="network-canvas"></div>
        <div class="canvas-hint">
          💡 提示：双击空白处添加节点 | 单击节点后拖动到另一节点创建边 | 右键删除元素
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <div v-if="showExportModal" class="modal-overlay" @click="showExportModal = false">
      <div class="modal-content" @click.stop>
        <h3>{{ exportTitle }}</h3>
        <textarea :value="exportData" readonly rows="20"></textarea>
        <div class="modal-actions">
          <button @click="copyToClipboard" class="btn-primary">📋 复制</button>
          <button @click="showExportModal = false" class="btn-secondary">关闭</button>
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
      layoutType: 'default',
      nodeIdCounter: 1,
      edgeFrom: null,
      edgeTo: null,
      edgeWeight: 1,
      batchInput: '',
      showExportModal: false,
      exportTitle: '',
      exportData: ''
    }
  },
  computed: {
    nodeCount() {
      return this.nodes ? this.nodes.length : 0
    },
    edgeCount() {
      return this.edges ? this.edges.length : 0
    }
  },
  mounted() {
    this.initNetwork()
  },
  beforeUnmount() {
    if (this.network) {
      this.network.destroy()
    }
  },
  methods: {
    initNetwork() {
      const container = this.$refs.networkContainer
      
      // Initialize data
      this.nodes = new DataSet([])
      this.edges = new DataSet([])

      const data = { nodes: this.nodes, edges: this.edges }
      
      const options = {
        nodes: {
          shape: 'circle',
          size: 25,
          font: { size: 16, color: '#fff', bold: true },
          color: { background: '#3b82f6', border: '#2563eb', highlight: { background: '#60a5fa', border: '#3b82f6' } }
        },
        edges: {
          width: 2,
          color: { color: '#94a3b8', highlight: '#475569' },
          smooth: { type: 'continuous', roundness: 0.2 },
          arrows: { to: { enabled: this.isDirected, scaleFactor: 0.8 } }
        },
        physics: {
          stabilization: { iterations: 200 },
          barnesHut: { gravitationalConstant: -8000, springConstant: 0.04, springLength: 150 }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200
        },
        manipulation: {
          enabled: false
        }
      }

      this.network = new Network(container, data, options)
      
      // Event handlers
      this.network.on('doubleClick', (params) => {
        if (params.nodes.length === 0) {
          this.addNodeAtPosition(params.pointer.canvas)
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

    addNode() {
      const id = this.nodeIdCounter++
      this.nodes.add({ id, label: String(id) })
      this.network.fit()
    },

    addNodeAtPosition(position) {
      const id = this.nodeIdCounter++
      this.nodes.add({ id, label: String(id), x: position.x, y: position.y })
    },

    addEdge() {
      if (!this.edgeFrom || !this.edgeTo) {
        alert('请输入起点和终点')
        return
      }
      
      const nodeIds = this.nodes.getIds()
      if (!nodeIds.includes(this.edgeFrom) || !nodeIds.includes(this.edgeTo)) {
        alert('节点不存在')
        return
      }

      const edge = {
        from: this.edgeFrom,
        to: this.edgeTo,
        label: this.showWeights ? String(this.edgeWeight) : ''
      }
      
      this.edges.add(edge)
      this.edgeFrom = null
      this.edgeTo = null
      this.edgeWeight = 1
    },

    deleteSelected() {
      const selected = this.network.getSelection()
      if (selected.nodes.length > 0) {
        this.nodes.remove(selected.nodes)
      }
      if (selected.edges.length > 0) {
        this.edges.remove(selected.edges)
      }
    },

    clearGraph() {
      if (confirm('确定要清空图吗？')) {
        this.nodes.clear()
        this.edges.clear()
        this.nodeIdCounter = 1
      }
    },

    toggleDirection() {
      this.network.setOptions({
        edges: { arrows: { to: { enabled: this.isDirected } } }
      })
    },

    redrawNetwork() {
      const currentEdges = this.edges.get()
      currentEdges.forEach(edge => {
        this.edges.update({
          id: edge.id,
          label: this.showWeights && edge.weight ? String(edge.weight) : ''
        })
      })
    },

    applyLayout() {
      const options = {}
      if (this.layoutType === 'hierarchical') {
        options.layout = {
          hierarchical: { direction: 'UD', sortMethod: 'directed', levelSeparation: 150 }
        }
      } else if (this.layoutType === 'circular') {
        const nodeIds = this.nodes.getIds()
        const radius = 200
        const angleStep = (2 * Math.PI) / nodeIds.length
        nodeIds.forEach((id, index) => {
          const angle = index * angleStep
          this.nodes.update({
            id,
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
          })
        })
        this.network.fit()
        return
      } else {
        options.layout = { randomSeed: undefined }
      }
      
      this.network.setOptions(options)
      this.network.fit()
    },

    importBatch() {
      try {
        const lines = this.batchInput.trim().split('\n').filter(l => l.trim())
        if (lines.length < 1) return

        const [n, m] = lines[0].split(/\s+/).map(Number)
        
        // Clear existing graph
        this.nodes.clear()
        this.edges.clear()
        
        // Add nodes
        for (let i = 1; i <= n; i++) {
          this.nodes.add({ id: i, label: String(i) })
        }
        this.nodeIdCounter = n + 1

        // Add edges
        for (let i = 1; i < lines.length && i <= m; i++) {
          const parts = lines[i].split(/\s+/).map(Number)
          if (parts.length >= 2) {
            const [u, v, w] = parts
            this.edges.add({
              from: u,
              to: v,
              label: this.showWeights && w !== undefined ? String(w) : '',
              weight: w || 1
            })
          }
        }

        this.network.fit()
        this.batchInput = ''
        alert(`成功导入 ${n} 个节点，${Math.min(m, lines.length - 1)} 条边`)
      } catch (e) {
        alert('导入失败：' + e.message)
      }
    },

    exportEdgeList() {
      const allEdges = this.edges.get()
      let result = `${this.nodeCount} ${this.edgeCount}\n`
      allEdges.forEach(edge => {
        result += `${edge.from} ${edge.to}`
        if (edge.weight !== undefined) {
          result += ` ${edge.weight}`
        }
        result += '\n'
      })
      this.showExport('边列表格式', result)
    },

    exportAdjList() {
      const adjList = {}
      this.nodes.getIds().forEach(id => { adjList[id] = [] })
      
      this.edges.get().forEach(edge => {
        adjList[edge.from].push(edge.to)
        if (!this.isDirected) {
          adjList[edge.to].push(edge.from)
        }
      })

      let result = ''
      Object.keys(adjList).sort((a, b) => a - b).forEach(node => {
        result += `${node}: ${adjList[node].join(', ')}\n`
      })
      this.showExport('邻接表', result)
    },

    exportAdjMatrix() {
      const nodeIds = this.nodes.getIds().sort((a, b) => a - b)
      const n = nodeIds.length
      const matrix = Array(n).fill(0).map(() => Array(n).fill(0))
      const idToIndex = {}
      nodeIds.forEach((id, idx) => { idToIndex[id] = idx })

      this.edges.get().forEach(edge => {
        const i = idToIndex[edge.from]
        const j = idToIndex[edge.to]
        matrix[i][j] = edge.weight || 1
        if (!this.isDirected) {
          matrix[j][i] = edge.weight || 1
        }
      })

      let result = `${n}\n`
      matrix.forEach(row => {
        result += row.join(' ') + '\n'
      })
      this.showExport('邻接矩阵', result)
    },

    exportJSON() {
      const data = {
        directed: this.isDirected,
        nodes: this.nodes.get().map(n => ({ id: n.id, label: n.label })),
        edges: this.edges.get().map(e => ({
          from: e.from,
          to: e.to,
          weight: e.weight || 1
        }))
      }
      this.showExport('JSON 格式', JSON.stringify(data, null, 2))
    },

    showExport(title, data) {
      this.exportTitle = title
      this.exportData = data
      this.showExportModal = true
    },

    copyToClipboard() {
      navigator.clipboard.writeText(this.exportData).then(() => {
        alert('已复制到剪贴板')
      })
    }
  }
}
</script>

<style scoped>
.graph-editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.editor-header h1 {
  margin: 0;
  font-size: 24px;
  color: #1e293b;
}

.header-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
}

.switch-label input[type="checkbox"] {
  cursor: pointer;
}

.layout-select {
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.editor-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 320px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 20px;
}

.section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;
}

.section:last-child {
  border-bottom: none;
}

.section h3 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.edge-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edge-controls label {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.edge-controls input {
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
}

.edge-controls input:focus {
  outline: none;
  border-color: #3b82f6;
}

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

button {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #e2e8f0;
  color: #475569;
  margin-top: 8px;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

.btn-danger {
  background: #ef4444;
  color: white;
  margin-top: 8px;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-export {
  background: #10b981;
  color: white;
  margin-top: 8px;
}

.btn-export:hover {
  background: #059669;
}

.stats p {
  margin: 8px 0;
  font-size: 14px;
  color: #475569;
}

.canvas-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.network-canvas {
  flex: 1;
  background: #ffffff;
}

.canvas-hint {
  padding: 12px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  text-align: center;
  border-top: 1px solid #e2e8f0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #1e293b;
}

.modal-content textarea {
  flex: 1;
  margin-bottom: 16px;
  font-family: 'Courier New', monospace;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions button {
  width: auto;
  padding: 10px 20px;
}
</style>
