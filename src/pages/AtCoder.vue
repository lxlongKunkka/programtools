<template>
  <div class="atcoder-root">
    <!-- Top bar -->
    <div class="top-bar">
      <h2>题目搬运</h2>
      <div class="top-controls">
        <label>模型:</label>
        <select v-model="model">
          <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <label style="margin-left:12px;">语言:</label>
        <select v-model="language">
          <option value="C++">C++</option>
          <option value="Python">Python</option>
        </select>
      </div>
    </div>

    <!-- URL input -->
    <div class="url-bar">
      <input
        v-model="contestUrl"
        class="url-input"
        placeholder="输入比赛/题目链接，支�?AtCoder / Codeforces / 洛谷"
        @keydown.enter="fetchContest"
        :disabled="fetchingContest"
      />
      <button class="btn-primary" @click="fetchContest" :disabled="fetchingContest || !contestUrl.trim()">
        {{ fetchingContest ? '�?抓取�?..' : '🔍 获取题目' }}
      </button>
    </div>

    <!-- Contest info -->
    <div v-if="contestInfo" class="contest-info">
      <span class="contest-title">📋 {{ contestInfo.contestTitle }}</span>
      <span class="contest-meta">�?{{ contestInfo.problems.length }} �?/span>
      <div class="bulk-actions">
        <label class="check-all">
          <input type="checkbox" :checked="allSelected" @change="toggleAll" />
          全�?
        </label>
        <button
          class="btn-primary"
          @click="processSelected"
          :disabled="isProcessing || selectedCount === 0"
        >
          {{ isProcessing ? `�?处理�?(${processingLabel})` : `🚀 处理选中 (${selectedCount})` }}
        </button>
        <button class="btn-secondary" @click="downloadAll" :disabled="!hasAnyResult">
          📦 下载全部
        </button>
      </div>
    </div>

    <!-- Main content -->
    <div v-if="contestInfo" class="main-layout">
      <!-- Problem list -->
      <div class="problem-list">
        <div
          v-for="p in contestInfo.problems"
          :key="p.taskId"
          :class="['problem-item', { active: currentTaskId === p.taskId }]"
          @click="currentTaskId = p.taskId"
        >
          <input
            type="checkbox"
            :checked="selected.has(p.taskId)"
            @change.stop="toggleSelect(p.taskId)"
            @click.stop
          />
          <div class="problem-label">{{ p.label }}</div>
          <div class="problem-title-text">{{ p.title }}</div>
          <div class="step-dots">
            <span
              v-for="step in STEPS"
              :key="step.key"
              :class="['dot', getStepStatus(p.taskId, step.key)]"
              :title="step.label"
            ></span>
          </div>
        </div>
      </div>

      <!-- Detail panel -->
      <div class="detail-panel">
        <template v-if="currentProblem">
          <div class="detail-header">
            <span class="detail-title">{{ currentProblem.label }}. {{ currentProblem.title }}</span>
            <div class="detail-actions">
              <button
                class="btn-primary btn-sm"
                @click="processProblem(currentProblem.taskId)"
                :disabled="isProcessing"
              >
                {{ isProblemProcessing(currentProblem.taskId) ? '�?处理�?..' : '�?单独处理' }}
              </button>
              <button
                v-if="hasResult(currentProblem.taskId)"
                class="btn-secondary btn-sm"
                @click="downloadProblem(currentProblem.taskId)"
              >💾 下载</button>
            </div>
          </div>

          <!-- Step tabs -->
          <div class="step-tabs">
            <button
              v-for="step in STEPS"
              :key="step.key"
              :class="['step-tab', { active: activeTab === step.key }, getStepStatus(currentProblem.taskId, step.key)]"
              @click="activeTab = step.key"
            >
              <span class="step-status-icon">{{ getStepIcon(currentProblem.taskId, step.key) }}</span>
              {{ step.label }}
            </button>
          </div>

          <!-- Content area -->
          <div class="step-content">
            <div v-if="getStepError(currentProblem.taskId, activeTab)" class="error-box">
              �?{{ getStepError(currentProblem.taskId, activeTab) }}
            </div>

            <template v-else>
              <!-- Raw content -->
              <template v-if="activeTab === 'content'">
                <div v-if="!getResult(currentProblem.taskId, 'content')" class="empty-hint">
                  <span v-if="isProblemAtStep(currentProblem.taskId, 'content')">�?正在抓取题目原文...</span>
                  <span v-else>尚未抓取，点�?处理"开�?/span>
                </div>
                <pre v-else class="content-pre">{{ getResult(currentProblem.taskId, 'content') }}</pre>
              </template>

              <!-- Translation -->
              <template v-else-if="activeTab === 'translation'">
                <div v-if="!getResult(currentProblem.taskId, 'translation')" class="empty-hint">
                  <span v-if="isProblemAtStep(currentProblem.taskId, 'translation')">�?正在翻译...</span>
                  <span v-else>尚未翻译</span>
                </div>
                <div v-else class="tab-view">
                  <div class="tab-toggle">
                    <button :class="['mini-tab', { active: previewMode['translation'] !== 'raw' }]"
                      @click="setPreview('translation', 'preview')">预览</button>
                    <button :class="['mini-tab', { active: previewMode['translation'] === 'raw' }]"
                      @click="setPreview('translation', 'raw')">源码</button>
                  </div>
                  <MarkdownViewer
                    v-if="previewMode['translation'] !== 'raw'"
                    :content="getResult(currentProblem.taskId, 'translation')"
                  />
                  <textarea v-else class="raw-output" readonly :value="getResult(currentProblem.taskId, 'translation')"></textarea>
                </div>
              </template>

              <!-- Code -->
              <template v-else-if="activeTab === 'code'">
                <div v-if="!getResult(currentProblem.taskId, 'code')" class="empty-hint">
                  <span v-if="isProblemAtStep(currentProblem.taskId, 'code')">�?正在生成解题代码...</span>
                  <span v-else>尚未生成</span>
                </div>
                <div v-else class="tab-view">
                  <div class="tab-toggle">
                    <button :class="['mini-tab', { active: previewMode['code'] !== 'raw' }]"
                      @click="setPreview('code', 'preview')">预览</button>
                    <button :class="['mini-tab', { active: previewMode['code'] === 'raw' }]"
                      @click="setPreview('code', 'raw')">源码</button>
                  </div>
                  <MarkdownViewer
                    v-if="previewMode['code'] !== 'raw'"
                    :content="getResult(currentProblem.taskId, 'code')"
                  />
                  <textarea v-else class="raw-output" readonly :value="getResult(currentProblem.taskId, 'code')"></textarea>
                </div>
              </template>

              <!-- Data script -->
              <template v-else-if="activeTab === 'dataScript'">
                <div v-if="!getResult(currentProblem.taskId, 'dataScript')" class="empty-hint">
                  <span v-if="isProblemAtStep(currentProblem.taskId, 'dataScript')">�?正在生成数据脚本...</span>
                  <span v-else>尚未生成</span>
                </div>
                <div v-else class="tab-view">
                  <div class="tab-toggle">
                    <button :class="['mini-tab', { active: previewMode['dataScript'] !== 'raw' }]"
                      @click="setPreview('dataScript', 'preview')">预览</button>
                    <button :class="['mini-tab', { active: previewMode['dataScript'] === 'raw' }]"
                      @click="setPreview('dataScript', 'raw')">源码</button>
                  </div>
                  <MarkdownViewer
                    v-if="previewMode['dataScript'] !== 'raw'"
                    :content="getResult(currentProblem.taskId, 'dataScript')"
                  />
                  <textarea v-else class="raw-output" readonly :value="getResult(currentProblem.taskId, 'dataScript')"></textarea>
                </div>
              </template>
            </template>
          </div>
        </template>

        <div v-else class="empty-panel">
          <p>�?从左侧选择题目查看详情</p>
        </div>
      </div>
    </div>

    <!-- Initial empty state -->
    <div v-if="!contestInfo && !fetchingContest" class="welcome">
      <div class="welcome-icon">🏆</div>
      <p>输入比赛或题目链接，自动抓取并完成：</p>
      <ul>
        <li>📥 抓取题目原文</li>
        <li>🌐 AI 翻译成中�?/li>
        <li>💡 生成 AC 解题代码</li>
        <li>🔧 生成数据生成脚本 (cyaron)</li>
      </ul>
      <p class="welcome-platforms">支持平台：AtCoder · Codeforces · 洛谷</p>
    </div>
  </div>
