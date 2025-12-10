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
            <th>Domain</th>
            <th width="20%">标题</th>
            <th width="10%">链接</th>
            <th width="25%">内容预览</th>
            <th width="15%">标签</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in documents" :key="doc._id" :class="{ modified: doc._modified }">
            <td><input type="checkbox" v-model="selectedIds" :value="doc._id"></td>
            <td class="id-col">{{ doc._id }}</td>
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
      statusMsg: ''
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
    
    // Core logic: Translate -> Extract Title -> Extract Tags -> Remove PID
    async processOne(doc) {
      doc._processing = true
      this.statusMsg = `正在处理: ${doc._id}...`
      try {
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
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  align-items: center;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}
.control-group {
  display: flex;
  gap: 10px;
  align-items: center;
}
.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.doc-table th, .doc-table td {
  border: 1px solid #eee;
  padding: 8px;
  text-align: left;
}
.doc-table th {
  background: #f1f1f1;
}
.id-col {
  font-family: monospace;
  color: #666;
}
.input-title {
  width: 100%;
  padding: 4px;
  border: 1px solid #ddd;
}
.content-preview {
  color: #666;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.links-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.link-item {
  display: inline-block;
  font-size: 12px;
  color: #007bff;
  text-decoration: none;
}
.link-item:hover {
  text-decoration: underline;
}
.link-item.ref {
  color: #28a745;
}
.tag-badge {
  display: inline-block;
  background: #e1f5fe;
  color: #0277bd;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 4px;
  margin-bottom: 2px;
}
.actions {
  display: flex;
  gap: 5px;
}
.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn-process {
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
}
.btn-process:disabled {
  background: #ccc;
}
.btn-process.processing {
  background: #ff9800;
  color: white;
  opacity: 1;
}
.btn-save {
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
}
.btn-save:disabled {
  background: #ccc;
}
.modified {
  background-color: #fff3e0;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}
.status-bar {
  background: #e8f5e9;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  color: #2e7d32;
}
</style>
