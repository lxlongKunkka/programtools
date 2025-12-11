<template>
  <div class="problem-manager">
    <h2>题目管理</h2>
    
    <div class="controls">
      <div class="control-group">
        <label>选择 Domain:</label>
        <select v-model="currentDomain" @change="fetchDocuments">
          <option value="">全部</option>
          <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

      <div class="control-group">
        <label>AI模型:</label>
        <select v-model="selectedModel">
          <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>

      <div class="control-group">
        <label>每页:</label>
        <select v-model.number="limit" @change="changeLimit">
          <option :value="20">20条</option>
          <option :value="50">50条</option>
          <option :value="100">100条</option>
          <option :value="500">500条</option>
        </select>
      </div>
      
      <div class="control-group">
        <button @click="fetchDocuments" class="btn-refresh">刷新列表</button>
        <button @click="batchProcess" :disabled="processing || selectedDocs.length === 0" class="btn-batch">
          {{ processing ? `处理中 (${processedCount}/${selectedDocs.length})` : '批量处理选中 (翻译+标签+去PID)' }}
        </button>
        <button @click="stopProcessing" v-if="processing" class="btn-stop">停止</button>
      </div>
    </div>

    <div class="status-bar" v-if="statusMsg">
      {{ statusMsg }}
    </div>

    <div class="pagination" style="margin-top: 0; margin-bottom: 15px;">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>

    <div class="table-container">
      <table class="doc-table">
        <thead>
          <tr>
            <th><input type="checkbox" @change="toggleSelectAll" :checked="allSelected"></th>
            <th>ID</th>
            <th>DocID</th>
            <th>Domain</th>
            <th width="20%">标题</th>
            <th width="10%">链接</th>
            <th width="25%">内容预览</th>
            <th width="15%">标签</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(doc, index) in documents" :key="doc._id" :class="{ modified: doc._modified }">
            <td>
              <input 
                type="checkbox" 
                v-model="selectedIds" 
                :value="doc._id"
                class="checkbox-large"
                @click="handleRangeSelect($event, index)"
              >
            </td>
            <td class="id-col">{{ doc._id }}</td>
            <td>{{ doc.docId }}</td>
            <td>{{ doc.domainId }}</td>
            <td>
              <input v-model="doc.title" class="input-title" placeholder="标题">
            </td>
            <td>
              <div class="links-col">
                <a v-if="doc.domainId && doc.docId" :href="`https://acjudge.com/d/${doc.domainId}/p/${doc.docId}`" target="_blank" class="link-item">原题</a>
                <a v-if="doc.reference && doc.reference.domainId && doc.reference.pid" :href="`https://acjudge.com/d/${doc.reference.domainId}/p/${doc.reference.pid}`" target="_blank" class="link-item ref">引用</a>
              </div>
            </td>
            <td>
              <div class="content-preview" :title="doc.content">{{ doc.content ? doc.content.slice(0, 50) + '...' : '(空)' }}</div>
            </td>
            <td>
              <div class="tags-container">
                <span v-for="t in doc.tag" :key="t" class="tag-badge">{{ t }}</span>
              </div>
            </td>
            <td>
              <div class="actions">
                <button @click="processOne(doc)" :disabled="doc._processing" class="btn-small btn-process" :class="{ 'processing': doc._processing }">
                  {{ doc._processing ? '处理中...' : '智能处理' }}
                </button>
                <button v-if="doc.contentbak" @click="restoreBackup(doc)" class="btn-small btn-restore">恢复备份</button>
                <button @click="saveDoc(doc)" :disabled="!doc._modified" class="btn-small btn-save">保存</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script>
import request from '../utils/request'

