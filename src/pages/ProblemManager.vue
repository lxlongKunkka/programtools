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
          {{ processing && processingType !== 'report' ? `处理中 (${processedCount}/${selectedDocs.length})` : '批量处理选中 (翻译+标签+去PID)' }}
        </button>
        <button @click="batchGenerateReport" :disabled="processing || selectedDocs.length === 0" class="btn-batch btn-batch-report">
          {{ processing && processingType === 'report' ? `生成中 (${processedCount}/${selectedDocs.length})` : '批量生成题解' }}
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
            <th width="5%">文件数</th>
            <th width="5%">题解</th>
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
            <td>
              {{ doc.docId }}
              <span v-if="isRemoteJudge(doc)" class="badge-rj" title="Remote Judge">RJ</span>
            </td>
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
              <div class="files-container" @click="fetchHydroFiles(doc)">
                <div v-if="doc._loadingFiles" class="file-loading">...</div>
                <div v-else-if="doc.hydroFiles && doc.hydroFiles.length > 0">
                    <span class="file-count-badge" :title="doc.hydroFiles.map(f => f.name + ' (' + formatSize(f.size) + ')').join('\n')">
                        {{ doc.hydroFiles.length }}
                    </span>
                </div>
                <div v-else-if="doc.hydroFiles && doc.hydroFiles.length === 0" class="file-empty">0</div>
                <div v-else class="file-sync">同步</div>
              </div>
            </td>
            <td>
              <div class="solution-status" @click="toggleSolutionStatus(doc)">
                <span v-if="doc.solutionGenerated" class="status-icon success" title="已生成">✔</span>
                <span v-else class="status-icon" title="未生成">✘</span>
              </div>
            </td>
            <td>
              <div class="actions">
                <button @click="processOne(doc)" :disabled="doc._processing" class="btn-small btn-process" :class="{ 'processing': doc._processing && doc._processingType === 'smart' }">
                  {{ (doc._processing && doc._processingType === 'smart') ? '处理中...' : '智能处理' }}
                </button>
                <button v-if="doc.contentbak" @click="restoreBackup(doc)" class="btn-small btn-restore">恢复备份</button>
                <button @click="generateReport(doc)" :disabled="doc._processing" class="btn-small btn-report" :class="{ 'processing': doc._processing && doc._processingType === 'report' }" style="background-color: #9c27b0; color: white;">
                  {{ (doc._processing && doc._processingType === 'report') ? '生成中...' : '生成题解' }}
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
      statusMsg: '',
      lastCheckedIndex: null,
      showFilesModal: false,
      currentFileDoc: null,
      fileList: [],
      loadingFiles: false,
      currentSyncId: 0,
      processingType: ''
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
    isRemoteJudge(doc) {
      if (!doc.config) return false
      return doc.config.includes('type: remote_judge')
    },
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
        this.documents = (res.docs || []).map(d => ({ ...d, _modified: false, _processing: false, _processingType: null }))
        this.total = res.total
        this.totalPages = res.totalPages
        this.selectedIds = []
        
        // Trigger auto sync for files
        this.currentSyncId++
        this.autoSyncHydroFiles(this.currentSyncId)
      } catch (e) {
        this.showToastMessage('加载失败: ' + e.message)
      }
    },

    async autoSyncHydroFiles(syncId) {
        const docsToSync = this.documents.filter(d => !d.hydroFiles)
        for (const doc of docsToSync) {
            if (syncId !== this.currentSyncId) return
            await this.fetchHydroFiles(doc, true) // silent mode
            await new Promise(r => setTimeout(r, 500)) // 500ms delay
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

    async toggleSolutionStatus(doc) {
      try {
        const newStatus = !doc.solutionGenerated
        await request(`/api/documents/${doc._id}/solution-status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        })
        doc.solutionGenerated = newStatus
        this.showToastMessage(`状态已更新为: ${newStatus ? '已生成' : '未生成'}`, 'success')
      } catch (e) {
        this.showToastMessage('更新状态失败: ' + e.message, 'error')
      }
    },

    // Core logic: Translate -> Extract Title -> Extract Tags -> Remove PID
    async processOne(doc) {
      console.log(`[ProblemManager] 🚀 智能处理开始: ${doc.docId} (${doc._id})`)
      doc._processing = true
      doc._processingType = 'smart'
      this.statusMsg = `正在处理: ${doc._id}...`
      try {
        // Backup content if not already backed up
        if (!doc.contentbak && doc.content) {
          doc.contentbak = doc.content
        }

        // 1. Translate Content
        // Use contentbak as source if available (to avoid translating already translated text)
        const sourceText = doc.contentbak || doc.content

        // Check if content is English (simple check)
        const isEnglish = /[a-zA-Z]{5,}/.test(sourceText || '')
        let newContent = doc.content
        
        if (isEnglish) {
          const transRes = await request('/api/translate', {
            method: 'POST',
            body: JSON.stringify({ 
              text: sourceText,
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
        
        console.log(`[ProblemManager] ✅ 智能处理成功: ${doc.docId}`)
        this.statusMsg = `处理完成: ${doc._id}`
        return true
      } catch (e) {
        console.error(`[ProblemManager] ❌ 智能处理失败: ${doc.docId}`, e)
        this.statusMsg = `处理失败 ${doc._id}: ${e.message}`
        return false
      } finally {
        doc._processing = false
        doc._processingType = null
      }
    },

    async generateReport(doc, skipConfirm = false) {
      if (!skipConfirm && !confirm('确定要生成题解报告并上传到 Hydro 吗？这可能需要几十秒。')) return false
      
      console.log(`[ProblemManager] 🚀 生成题解开始: ${doc.docId}`)
      doc._processing = true
      doc._processingType = 'report'
      if (!skipConfirm) this.statusMsg = `正在生成题解报告: ${doc.docId}...`
      
      try {
        const res = await request('/api/generate-solution-report', {
          method: 'POST',
          body: JSON.stringify({
            docId: doc.docId,
            problemId: doc.docId, 
            content: doc.content,
            domainId: doc.domainId
          })
        })
        
        if (res.success) {
          console.log(`[ProblemManager] ✅ 生成题解成功: ${doc.docId}`, res)
          doc.solutionGenerated = true // Update UI immediately
          
          // Refresh file list
          this.fetchHydroFiles(doc, true)

          if (!skipConfirm) {
            if (res.skipped) {
              this.showToastMessage(`已跳过: ${res.message}`)
            } else {
              this.showToastMessage(`生成成功! 结果: ${res.results.join(', ')}`)
            }
          }
          return true
        } else {
          console.warn(`[ProblemManager] ⚠️ 生成题解失败/跳过: ${doc.docId}`, res)
          if (!skipConfirm) this.showToastMessage('生成失败')
          return false
        }
      } catch (e) {
        console.error(`[ProblemManager] ❌ 生成题解出错: ${doc.docId}`, e)
        if (!skipConfirm) this.showToastMessage('生成出错: ' + e.message)
        return false
      } finally {
        doc._processing = false
        doc._processingType = null
        if (!skipConfirm) this.statusMsg = ''
        // Force update to ensure UI reflects the change
        this.$forceUpdate && this.$forceUpdate()
      }
    },
    
    async batchGenerateReport() {
      if (!confirm(`确定要为选中的 ${this.selectedDocs.length} 个题目生成题解吗？这将消耗大量 Token 并需要较长时间。`)) return
      
      this.processing = true
      this.processingType = 'report'
      this.stopFlag = false
      this.processedCount = 0
      
      const queue = [...this.selectedDocs]
      
      for (const doc of queue) {
        if (this.stopFlag) break
        
        this.statusMsg = `正在生成题解 (${this.processedCount + 1}/${queue.length}): ${doc.docId}`
        await this.generateReport(doc, true)
        this.processedCount++
      }
      
      this.processing = false
      this.processingType = ''
      this.statusMsg = this.stopFlag ? '批量生成已停止' : '批量生成完成'
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
    },

    async fetchHydroFiles(doc, silent = false) {
        if (doc._loadingFiles) return
        
        console.log(`[ProblemManager] 📂 获取文件列表: ${doc.docId}`)
        doc._loadingFiles = true
        
        try {
            // Resolve PID if reference
            let pid = doc.docId
            let domainId = doc.domainId
            if (doc.reference && doc.reference.pid) {
                pid = doc.reference.pid
                domainId = doc.reference.domainId || domainId
            }

            const res = await request(`/api/hydro/files?pid=${pid}&domainId=${domainId || ''}&sync=true`)
            // Hydro returns array of file objects
            const files = Array.isArray(res) ? res : []
            doc.hydroFiles = files
            console.log(`[ProblemManager] 📂 获取文件列表成功: ${doc.docId}, 数量: ${files.length}`)
        } catch (e) {
            console.error(`[ProblemManager] ❌ 获取文件列表失败: ${doc.docId}`, e)
            if (!silent) {
                this.showToastMessage('获取文件列表失败: ' + e.message)
            }
            doc.hydroFiles = []
        } finally {
            doc._loadingFiles = false
        }
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
}
</script>

<style scoped>
:root {
  --primary-color: #3498db;
  --success-color: #2ecc71;
  --warning-color: #f39c12;
  --danger-color: #e74c3c;
  --purple-color: #9b59b6;
  --text-color: #2c3e50;
  --bg-color: #f5f7fa;
  --card-bg: #ffffff;
  --border-color: #e0e0e0;
}

.problem-manager {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f8f9fa;
  min-height: 100vh;
}

h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

/* Controls Card */
.controls {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.05);
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-weight: 600;
  color: #546e7a;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

select {
  padding: 8px 12px;
  border: 1px solid #dfe6e9;
  border-radius: 6px;
  font-size: 14px;
  color: #2d3436;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}
select:hover {
  border-color: #b2bec3;
}
select:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  outline: none;
}

/* Buttons */
button {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
button:active {
  transform: translateY(1px);
}

.btn-refresh {
  padding: 9px 18px;
  background-color: #3498db;
  color: white;
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.2);
}
.btn-refresh:hover { background-color: #2980b9; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3); }

.btn-batch {
  padding: 9px 18px;
  background-color: #9b59b6;
  color: white;
  box-shadow: 0 2px 6px rgba(155, 89, 182, 0.2);
}
.btn-batch:hover { background-color: #8e44ad; box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3); }
.btn-batch:disabled {
  background-color: #e1bee7;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

.btn-batch-report {
  background-color: #9c27b0;
  margin-left: 10px;
  box-shadow: 0 2px 6px rgba(156, 39, 176, 0.2);
}
.btn-batch-report:hover {
  background-color: #8e24aa;
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.btn-stop {
  padding: 9px 18px;
  background-color: #e74c3c;
  color: white;
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.2);
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
  font-size: 14px;
}
.status-bar::before {
  content: 'ℹ';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #2e7d32;
  color: white;
  border-radius: 50%;
  margin-right: 12px;
  font-size: 12px;
  font-weight: bold;
}

/* Table Container */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  border: 1px solid rgba(0,0,0,0.05);
  overflow: hidden;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.doc-table th {
  background-color: #f8f9fa;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #636e72;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #eee;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.doc-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f2f6;
  vertical-align: middle;
  color: #2d3436;
}

.doc-table tr:last-child td {
  border-bottom: none;
}

.doc-table tr:hover td {
  background-color: #f8f9fa;
}

.doc-table tr.modified td {
  background-color: #fffbf0;
}

/* Columns */
.id-col {
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: #636e72;
  font-size: 12px;
}

.input-title {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  background: transparent;
  transition: all 0.2s;
}
.input-title:hover {
  background: #f1f2f6;
}
.input-title:focus {
  background: white;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
  outline: none;
}

.content-preview {
  color: #95a5a6;
  font-size: 13px;
  line-height: 1.5;
  max-width: 350px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}

.links-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.link-item {
  font-size: 12px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}
.link-item:hover { color: #2980b9; text-decoration: underline; }
.link-item.ref { color: #27ae60; }
.link-item.ref:hover { color: #219150; }

/* Tags */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-badge {
  background: #e3f2fd;
  color: #1565c0;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(21, 101, 192, 0.1);
}

/* Files Column */
.files-container {
  cursor: pointer;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-loading {
  color: #b2bec3;
  font-size: 12px;
}

.file-count-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  font-weight: 700;
  min-width: 24px;
  height: 24px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(21, 101, 192, 0.15);
}

.file-empty {
  color: #dfe6e9;
  font-size: 12px;
  font-weight: 500;
}

.file-sync {
  color: #3498db;
  font-size: 12px;
  text-decoration: underline;
  text-decoration-style: dotted;
}
.file-sync:hover {
  color: #2980b9;
  text-decoration-style: solid;
}

/* Solution Status */
.solution-status {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  color: #dfe6e9;
  font-size: 18px;
  transition: all 0.2s;
}
.status-icon.success {
  color: #2ecc71;
  text-shadow: 0 2px 4px rgba(46, 204, 113, 0.2);
}
.status-icon:hover {
  transform: scale(1.2);
}

/* Actions */
.actions {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 280px; /* Ensure enough space for buttons */
}
.btn-small {
  padding: 6px 10px;
  font-size: 11px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.btn-process {
  background: #e3f2fd;
  color: #1976d2;
}
.btn-process:hover { background: #bbdefb; }
.btn-process.processing {
  background: #fff3e0;
  color: #f57c00;
  animation: pulse 2s infinite;
}

.btn-save {
  background: #e8f5e9;
  color: #2e7d32;
}
.btn-save:hover { background: #c8e6c9; }
.btn-save:disabled {
  background: #f5f5f5;
  color: #bdbdbd;
  cursor: not-allowed;
}

.btn-report {
  background: #f3e5f5;
  color: #7b1fa2;
}
.btn-report:hover { background: #e1bee7; }
.btn-report.processing {
  background: #f3e5f5;
  color: #7b1fa2;
  animation: pulse 2s infinite;
}

.btn-restore {
  background: #fff3e0;
  color: #e65100;
}
.btn-restore:hover { background: #ffe0b2; }

/* Checkbox */
.checkbox-large {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3498db;
}

/* Pagination */
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}
.pagination button {
  padding: 8px 14px;
  background-color: white;
  border: 1px solid #dfe6e9;
  color: #636e72;
  border-radius: 6px;
}
.pagination button:not(:disabled):hover {
  border-color: #3498db;
  color: #3498db;
}
.pagination span {
  font-size: 13px;
  color: #636e72;
  font-weight: 600;
  margin: 0 10px;
}

/* Badges */
.badge-rj {
  display: inline-block;
  background: #9b59b6;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-left: 5px;
  vertical-align: middle;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
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