</template>

<script>
import request from '../utils/request'
import { getModels } from '../utils/models'
import JSZip from 'jszip'
import MarkdownViewer from '../components/MarkdownViewer.vue'

const STEPS = [
  { key: 'content',    label: '原文' },
  { key: 'translation', label: '翻译' },
  { key: 'code',       label: '解题' },
  { key: 'dataScript', label: '数据' }
]

export default {
  name: 'AtCoder',
  components: { MarkdownViewer },
  inject: ['showToastMessage'],

  data() {
    return {
      STEPS,
      contestUrl: '',
      fetchingContest: false,
      contestInfo: null,     // { contestId, contestTitle, problems }
      selected: new Set(),
      currentTaskId: null,
      activeTab: 'content',
      model: 'gemini-2.5-flash',
      modelOptions: [],
      language: 'C++',

      // { taskId: { content, translation, code, dataScript, currentStep, errors: {} } }
      results: {},

      isProcessing: false,
      processingQueue: [],   // taskIds being processed
      previewMode: { translation: 'preview', code: 'preview', dataScript: 'preview' }
    }
  },

  computed: {
    currentProblem() {
      if (!this.contestInfo || !this.currentTaskId) return null
      return this.contestInfo.problems.find(p => p.taskId === this.currentTaskId) || null
    },
    allSelected() {
      if (!this.contestInfo) return false
      return this.contestInfo.problems.every(p => this.selected.has(p.taskId))
    },
    selectedCount() {
      return this.selected.size
    },
    processingLabel() {
      if (!this.processingQueue.length) return ''
      const id = this.processingQueue[0]
      const p = this.contestInfo?.problems.find(p => p.taskId === id)
      return p ? p.label : id
    },
    hasAnyResult() {
      return Object.values(this.results).some(r => r.content || r.translation || r.code || r.dataScript)
    }
  },

  async mounted() {
    this.modelOptions = await getModels()
    if (this.modelOptions.length > 0 && !this.modelOptions.find(m => m.id === this.model)) {
      this.model = this.modelOptions[0].id
    }
  },

  methods: {
    async fetchContest() {
      const url = this.contestUrl.trim()
      if (!url) return
      this.fetchingContest = true
      this.contestInfo = null
      this.results = {}
      this.selected = new Set()
      this.currentTaskId = null

      try {
        const data = await request(`/api/atcoder/contest?url=${encodeURIComponent(url)}`)
        this.contestInfo = data
        // Select all by default
        data.problems.forEach(p => this.selected.add(p.taskId))
        if (data.problems.length > 0) {
          this.currentTaskId = data.problems[0].taskId
        }
        this.showToastMessage(`�?获取成功，共 ${data.problems.length} 道题`)
      } catch (err) {
        this.showToastMessage('�?' + (err.message || '获取失败'))
      } finally {
        this.fetchingContest = false
      }
    },

    toggleAll(e) {
      const s = new Set()
      if (e.target.checked) {
        this.contestInfo.problems.forEach(p => s.add(p.taskId))
      }
      this.selected = s
    },

    toggleSelect(taskId) {
      const s = new Set(this.selected)
      if (s.has(taskId)) s.delete(taskId)
      else s.add(taskId)
      this.selected = s
    },

    async processSelected() {
      const taskIds = this.contestInfo.problems
        .filter(p => this.selected.has(p.taskId))
        .map(p => p.taskId)
      if (!taskIds.length) return
      this.isProcessing = true
      this.processingQueue = [...taskIds]
      for (const taskId of taskIds) {
        await this.runPipeline(taskId)
        this.processingQueue = this.processingQueue.filter(id => id !== taskId)
      }
      this.isProcessing = false
      this.processingQueue = []
      this.showToastMessage('🎉 全部处理完成�?)
    },

    async processProblem(taskId) {
      if (this.isProcessing) return
      this.isProcessing = true
      this.processingQueue = [taskId]
      await this.runPipeline(taskId)
      this.isProcessing = false
      this.processingQueue = []
    },

    initResult(taskId) {
      if (!this.results[taskId]) {
        this.results[taskId] = {
          content: '',
          editorial: '',
          translation: '',
          code: '',
          dataScript: '',
          currentStep: null,
          errors: {}
        }
      }
    },

    setStep(taskId, step) {
      const r = this.results[taskId]
      if (r) r.currentStep = step
    },

    setError(taskId, step, msg) {
      const r = this.results[taskId]
      if (r) {
        if (!r.errors) r.errors = {}
        r.errors[step] = msg
        r.currentStep = null
      }
    },

    async runPipeline(taskId) {
      const problem = this.contestInfo.problems.find(p => p.taskId === taskId)
      if (!problem) return

      this.initResult(taskId)
      const r = this.results[taskId]

      // Auto-switch view to this problem
      this.currentTaskId = taskId

      // ── Step 1: Fetch content ────────────────────────────────────────────
      if (!r.content) {
        this.setStep(taskId, 'content')
        this.activeTab = 'content'
        try {
          const data = await request(`/api/atcoder/problem?url=${encodeURIComponent(problem.url)}`)
          r.content = data.content
          r.editorial = data.editorial || ''
          r.acCode = data.acCode || ''   // �?editorial 提取�?AC 代码（若有）
          r.currentStep = null
        } catch (err) {
          this.setError(taskId, 'content', err.message)
          return
        }
      }

      // ── Step 2: Translate ────────────────────────────────────────────────
      if (!r.translation) {
        this.setStep(taskId, 'translation')
        this.activeTab = 'translation'
        try {
          const data = await request.post('/api/translate', {
            text: r.content,
            model: this.model
          })
          r.translation = data.result || data.translation || JSON.stringify(data)
          r.currentStep = null
        } catch (err) {
          this.setError(taskId, 'translation', err.message)
          return
        }
      }

      // ── Step 3: Solve ────────────────────────────────────────────────────
      if (!r.code) {
        this.setStep(taskId, 'code')
        this.activeTab = 'code'
        try {
          const data = await request.post('/api/solve', {
            text: r.translation,
            model: this.model,
            language: this.language,
            acCode: r.acCode || ''   // 传�?editorial 中提取的 AC 代码（有则讲解，无则独立解题�?
          })
          r.code = data.result || JSON.stringify(data)
          r.currentStep = null
        } catch (err) {
          this.setError(taskId, 'code', err.message)
          return
        }
      }

      // ── Step 4: Generate data ────────────────────────────────────────────
      if (!r.dataScript) {
        this.setStep(taskId, 'dataScript')
        this.activeTab = 'dataScript'
        try {
          const data = await request.post('/api/generate-data', {
            text: r.translation,
            model: this.model,
            code: r.code
          })
          r.dataScript = data.result || JSON.stringify(data)
          r.currentStep = null
        } catch (err) {
          this.setError(taskId, 'dataScript', err.message)
          // Don't return - data gen failure is non-fatal
        }
      }

      r.currentStep = null
    },

    // ── Result accessors ───────────────────────────────────────────────────
    getResult(taskId, key) {
      return this.results[taskId]?.[key] || ''
    },
    getStepError(taskId, key) {
      return this.results[taskId]?.errors?.[key] || ''
    },
    hasResult(taskId) {
      const r = this.results[taskId]
      return !!(r?.content || r?.translation || r?.code || r?.dataScript)
    },
    isProblemProcessing(taskId) {
      return this.processingQueue.includes(taskId)
    },
    isProblemAtStep(taskId, step) {
      return this.results[taskId]?.currentStep === step
    },

    getStepStatus(taskId, stepKey) {
      const r = this.results[taskId]
      if (!r) return 'idle'
      if (r.errors?.[stepKey]) return 'error'
      if (r.currentStep === stepKey) return 'active'
      if (r[stepKey]) return 'done'
      return 'idle'
    },
    getStepIcon(taskId, stepKey) {
      const s = this.getStepStatus(taskId, stepKey)
      if (s === 'done') return '�?
      if (s === 'active') return '�?
      if (s === 'error') return '�?
      return '�?
    },

    setPreview(key, mode) {
      this.previewMode = { ...this.previewMode, [key]: mode }
    },

    // ── Download ───────────────────────────────────────────────────────────
    // Extract first code block's raw content from a markdown string
    extractCode(md) {
      const match = md.match(/```[\w]*\n([\s\S]*?)\n```/)
      return match ? match[1].trim() : md
    },

    buildMarkdown(taskId) {
      const problem = this.contestInfo.problems.find(p => p.taskId === taskId)
      const r = this.results[taskId] || {}
      const label = problem ? `${problem.label}. ${problem.title}` : taskId

      let md = `# ${label}\n\n`
      if (r.translation) {
        md += `## 题目翻译\n\n${r.translation}\n\n`
      }
      if (r.code) {
        md += `## 解题代码\n\n${r.code}\n\n`
      }
      if (r.dataScript) {
        md += `## 数据生成脚本\n\n${r.dataScript}\n\n`
      }
      if (r.editorial) {
        md += `## 题解参考\n\n${r.editorial}\n\n`
      }
      if (r.content) {
        md += `## 英文原题\n\n\`\`\`\n${r.content}\n\`\`\`\n\n`
      }
      return md
    },

    downloadProblem(taskId) {
      const problem = this.contestInfo.problems.find(p => p.taskId === taskId)
      const filename = `${problem?.label || taskId}_${taskId}.md`
      this.triggerDownload(filename, this.buildMarkdown(taskId))
    },

    async downloadAll() {
      const zip = new JSZip()
      let count = 0

      for (const p of this.contestInfo.problems) {
        if (!this.hasResult(p.taskId)) continue
        const r = this.results[p.taskId] || {}
        const folder = zip.folder(`${p.label}_${p.taskId}`)
        count++

        // problem.md �?Chinese translation (or English original as fallback)
        if (r.translation) {
          folder.file('problem.md', r.translation)
        } else if (r.content) {
          folder.file('problem.md', r.content)
        }

        // solution.md �?full solve markdown with explanation + code
        if (r.code) {
          folder.file('solution.md', r.code)
        }

        // gen.py �?extract raw Python from data script markdown
        if (r.dataScript) {
          folder.file('gen.py', this.extractCode(r.dataScript))
        }

        // original.md �?English source
        if (r.content) {
          folder.file('original.md', r.content)
        }
      }

      if (count === 0) {
        this.showToastMessage('⚠️ 没有可下载的内容')
        return
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.contestInfo.contestId}.zip`
      a.click()
      URL.revokeObjectURL(url)
      this.showToastMessage(`�?已打�?${count} 道题目`)
    },

    triggerDownload(filename, content) {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.atcoder-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 52px);
  overflow: hidden;
  font-size: 14px;
  background: #f5f7fa;
}

/* ── Top bar ─────────────────────────────────────────────────────────── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.top-bar h2 { margin: 0; font-size: 18px; color: #1a1a2e; }
.top-controls { display: flex; align-items: center; gap: 8px; }
.top-controls select {
  padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 13px; background: #fff;
}

/* ── URL bar ─────────────────────────────────────────────────────────── */
.url-bar {
  display: flex; gap: 10px; padding: 12px 20px;
  background: #fff; border-bottom: 1px solid #e5e7eb;
}
.url-input {
  flex: 1; padding: 8px 12px; font-size: 14px;
  border: 1px solid #d1d5db; border-radius: 8px; outline: none;
}
.url-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,.1); }

/* ── Contest info ────────────────────────────────────────────────────── */
.contest-info {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 8px 20px; background: #eef2ff; border-bottom: 1px solid #c7d2fe;
}
.contest-title { font-weight: 600; color: #3730a3; }
.contest-meta { font-size: 12px; color: #6b7280; }
.bulk-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.check-all { display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer; }

/* ── Buttons ─────────────────────────────────────────────────────────── */
.btn-primary {
  padding: 7px 16px; background: #4f46e5; color: #fff;
  border: none; border-radius: 7px; cursor: pointer; font-size: 13px;
  transition: background .15s;
}
.btn-primary:hover:not(:disabled) { background: #4338ca; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary {
  padding: 7px 14px; background: #f3f4f6; color: #374151;
  border: 1px solid #d1d5db; border-radius: 7px; cursor: pointer; font-size: 13px;
}
.btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
.btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
.btn-sm { padding: 4px 10px; font-size: 12px; }

/* ── Main layout ─────────────────────────────────────────────────────── */
.main-layout {
  display: flex; flex: 1; overflow: hidden;
}

/* ── Problem list ────────────────────────────────────────────────────── */
.problem-list {
  width: 260px; min-width: 220px; overflow-y: auto;
  background: #fff; border-right: 1px solid #e5e7eb;
}
.problem-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f3f4f6;
  transition: background .1s;
}
.problem-item:hover { background: #f9fafb; }
.problem-item.active { background: #eef2ff; }
.problem-item input[type=checkbox] { flex-shrink: 0; cursor: pointer; }
.problem-label {
  flex-shrink: 0; width: 20px; font-weight: 700; color: #4f46e5; font-size: 13px;
}
.problem-title-text {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 13px; color: #374151;
}
.step-dots { display: flex; gap: 3px; flex-shrink: 0; }
.dot {
  width: 8px; height: 8px; border-radius: 50%; background: #e5e7eb;
}
.dot.done { background: #10b981; }
.dot.active { background: #f59e0b; }
.dot.error { background: #ef4444; }

/* ── Detail panel ────────────────────────────────────────────────────── */
.detail-panel {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}
.detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: #fff; border-bottom: 1px solid #e5e7eb;
}
.detail-title { font-weight: 600; font-size: 15px; color: #1a1a2e; }
.detail-actions { display: flex; gap: 8px; }

/* ── Step tabs ───────────────────────────────────────────────────────── */
.step-tabs {
  display: flex; gap: 2px; padding: 8px 12px;
  background: #f9fafb; border-bottom: 1px solid #e5e7eb;
}
.step-tab {
  padding: 6px 14px; border: 1px solid #d1d5db; border-radius: 6px;
  background: #fff; cursor: pointer; font-size: 13px; color: #6b7280;
  display: flex; align-items: center; gap: 4px;
  transition: all .15s;
}
.step-tab:hover { background: #f3f4f6; }
.step-tab.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.step-tab.done { border-color: #10b981; }
.step-tab.error { border-color: #ef4444; }
.step-status-icon { font-size: 12px; }

/* ── Step content ────────────────────────────────────────────────────── */
.step-content {
  flex: 1; overflow: hidden; display: flex; flex-direction: column;
  padding: 12px 16px;
}
.empty-hint {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #9ca3af; font-size: 14px;
}
.content-pre {
  flex: 1; overflow: auto; white-space: pre-wrap; word-break: break-word;
  background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px;
  font-family: 'Consolas', monospace; font-size: 13px; line-height: 1.6;
  margin: 0;
}
.error-box {
  background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5;
  border-radius: 8px; padding: 12px; font-size: 13px;
}
.tab-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.tab-toggle { display: flex; gap: 6px; margin-bottom: 8px; }
.mini-tab {
  padding: 3px 10px; border: 1px solid #d1d5db; border-radius: 5px;
  background: #fff; cursor: pointer; font-size: 12px;
}
.mini-tab.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.raw-output {
  flex: 1; resize: none; font-family: 'Consolas', monospace; font-size: 13px;
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;
  background: #1e1e2e; color: #cdd6f4; line-height: 1.6;
  overflow: auto;
}

/* ── Empty panel ─────────────────────────────────────────────────────── */
.empty-panel {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #9ca3af;
}

/* ── Welcome ─────────────────────────────────────────────────────────── */
.welcome {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: #6b7280; gap: 8px;
}
.welcome-icon { font-size: 48px; }
.welcome ul { text-align: left; line-height: 2; }
.welcome-platforms { font-size: 12px; color: #9ca3af; margin-top: 8px; }

/* ── MarkdownViewer area ────────────────────────────────────────────── */
:deep(.markdown-viewer) {
  flex: 1; overflow-y: auto; padding: 0 4px;
}
</style>