export default {
  inject: ['showToastMessage'],
  data() {
    return {
      domains: [],
      currentDomain: '',
      models: [],
      selectedModel: '',
      documents: [],
      selectedIds: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      processing: false,
      processedCount: 0,
      stopFlag: false,
      statusMsg: '',
      lastCheckedIndex: null
    }
  },
  computed: {
    selectedDocs() {
      return this.documents.filter(d => this.selectedIds.includes(d._id))
    },
    allSelected() {
      return this.documents.length > 0 && this.selectedIds.length === this.documents.length
    }
  },
  mounted() {
    this.fetchDomains()
    this.fetchModels()
    this.fetchDocuments()
  },
  methods: {
    async fetchModels() {
      try {
        const res = await request('/api/models')
        this.models = res || []
        if (this.models.length > 0) {
          const defaultModel = this.models.find(m => m.id === 'gemini-2.5-flash')
          this.selectedModel = defaultModel ? defaultModel.id : this.models[0].id
        }
      } catch (e) {
        console.error('Fetch models error:', e)
      }
    },
    async fetchDomains() {
      try {
        const res = await request('/api/documents/domains')
        this.domains = res || []
      } catch (e) {
        console.error(e)
      }
    },
    async fetchDocuments() {
      try {
        let url = `/api/documents?page=${this.page}&limit=${this.limit}`
        if (this.currentDomain) url += `&domainId=${encodeURIComponent(this.currentDomain)}`
        const res = await request(url)
        this.documents = (res.docs || []).map(d => ({ ...d, _modified: false, _processing: false }))
        this.total = res.total
        this.totalPages = res.totalPages
        this.selectedIds = []
      } catch (e) {
        this.showToastMessage('加载失败: ' + e.message)
      }
    },
    async changePage(p) {
      this.page = p
      await this.fetchDocuments()
    },
    async changeLimit() {
      this.page = 1
      await this.fetchDocuments()
    },
    toggleSelectAll(e) {
      if (e.target.checked) {
        this.selectedIds = this.documents.map(d => d._id)
      } else {
        this.selectedIds = []
      }
    },
    
    handleRangeSelect(event, index) {
      if (event.shiftKey && this.lastCheckedIndex !== null) {
        const start = Math.min(this.lastCheckedIndex, index)
        const end = Math.max(this.lastCheckedIndex, index)
        const targetState = event.target.checked
        
        const rangeDocs = this.documents.slice(start, end + 1)
        const rangeIds = rangeDocs.map(d => d._id)
        
        if (targetState) {
          // Add range to selectedIds
          const newSet = new Set(this.selectedIds)
          rangeIds.forEach(id => newSet.add(id))
          this.selectedIds = Array.from(newSet)
        } else {
          // Remove range from selectedIds
          this.selectedIds = this.selectedIds.filter(id => !rangeIds.includes(id))
        }
      }
      this.lastCheckedIndex = index
    },

    // Core logic: Translate -> Extract Title -> Extract Tags -> Remove PID
    async processOne(doc) {
      doc._processing = true
      this.statusMsg = `正在处理: ${doc._id}...`
      try {
        // Backup content if not already backed up
        if (!doc.contentbak && doc.content) {
          doc.contentbak = doc.content
        }

        // 1. Translate Content
        // Check if content is English (simple check)
        const isEnglish = /[a-zA-Z]{5,}/.test(doc.content || '')
        let newContent = doc.content
        
        if (isEnglish) {
          const transRes = await request('/api/translate', {
            method: 'POST',
            body: JSON.stringify({ 
              text: doc.content,
              model: this.selectedModel
            })
          })
          if (transRes.result) {
            newContent = transRes.result
          }
        }
        
        // 2. Extract Tags & Title (AI)
        let newTags = doc.tag || []
        let newTitle = doc.title
        
        const tagRes = await request('/api/generate-tags', {
          method: 'POST',
          body: JSON.stringify({ 
            text: newContent || doc.content,
            model: this.selectedModel
          })
        })
        
        if (tagRes.tags && Array.isArray(tagRes.tags)) {
          // Merge existing tags with new tags, avoiding duplicates
          const currentTags = doc.tag || []
          newTags = [...new Set([...currentTags, ...tagRes.tags])]
        }
        if (tagRes.title) {
          newTitle = tagRes.title
        }
        
        // Update local state
        doc.content = newContent
        doc.title = newTitle
        doc.tag = newTags
        doc._modified = true
        
        this.statusMsg = `处理完成: ${doc._id}`
        return true
      } catch (e) {
        this.statusMsg = `处理失败 ${doc._id}: ${e.message}`
        console.error(e)
        return false
      } finally {
        doc._processing = false
      }
    },
    
    async saveDoc(doc) {
      try {
        await request(`/api/documents/${doc._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: doc.title,
            content: doc.content,
            contentbak: doc.contentbak,
            tag: doc.tag,
            removePid: true // Requirement: remove pid
          })
        })
        doc._modified = false
        this.showToastMessage('保存成功')
      } catch (e) {
        this.showToastMessage('保存失败: ' + e.message)
      }
    },

    restoreBackup(doc) {
      if (!doc.contentbak) return
      if (!confirm('确定要恢复备份内容吗？当前内容将被覆盖。')) return
      doc.content = doc.contentbak
      doc._modified = true
      this.showToastMessage('已恢复备份，请点击保存')
    },
    
    async batchProcess() {
      if (!confirm(`确定要批量处理选中的 ${this.selectedDocs.length} 个题目吗？这将消耗大量 Token。`)) return
      
      this.processing = true
      this.stopFlag = false
      this.processedCount = 0
      
      const queue = [...this.selectedDocs]
      
      for (const doc of queue) {
        if (this.stopFlag) break
        
        const success = await this.processOne(doc)
        if (success) {
          // Auto save after processing
          await this.saveDoc(doc)
        }
        this.processedCount++
      }
      
      this.processing = false
      this.statusMsg = this.stopFlag ? '批量处理已停止' : '批量处理完成'
    },
    
    stopProcessing() {
      this.stopFlag = true
    }
  }
}
</script>

<style scoped>
.problem-manager {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

h2 {
  color: #2c3e50;
  margin-bottom: 25px;
  font-size: 24px;
  font-weight: 600;
}

/* Controls */
.controls {
  display: flex;
  gap: 20px;
  margin-bottom: 25px;
  align-items: center;
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  border: 1px solid #eee;
  flex-wrap: wrap;
}
.control-group {
  display: flex;
  gap: 10px;
  align-items: center;
}
.control-group label {
  font-weight: 600;
  color: #34495e;
  font-size: 14px;
}
select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  color: #2c3e50;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
}
select:focus {
  border-color: #3498db;
  outline: none;
}

/* Buttons */
button {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  font-size: 14px;
}
.btn-refresh {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
}
.btn-refresh:hover { background-color: #2980b9; }

.btn-batch {
  padding: 8px 16px;
  background-color: #9b59b6;
  color: white;
}
.btn-batch:hover { background-color: #8e44ad; }
.btn-batch:disabled {
  background-color: #d7bde2;
  cursor: not-allowed;
}

.btn-stop {
  padding: 8px 16px;
  background-color: #e74c3c;
  color: white;
}
.btn-stop:hover { background-color: #c0392b; }

/* Status Bar */
.status-bar {
  background: #e8f5e9;
  padding: 12px 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  color: #2e7d32;
  font-weight: 500;
  border: 1px solid #c8e6c9;
  display: flex;
  align-items: center;
}
.status-bar::before {
  content: 'ℹ';
  display: inline-block;
  margin-right: 10px;
  font-weight: bold;
}

/* Table */
.table-container {
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid #eee;
  overflow-x: auto;
}
.doc-table {
  width: 100%;
  min-width: 1000px; /* Ensure table has enough width to display content properly */
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}
.doc-table th, .doc-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}
.doc-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
}
.doc-table tr:last-child td {
  border-bottom: none;
}
.doc-table tr:hover td {
  background-color: #fcfcfc;
}
.doc-table tr.modified td {
  background-color: #fff8e1;
}

.id-col {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  color: #7f8c8d;
  font-size: 12px;
}

.input-title {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  transition: border-color 0.2s;
}
.input-title:focus {
  border-color: #3498db;
  outline: none;
}

.content-preview {
  color: #7f8c8d;
  font-size: 13px;
  line-height: 1.4;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.links-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.link-item {
  display: inline-block;
  font-size: 12px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
}
.link-item:hover {
  text-decoration: underline;
  color: #2980b9;
}
.link-item.ref {
  color: #27ae60;
}
.link-item.ref:hover {
  color: #219150;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tag-badge {
  display: inline-block;
  background: #e1f5fe;
  color: #0277bd;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
}
.btn-process {
  background: #3498db;
  color: white;
}
.btn-process:hover { background-color: #2980b9; }
.btn-process:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}
.btn-process.processing {
  background: #f39c12;
  color: white;
  animation: pulse 2s infinite;
}

.btn-save {
  background: #2ecc71;
  color: white;
}
.btn-save:hover { background-color: #27ae60; }
.btn-save:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.btn-restore {
  background: #e67e22;
  color: white;
}
.btn-restore:hover { background-color: #d35400; }

.checkbox-large {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Pagination */
.pagination {
  margin-top: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}
.pagination button {
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #ddd;
  color: #666;
}
.pagination button:disabled {
  background-color: #f9f9f9;
  color: #ccc;
  cursor: not-allowed;
}
.pagination button:not(:disabled):hover {
  background-color: #f0f0f0;
  color: #333;
}
.pagination span {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

@media (max-width: 768px) {
  .problem-manager {
    padding: 10px;
  }
  
  .controls {
    padding: 15px;
    gap: 15px;
  }
  
  .control-group {
    width: 100%;
    justify-content: space-between;
  }
  
  .control-group select {
    flex: 1;
    margin-left: 10px;
  }
  
  .pagination {
    flex-wrap: wrap;
  }
}
</style>
