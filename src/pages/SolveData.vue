<template>
<div class="solve-data-container">
  <div class="top-bar">
    <h2>Solve + Data 生成器</h2>
    <div class="top-controls" style="display:flex; align-items:center; gap:15px;">
      <button @click="toggleBatchMode" :class="['btn-batch', {active: isBatchMode}]">
        {{ isBatchMode ? '退出批量模式' : '进入批量模式' }}
      </button>
      <div class="model-selector">
        <label for="model-select">模型:</label>
        <select id="model-select" v-model="selectedModel">
          <option v-for="m in (models && models.length ? models : [
            { id: 'o4-mini', name: 'o4-mini' },
            { id: 'o3-mini', name: 'o3-mini' },
            { id: 'o2-mini', name: 'o2-mini' },
            { id: 'o1-mini', name: 'o1-mini' },
            { id: 'grok-4-fast', name: 'grok-4-fast' },
            { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash' }
          ])" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <div class="language-selector" style="margin-left: 15px;">
        <label for="lang-select">语言:</label>
        <select id="lang-select" v-model="language">
          <option value="C++">C++</option>
          <option value="Python">Python</option>
        </select>
      </div>
    </div>
  </div>
  
  <div class="main-layout new-layout" :style="{ '--left-width': leftWidth + '%' }">
    
    <!-- 批量任务列表侧边栏 -->
    <div v-if="isBatchMode" class="batch-sidebar">
      <div class="batch-header">
        <h3>任务列表 ({{ tasks.length }})</h3>
        <div class="batch-actions">
          <button @click="addNewTask" class="btn-icon" title="添加新任务">➕</button>
        </div>
      </div>
      <div class="task-list">
        <div 
          v-for="(task, index) in tasks" 
          :key="index"
          :class="['task-item', { active: currentTaskIndex === index }]"
          @click="switchTask(index)"
        >
          <div class="task-status-dot" :class="task.status"></div>
          <div class="task-info">
            <div class="task-title">{{ getTaskTitle(task) }}</div>
            <div class="task-meta">{{ getTaskStatusText(task) }}</div>
          </div>
          <button @click.stop="removeTask(index)" class="btn-icon-small">✕</button>
        </div>
      </div>
      <div class="batch-footer">
        <div class="batch-options" style="margin-bottom: 10px;">
          <label style="font-size: 13px; color: #666; display: block; margin-bottom: 4px;">生成模式:</label>
          <select v-model="batchMode" style="width: 100%; padding: 4px; font-size: 13px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="code_data">仅代码和数据</option>
            <option value="code_data_report">代码、数据和报告</option>
            <option value="report_only">仅解题报告</option>
          </select>
        </div>
        <button @click="runBatch" :disabled="isBatchRunning" class="btn-batch-run">
          {{ isBatchRunning ? '正在处理...' : '批量生成' }}
        </button>
        <button @click="downloadBatch" :disabled="isBatchRunning || !hasCompletedTasks" class="btn-batch-download">
          批量下载
        </button>
      </div>
    </div>

    <!-- 左侧输入区域，仅题目描述和手动代码 -->
    <div class="input-panel new-input-panel">
      <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h3>题目描述</h3>
      </div>

      <!-- URL 获取题目 -->
      <div class="url-fetch-section">
        <div class="url-fetch-bar">
          <input
            v-model="fetchUrl"
            class="url-fetch-input"
            placeholder="从 URL 获取题目：AtCoder / Codeforces / 洛谷"
            @keydown.enter="fetchFromUrl"
            :disabled="isFetchingUrl"
          />
          <button class="btn-fetch" @click="fetchFromUrl" :disabled="isFetchingUrl || !fetchUrl.trim()">
            {{ isFetchingUrl ? '获取中...' : '获取' }}
          </button>
        </div>
        <div v-if="fetchUrlError" class="fetch-error">❌ {{ fetchUrlError }}</div>
        <div v-if="isFetchingUrl && fetchProgress" class="fetch-error" style="color:#4f46e5">⏳ {{ fetchProgress }}</div>
      </div>

      <textarea 
        v-model="problemText" 
        placeholder="请输入完整的题目描述，包括题意、输入格式、输出格式、数据范围等..."
        class="problem-input"
        style="flex: 2;"
      ></textarea>

      <div class="panel-header" style="margin-top:10px;">
        <h3>参考思路 (可选)</h3>
      </div>
      <textarea 
        v-model="referenceText" 
        placeholder="在此输入解题思路、算法提示或参考文本，AI 将参考此内容生成代码..."
        class="reference-input"
        style="flex: 1; min-height: 80px; border: 1px solid #ddd; border-radius: 4px; padding: 8px; resize: none; font-family: inherit;"
      ></textarea>

      <div class="panel-header" style="margin-top:10px; display:flex; justify-content:space-between;">
        <h3>手动 AC 代码 (可选)</h3>
        <button @click="clearManualCode" class="btn-small-clear">清空</button>
      </div>
      <textarea 
        v-model="manualCode" 
        placeholder="在此输入标准 AC 代码。如果提供，将直接使用此代码生成数据和报告..."
        class="manual-code-input"
        style="flex: 1; min-height: 100px;"
      ></textarea>

          <div class="input-actions-bar">
            <button @click="generateAll" :disabled="isGenerating || isBatchRunning" class="btn-success" style="background: linear-gradient(90deg,#667eea,#764ba2);">{{ isGenerating ? '生成中...' : '一键生成全部' }}</button>
            <div 
              :class="['btn-translate', {disabled: isTranslating || isGenerating === 'all' || isBatchRunning || !problemText.trim()}]"
              @click="!(isTranslating || isGenerating === 'all' || isBatchRunning || !problemText.trim()) && autoTranslate()"
              style="display:inline-block; text-align:center;"
            >
              {{ isTranslating ? '翻译中...' : '生成翻译' }}
            </div>
            <button @click="generateCode" :disabled="isGenerating === 'code' || isGenerating === 'all' || isBatchRunning" class="btn-primary">{{ isGenerating === 'code' ? '生成中...' : '生成题解代码' }}</button>
            <button @click="generateData" :disabled="isGenerating === 'data' || isGenerating === 'all' || isBatchRunning" class="btn-secondary">{{ isGenerating === 'data' ? '生成中...' : '生成数据脚本' }}</button>
            <button @click="goToReport" :disabled="!problemText.trim() || isBatchRunning || isGenerating === 'all' || isGeneratingReport" class="btn-info" style="background: linear-gradient(90deg, #17a2b8, #138496); color: white;">{{ isGeneratingReport ? '生成中...' : '生成解题报告' }}</button>
            <button @click="runAndDownload" :disabled="isGenerating || isBatchRunning || !(manualCode || codeOutput) || !dataOutput" class="btn-success">下载完整项目包</button>
            <button @click="clearAll" :disabled="isBatchRunning" class="btn-clear">清空</button>
          </div>
    </div>

    <div class="resizer" @mousedown="startResize"></div>

    <!-- 右侧分栏输出区域 -->
    <div class="output-panel new-output-panel">
      <div class="problem-meta-display">
        <div class="meta-row" style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
           <input 
             v-if="problemMeta" 
             v-model="problemMeta.title" 
             class="meta-title-input" 
             placeholder="题目标题"
             style="flex:1; font-size:16px; font-weight:bold; padding:4px 8px; border:1px solid #ddd; border-radius:4px;"
           />
           <div v-else style="flex:1; color:#888; font-style:italic;">暂无标题信息</div>
           
           <button 
             @click="generateTitle" 
             :disabled="isGeneratingTitle || !problemText" 
             class="btn-small" 
             style="white-space:nowrap;"
             title="AI 自动总结标题"
           >
             {{ isGeneratingTitle ? '生成中...' : '✨ 总结标题' }}
           </button>
        </div>
        <div class="meta-tags" v-if="problemMeta && problemMeta.tags && problemMeta.tags.length">
          <span v-for="tag in problemMeta.tags" :key="tag" class="meta-tag">{{ tag }}</span>
        </div>
      </div>
      
      <!-- 生成进度状态显示 -->
      <div v-if="generationStatus || showStepIndicators" class="generation-status-bar" style="background:#e6f7ff; border:1px solid #91d5ff; padding:8px 12px; margin-bottom:8px; border-radius:4px; color:#0050b3; font-size:14px; display:flex; flex-direction:column; gap:8px;">
        <div v-if="generationStatus" style="display:flex; align-items:center;">
            <span class="loading-spinner" v-if="isGenerating || isTranslating || isGeneratingReport || isGeneratingTitle" style="margin-right:8px;">⏳</span>
            {{ generationStatus }}
        </div>
        
        <!-- 5步进度指示器 -->
        <div v-if="showStepIndicators" class="generation-steps">
           <div class="step-item" :class="generationSteps.translate">
              <div class="step-dot"></div>
              <span>翻译</span>
           </div>
           <div class="step-item" :class="generationSteps.solution">
              <div class="step-dot"></div>
              <span>题解</span>
           </div>
           <div class="step-item" :class="generationSteps.report">
              <div class="step-dot"></div>
              <span>报告</span>
           </div>
           <div class="step-item" :class="generationSteps.data">
              <div class="step-dot"></div>
              <span>数据</span>
           </div>
           <div class="step-item" :class="generationSteps.meta">
              <div class="step-dot"></div>
              <span>元数据</span>
           </div>
        </div>
      </div>

      <div class="output-tabs">
        <button :class="['tab-btn', {active: activeTab === 'translate'}]" @click="activeTab = 'translate'">🌐 翻译内容</button>
        <button :class="['tab-btn', {active: activeTab === 'code'}]" @click="activeTab = 'code'">📝 解题代码</button>
        <button :class="['tab-btn', {active: activeTab === 'pure_code'}]" @click="activeTab = 'pure_code'">💻 纯净代码</button>
        <button :class="['tab-btn', {active: activeTab === 'data'}]" @click="activeTab = 'data'">📊 数据脚本</button>
        <button :class="['tab-btn', {active: activeTab === 'report'}]" @click="activeTab = 'report'">📽️ 解题报告</button>
      </div>
      <div class="output-tab-content">
        <div v-show="activeTab === 'translate'" class="output-block">
          <div class="output-block-header">🌐 翻译内容
            <button @click="copyTranslation" :disabled="!translationText" class="btn-small" style="float:right;">📋 复制翻译</button>
            <button @click="downloadTranslation" :disabled="!translationText" class="btn-download" style="float:right; margin-right:8px;">💾 下载</button>
          </div>
          <div v-if="translationText" class="translation-preview">
            <MarkdownViewer :content="translationText" class="translation-content" />
          </div>
          <div v-else class="translation-preview-empty">暂无翻译内容</div>
        </div>
        <div v-show="activeTab === 'code'" class="output-block">
          <div class="output-block-header">📝 解题代码
            <button @click="copyPureCode" class="btn-small" style="float:right;">📋 复制代码</button>
            <button @click="copyCode" class="btn-small" style="float:right; margin-right:8px;">📋 全部</button>
            <button @click="saveCode" class="btn-small" style="float:right; margin-right:8px;">💾 保存</button>
          </div>
          <div class="rendered-output" v-if="manualCode || codeOutput">
            <MarkdownViewer :content="displayCode" />
          </div>
          <div v-else class="translation-preview-empty">暂无解题代码</div>
        </div>
        <div v-show="activeTab === 'pure_code'" class="output-block">
          <div class="output-block-header">💻 纯净代码
            <button @click="copyPureCode" :disabled="!pureAcCode" class="btn-small" style="float:right;">📋 复制</button>
          </div>
          <div class="rendered-output" v-if="pureAcCode">
            <MarkdownViewer :content="formattedPureCode" />
          </div>
          <div v-else class="translation-preview-empty">暂无提取到的代码</div>
        </div>
        <div v-show="activeTab === 'data'" class="output-block">
          <div class="output-block-header">📊 数据脚本
            <button @click="copyDataCode" class="btn-small" style="float:right;">📋 复制代码</button>
            <button @click="copyData" class="btn-small" style="float:right; margin-right:8px;">📋 全部</button>
            <button @click="saveData" class="btn-small" style="float:right; margin-right:8px;">💾 保存</button>
          </div>
          <div class="rendered-output" v-if="dataOutput">
            <MarkdownViewer :content="dataOutput" />
          </div>
          <div v-else class="translation-preview-empty">暂无数据脚本</div>
        </div>
        <div v-show="activeTab === 'report'" class="output-block">
          <div class="output-block-header">📽️ 解题报告
            <button @click="generateReportInline" :disabled="isGeneratingReport" class="btn-small" style="float:right;">⚡ 生成报告</button>
            <button @click="openReportNewWindow" :disabled="!reportHtml" class="btn-small" style="float:right; margin-right:8px;">↗️ 新窗口</button>
            <button @click="downloadReport" :disabled="!reportHtml" class="btn-small" style="float:right; margin-right:8px;">💾 下载</button>
          </div>
          <div v-if="reportHtml" class="report-preview" style="height: 100%; width: 100%;">
            <iframe :srcdoc="reportHtml" style="width:100%; height:100%; border:none;" :style="{ 'pointer-events': isDragging ? 'none' : 'auto' }"></iframe>
          </div>
          <div v-else class="translation-preview-empty">暂无解题报告，请点击右上角生成</div>
        </div>
      </div>
      <div class="output-actions-bar">
        <!-- 操作按钮已移至左侧 -->
      </div>
    </div>
  </div>
</div>
</template>

<script>
import { nextTick } from 'vue'
import request from '../utils/request'
import { getModels } from '../utils/models'

export default {
  name: 'SolveData',
  inject: ['showToastMessage'],
  data() {
    return {
      leftWidth: 40,
      isDragging: false,
      problemText: '',
      codeOutput: '',
      dataOutput: '',
      selectedModel: 'o4-mini',
      models: [],
      language: 'C++',
      isGenerating: false,
      generationStatus: '', // 用于显示详细的生成进度
      isGeneratingTitle: false,
      isGeneratingReport: false,
      activeTab: 'code',
      manualCode: '',
      referenceText: '',
      isTranslating: false,
      translationText: '',
      isTranslationStale: false, // 标记翻译是否过期
      problemMeta: null,
      reportHtml: '',

      // URL 抓取相关
      fetchUrl: '',
      isFetchingUrl: false,
      contestProblems: [],
      selectedContestProblemIdx: '',
      fetchUrlError: '',
      fetchProgress: ''
      
      // 批量模式相关数据
      isBatchMode: true,
      isBatchRunning: false,
      batchMode: 'code_data', // code_data, code_data_report, report_only
      showBatchImport: false,
      batchImportText: '',
      currentTaskIndex: 0,
      
      // 进度条状态
      showStepIndicators: false,
      generationSteps: {
        translate: 'pending', // pending, processing, success, failed
        solution: 'pending',
        report: 'pending',
        data: 'pending',
        meta: 'pending'
      },
      
      tasks: [
        {
          id: Date.now(),
          status: 'pending', // pending, processing, completed, failed
          problemText: '',
          manualCode: '',
          codeOutput: '',
          dataOutput: '',
          translationText: '',
          problemMeta: null,
          reportHtml: ''
        }
      ]
    }
  },
  mounted() {
    // 动态加载后端提供的模型列表
    this.loadModels()
    
    // 尝试从 localStorage 恢复任务列表
    try {
      const savedTasks = localStorage.getItem('solve_data_tasks')
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks)
        if (this.tasks.length > 0) {
          this.loadTask(0)
        }
      }
    } catch (e) { console.error('Failed to load tasks', e) }
  },
  watch: {
    // 监听当前任务数据的变化，同步到 tasks 数组
    problemText(val) { 
      this.updateCurrentTask('problemText', val)
      if (!val || !val.trim()) {
        this.problemMeta = null
      } else {
        // 如果题目内容发生变化，标记翻译为过期
        // 这样下次点击"一键生成"时，会重新触发翻译
        this.isTranslationStale = true
      }
    },
    manualCode(val) { this.updateCurrentTask('manualCode', val) },
    referenceText(val) { this.updateCurrentTask('referenceText', val) },
    codeOutput(val) { this.updateCurrentTask('codeOutput', val) },
    dataOutput(val) { this.updateCurrentTask('dataOutput', val) },
    translationText(val) { this.updateCurrentTask('translationText', val) },
    reportHtml(val) { this.updateCurrentTask('reportHtml', val) },
    problemMeta: {
      handler(val) { this.updateCurrentTask('problemMeta', val) },
      deep: true
    },
    tasks: {
      handler(val) {
        localStorage.setItem('solve_data_tasks', JSON.stringify(val))
      },
      deep: true
    }
  },
  computed: {
    displayCode() {
      if (this.codeOutput && this.codeOutput.trim()) {
        // 移除 <!-- AC_CODE --> 标记，避免在界面上显示
        return this.codeOutput.replace(/<!--\s*AC_CODE\s*-->/g, '')
      }
      if (this.manualCode && this.manualCode.trim()) {
        return '```\n' + this.manualCode + '\n```'
      }
      return ''
    },
    pureAcCode() {
      if (this.codeOutput && this.codeOutput.trim()) {
        return this.extractPureCode(this.codeOutput)
      }
      if (this.manualCode && this.manualCode.trim()) {
        // 也对 manualCode 进行提取，以防用户粘贴了包含 Markdown 格式的代码
        const extracted = this.extractPureCode(this.manualCode)
        return extracted || this.manualCode.trim()
      }
      return ''
    },
    formattedPureCode() {
      const lang = this.language === 'C++' ? 'cpp' : 'python'
      return '```' + lang + '\n' + this.pureAcCode + '\n```'
    },
    hasCompletedTasks() {
      return this.tasks.some(t => t.status === 'completed')
    }
  },
  methods: {
    extractCodeFromProblem() {
      if (!this.problemText) return
      
      const codeBlockRegex = /```(?:[\w\+\-]+)?\s*\n([\s\S]*?)```/g
      const matches = [...this.problemText.matchAll(codeBlockRegex)]
      
      if (matches.length > 0) {
        // Find the largest code block
        let bestMatch = matches[0]
        let maxLen = 0
        for (const m of matches) {
          if (m[1].length > maxLen) {
            maxLen = m[1].length
            bestMatch = m
          }
        }
        
        if (maxLen > 20) {
           this.manualCode = bestMatch[1].trim()
           this.showToastMessage('已提取代码到下方输入框')
           return
        }
      }
      this.showToastMessage('未在题目描述中发现明显的代码块')
    },

    extractPureCode(content) {
      if (!content) return ''
      
      let code = ''
      
      // 顶级优先：寻找 <!-- AC_CODE --> 标记
      const markerIndex = content.indexOf('<!-- AC_CODE -->')
      if (markerIndex !== -1) {
         const afterMarker = content.substring(markerIndex)
         const codePatterns = [
            /```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/i,
            /```(?:python|py)\s*\n([\s\S]*?)```/i,
            /```java\s*\n([\s\S]*?)```/i,
            /```\s*\n([\s\S]*?)```/
         ]
         for (const pattern of codePatterns) {
            const match = afterMarker.match(pattern)
            if (match && match[1]) {
                code = match[1].trim()
                break
            }
         }
      }

      if (!code) {
          // 其次：优先寻找 "代码实现"、"完整代码"、"AC代码" 等部分后的代码块
          const sectionTitles = ['## 代码实现', '## 完整代码', '## AC代码', '## 参考代码', '## 标准代码', '### 代码实现', '### 完整代码']
          for (const title of sectionTitles) {
              const codeSectionIndex = content.indexOf(title)
              if (codeSectionIndex !== -1) {
                 const afterSection = content.substring(codeSectionIndex)
                 const codePatterns = [
                    /```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/i,
                    /```(?:python|py)\s*\n([\s\S]*?)```/i,
                    /```java\s*\n([\s\S]*?)```/i,
                    /```\s*\n([\s\S]*?)```/
                 ]
                 for (const pattern of codePatterns) {
                    const match = afterSection.match(pattern)
                    if (match && match[1]) {
                        code = match[1].trim()
                        break
                    }
                 }
                 if (code) break
              }
          }
      }
      
      if (!code) {
          // 兜底：通用匹配，选择最长的代码块（避免提取到示例代码）
          const codePatterns = [
            /```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/ig,
            /```(?:python|py)\s*\n([\s\S]*?)```/ig,
            /```java\s*\n([\s\S]*?)```/ig,
            /```\s*\n([\s\S]*?)```/g
          ]
          
          let allMatches = []
          for (const pattern of codePatterns) {
            const matches = [...content.matchAll(pattern)]
            if (matches.length > 0) {
              allMatches = matches
              break
            }
          }
          
          // 选择最长的代码块
          if (allMatches.length > 0) {
            let longestMatch = allMatches[0]
            let maxLength = allMatches[0][1].trim().length
            for (const match of allMatches) {
              const currentLength = match[1].trim().length
              if (currentLength > maxLength) {
                maxLength = currentLength
                longestMatch = match
              }
            }
            code = longestMatch[1].trim()
          }
      }
      
      // 如果没有 Markdown 标记且不为空，视为纯代码
      if (!code && content.trim() && !content.includes('```')) {
         code = content.trim()
      }
      
      // 统一清理逻辑
      if (code) {
          // 移除 <!-- AC_CODE -->
          code = code.replace(/<!--\s*AC_CODE\s*-->/g, '').trim()
          
          // 移除开头的语言标识（只处理单独一行的情况，避免误删变量名）
          // 匹配：行首 + 语言标识 + 行尾，然后是换行符
          const lines = code.split('\n')
          if (lines.length > 0 && /^(c\+\+|cpp|python|py|java|javascript|js)$/i.test(lines[0].trim())) {
              code = lines.slice(1).join('\n').trim()
          }
          
          return code
      }
      
      return ''
    },

    cleanDataOutput(content) {
        if (!content) return ''
        // 移除 <!-- AC_CODE -->
        let cleaned = content.replace(/<!--\s*AC_CODE\s*-->/g, '').trim()
        
        // 检查是否是 Markdown 代码块（```python 或 ```py）
        const codeBlockMatch = cleaned.match(/^```(python|py)?\s*\n([\s\S]*?)```$/)
        if (codeBlockMatch) {
            // 提取代码块内容
            let codeContent = codeBlockMatch[2]
            const lang = codeBlockMatch[1] || 'python'
            
            // 移除代码块内部第一行的语言标识（如果存在）
            const lines = codeContent.split('\n')
            if (lines.length > 0 && /^(python|py)$/i.test(lines[0].trim())) {
                codeContent = lines.slice(1).join('\n')
            }
            
            // 重新包装为干净的代码块
            return '```' + lang + '\n' + codeContent.trim() + '\n```'
        }
        
        // 非标准代码块格式，尝试清理前缀
        if (cleaned.startsWith('```')) {
            const firstLineEnd = cleaned.indexOf('\n')
            if (firstLineEnd !== -1) {
                const firstLine = cleaned.substring(0, firstLineEnd).trim()
                let rest = cleaned.substring(firstLineEnd + 1)
                
                // 移除内容第一行的语言标识
                const restLines = rest.split('\n')
                if (restLines.length > 0 && /^(python|py)$/i.test(restLines[0].trim())) {
                    rest = restLines.slice(1).join('\n')
                }
                
                return firstLine + '\n' + rest
            }
        }
        
        // 纯文本情况：移除开头的独立语言标识行
        const lines = cleaned.split('\n')
        if (lines.length > 0 && /^(python|py)$/i.test(lines[0].trim())) {
            cleaned = lines.slice(1).join('\n').trim()
        }
        
        return cleaned
    },

    // --- 统一的辅助函数 ---

    // 智能获取标题
    getSmartTitle(meta, text, id) {
      let title = `task_${id}`
      if (meta && meta.title && meta.title !== '题目标题') {
        title = meta.title
      } else {
        const src = (text || '').trim()
        const lines = src.split('\n').map(s => s.trim()).filter(Boolean)
        const badKeywords = /(题目背景|题面背景|题目描述|题面描述|背景|说明|介绍|题目标题)/
        const stripMd = (s) => s.replace(/^#{1,6}\s*/, '')
        
        for (let j = 0; j < lines.length; j++) {
          const m = lines[j].match(/^#{1,3}\s*(.+)$/)
          if (m) {
            const t = stripMd(m[1]).trim()
            if (t && !badKeywords.test(t)) { title = t; break; }
          }
        }
        if (title === `task_${id}`) {
            for (let j = 0; j < lines.length; j++) {
              const t = stripMd(lines[j]).trim()
              if (!t) continue
              if (/^(输入|输出|数据范围|样例|说明)/.test(t)) continue
              if (badKeywords.test(t)) continue
              const cleaned = t.replace(/^[-*\s]+/, '')
              if (cleaned) { title = cleaned; break; }
            }
        }
      }
      return title.replace(/[\\/:*?"<>|]/g, '_').trim() || `task_${id}`
    },

    // 获取最佳代码内容 (整合了 manualCode 的启发式检测)
    getBestCodeContent(codeOutput, manualCode) {
      // 1. 优先使用 codeOutput
      if (codeOutput && codeOutput.trim()) {
        // 尝试提取纯代码
        const extracted = this.extractPureCode(codeOutput)
        if (extracted) return extracted
        // 如果提取失败但有内容，可能就是纯代码
        return codeOutput
      }

      // 2. 使用 manualCode
      if (manualCode && manualCode.trim()) {
        const manualContent = manualCode.trim()
        
        // 如果包含 markdown，尝试提取
        if (manualContent.includes('```')) {
           const extracted = this.extractPureCode(manualContent)
           if (extracted) return extracted
        }

        // 启发式检测是否为纯代码
        const strongCodeStart = /^\s*(#include|package|import|using|public\s+class|class\s+\w+|def\s+\w+)/m
        const textKeywords = ['思路', '解法', '复杂度', '算法', 'Solution', 'Approach', 'Complexity', '首先', '然后', '考え方', '説明', 'コード', '回答']
        const hasTextKeywords = textKeywords.some(k => manualContent.includes(k))
        
        let looksLikeCode = false
        if (hasTextKeywords) {
            looksLikeCode = false
        } else if (strongCodeStart.test(manualContent)) {
            looksLikeCode = true
        } else {
            const symbolCount = (manualContent.match(/[;{}=\[\]]/g) || []).length
            const lineCount = manualContent.split('\n').length
            if (symbolCount / lineCount > 0.8) {
               looksLikeCode = true
            }
        }
        
        if (looksLikeCode) {
           return manualContent
        }
        
        // 最后的尝试：如果 manualCode 不像代码，但也没有其他选择，还是尝试提取一下
        const extracted = this.extractPureCode(manualContent)
        if (extracted) return extracted
      }
      
      return ''
    },

    // 处理数据生成脚本
    processDataScript(scriptContent, language) {
      if (!scriptContent) return ''
      
      let script = ''
      // 提取脚本
      const scriptPatterns = [
        /```python\s*\n([\s\S]*?)```/i,
        /```python([\s\S]*?)```/i,
        /```py\s*\n([\s\S]*?)```/i,
        /```py([\s\S]*?)```/i,
        /```\s*\n([\s\S]*?)```/
      ]
      
      for (const pattern of scriptPatterns) {
        const match = scriptContent.match(pattern)
        if (match && match[1]) {
          script = match[1].trim()
          script = script.replace(/^(?:python|py)\s+/i, '')
          script = script.replace(/^#!\/usr\/bin\/env python[0-9]?\s*\n/, '')
          break
        }
      }
      
      // 如果没匹配到 markdown，假设整体就是脚本
      if (!script && scriptContent.trim()) {
         script = scriptContent.trim()
      }

      // 清理 Markdown 说明
      if (script) {
        const lines = script.split('\n')
        let cleanedLines = []
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const trimmed = line.trim()
          if (!trimmed.startsWith('#') && !trimmed.startsWith('"""') && !trimmed.startsWith("'''")) {
            if (/^##\s+/.test(trimmed) || /^\*\*说明[：:]\*\*/.test(trimmed)) {
              break
            }
          }
          cleanedLines.push(line)
        }
        script = cleanedLines.join('\n').trim()
      }
      
      // 替换路径和命令
      let modifiedScript = script.replace(/file_prefix\s*=\s*['"].*?['"]/g, `file_prefix='./testdata/data'`)
      
      if (language === 'C++') {
        modifiedScript = modifiedScript.replace(/output_gen\s*\(\s*['"].*?['"]\s*\)/g, `output_gen('std.exe')`)
      } else if (language === 'Python') {
        modifiedScript = modifiedScript.replace(/output_gen\s*\(\s*['"].*?['"]\s*\)/g, `output_gen('python std.py')`)
      } else if (language === 'Java') {
        modifiedScript = modifiedScript.replace(/output_gen\s*\(\s*['"].*?['"]\s*\)/g, `output_gen('java Main')`)
      }
      
      return modifiedScript
    },

    // 检测语言
    detectLanguage(codeOutput) {
        if (!codeOutput) return { ext: 'cpp', lang: 'C++' }
        if (codeOutput.includes('```python') || codeOutput.includes('```py')) {
            return { ext: 'py', lang: 'Python' }
        }
        if (codeOutput.includes('```java')) {
            return { ext: 'java', lang: 'Java' }
        }
        return { ext: 'cpp', lang: 'C++' }
    },

    // --- 批量模式方法 ---
    toggleBatchMode() {
      this.isBatchMode = !this.isBatchMode
      // 如果进入批量模式且没有任务，确保有一个空任务
      if (this.isBatchMode && this.tasks.length === 0) {
        this.addNewTask()
      }
    },
    
    addNewTask() {
      const newTask = {
        id: Date.now(),
        status: 'pending',
        problemText: '',
        manualCode: '',
        referenceText: '',
        codeOutput: '',
        dataOutput: '',
        translationText: '',
        problemMeta: null,
        reportHtml: ''
      }
      this.tasks.push(newTask)
      this.switchTask(this.tasks.length - 1)
    },
    
    removeTask(index) {
      if (this.tasks.length <= 1) {
        // 如果只剩一个，清空内容而不是删除
        this.tasks[0] = { ...this.tasks[0], problemText: '', manualCode: '', referenceText: '', status: 'pending', codeOutput: '', dataOutput: '', translationText: '' }
        this.loadTask(0)
        return
      }
      
      this.tasks.splice(index, 1)
      if (this.currentTaskIndex >= this.tasks.length) {
        this.switchTask(this.tasks.length - 1)
      } else if (index === this.currentTaskIndex) {
        this.loadTask(this.currentTaskIndex)
      } else if (index < this.currentTaskIndex) {
        this.currentTaskIndex--
      }
    },
    
    switchTask(index) {
      if (index === this.currentTaskIndex) return
      this.currentTaskIndex = index
      this.loadTask(index)
    },
    
    loadTask(index) {
      const task = this.tasks[index]
      if (!task) return
      
      // 暂停 watcher 以免触发 updateCurrentTask
      // 但由于 Vue 2/3 响应式机制，直接赋值会触发 watcher
      // 我们在 updateCurrentTask 中检查是否一致来避免死循环，或者接受这次冗余更新
      this.problemText = task.problemText || ''
      this.manualCode = task.manualCode || ''
      this.referenceText = task.referenceText || ''
      this.codeOutput = task.codeOutput || ''
      this.dataOutput = task.dataOutput || ''
      this.translationText = task.translationText || ''
      this.problemMeta = task.problemMeta || null
      this.reportHtml = task.reportHtml || ''
    },
    
    updateCurrentTask(field, value) {
      if (this.tasks[this.currentTaskIndex]) {
        this.tasks[this.currentTaskIndex][field] = value
        // 如果修改了输入，重置状态为 pending (除非正在运行)
        if ((field === 'problemText' || field === 'manualCode' || field === 'referenceText') && 
            this.tasks[this.currentTaskIndex].status === 'completed' && 
            !this.isBatchRunning) {
          this.tasks[this.currentTaskIndex].status = 'pending'
        }
      }
    },
    
    getTaskTitle(task) {
      if (task.problemMeta && task.problemMeta.title && task.problemMeta.title !== '题目标题') return task.problemMeta.title
      if (task.problemText) {
        const lines = task.problemText.split('\n').filter(l => l.trim())
        if (lines.length > 0) return lines[0].slice(0, 20) + (lines[0].length > 20 ? '...' : '')
      }
      return '新任务 ' + new Date(task.id).toLocaleTimeString()
    },
    
    getTaskStatusText(task) {
      const map = {
        'pending': '等待中',
        'processing': '处理中...',
        'completed': '已完成',
        'failed': '失败'
      }
      return map[task.status] || '未知'
    },
    
    async runBatch() {
      if (this.isBatchRunning) return
      
      const pendingTasks = this.tasks.map((t, i) => ({t, i})).filter(item => item.t.status === 'pending' || item.t.status === 'failed')
      
      if (pendingTasks.length === 0) {
        this.showToastMessage('没有待处理的任务')
        return
      }
      
      this.isBatchRunning = true
      
      for (const item of pendingTasks) {
        const { i } = item
        this.switchTask(i)
        
        // 标记为处理中
        this.tasks[i].status = 'processing'
        
        try {
          // 根据模式选择执行逻辑
          if (this.batchMode === 'report_only') {
             // 仅生成报告模式：跳过 generateAll，直接生成报告
             // 注意：如果需要元数据（标题），可能需要单独请求，或者依赖报告生成时的逻辑
             // 这里我们尝试先生成元数据（如果缺失），以便下载时有正确的文件名
             if (!this.problemMeta || !this.problemMeta.title) {
                try {
                  const metaRes = await request('/api/generate-problem-meta', {
                    method: 'POST',
                    body: JSON.stringify({
                      text: this.problemText,
                      model: this.selectedModel
                    })
                  })
                  if (metaRes) this.problemMeta = metaRes
                } catch (e) { console.warn('Meta generation failed in report-only mode', e) }
             }
             
             await this.generateReportForBatch(i)
          } else {
             // 标准模式：生成代码、数据、翻译
             // generateAll 内部会根据 batchMode 决定是否生成报告，所以这里不需要再次调用
             const success = await this.generateAll()
             if (!success) throw new Error('Generation failed')
          }
          
          this.tasks[i].status = 'completed'
        } catch (e) {
          console.error(`Task ${i} failed:`, e)
          this.tasks[i].status = 'failed'
        }
        
        // 简单的延时，避免请求过快
        await new Promise(r => setTimeout(r, 1000))
      }
      
      this.isBatchRunning = false
      this.showToastMessage('批量任务处理完成！')
    },
    
    async generateReportForBatch(index) {
      const task = this.tasks[index]
      if (!task.problemText) return
      
      try {
        // 使用与单个生成相同的完整逻辑
        let codeContent = (task.codeOutput && task.codeOutput.trim()) ? task.codeOutput : task.manualCode;
        let pureCode = '';
        let solutionPlan = '';
        
        // 检查是否为 AI 生成的完整 Markdown 题解
        const isMarkdownSolution = codeContent && (
          codeContent.includes('## 算法思路') || 
          codeContent.includes('## 代码实现') || 
          codeContent.includes('**算法思路**')
        );

        if (isMarkdownSolution) {
          solutionPlan = codeContent;
          // 使用统一的代码提取逻辑
          pureCode = this.extractPureCode(codeContent) || '';
        } else if (codeContent) {
          // 使用统一的代码提取函数
          pureCode = this.extractPureCode(codeContent) || codeContent;
        } else {
          pureCode = "用户未提供代码，请根据题目描述生成标准 AC 代码，并添加详细中文注释。";
        }
        
        const res = await request.post('/api/solution-report', {
          problem: task.translationText || task.problemText,
          code: pureCode,
          solutionPlan: solutionPlan,  // ✅ 传递完整题解
          model: this.selectedModel,
          language: this.language
        })
        
        if (res.html) {
          this.tasks[index].reportHtml = res.html
        }
      } catch (e) {
        console.error('Batch report generation failed', e)
      }
    },
    
    async downloadBatch() {
      const completedTasks = this.tasks.filter(t => t.status === 'completed')
      if (completedTasks.length === 0) {
        this.showToastMessage('没有已完成的任务可下载')
        return
      }
      
      try {
        let JSZip
        try {
          const module = await import('jszip')
          JSZip = module.default || module
        } catch (e) {
          console.error('Failed to load JSZip', e)
          this.showToastMessage('下载组件加载失败')
          return
        }
        
        const masterZip = new JSZip()
        // 修正 ZIP 文件时间戳为东八区 (UTC+8)
        // 使用 toLocaleString 获取北京时间的本地表示，确保无论客户端时区如何，Date 对象的本地时间组件都等于北京时间
        const now = new Date()
        const beijingString = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
        const targetTime = new Date(beijingString)
        const zipOptions = { date: targetTime }
        
        for (let i = 0; i < completedTasks.length; i++) {
          const task = completedTasks[i]
          // 智能提取标题
          const title = this.getSmartTitle(task.problemMeta, task.translationText || task.problemText, task.id)
          
          // 添加序号前缀 (01, 02, ...)
          const prefix = String(i + 1).padStart(2, '0')
          const folderName = `${prefix}_${title}`
          const folder = masterZip.folder(folderName)
          
          // 1. 提取代码
          // 简单的语言检测 (优先检查 codeOutput 中的标记)
          const { ext, lang } = this.detectLanguage(task.codeOutput)
          
          const contentToSave = this.getBestCodeContent(task.codeOutput, task.manualCode)
          
          const stdFileName = lang === 'Java' ? 'Main.java' : `std.${ext}`
          folder.file(stdFileName, contentToSave, zipOptions)
          
          // 2. 添加数据生成脚本
          const script = this.processDataScript(task.dataOutput, lang)
          if (script) {
            folder.file('data_generator.py', script, zipOptions)
          }
          
          // 3. 添加题目描述
          folder.file('problem.md', task.problemText, zipOptions)
          if (task.translationText) folder.file('problem_zh.md', task.translationText, zipOptions)
          
          // 4. 添加解题报告
          if (task.reportHtml) {
            const reportName = `${title}.html`
            folder.file(reportName, task.reportHtml, zipOptions)
          }
          
          // 5. 添加 problem.yaml (使用完整生成逻辑)
          const yamlContent = this.generateProblemYaml(task.problemMeta, task.problemText, task.translationText)
          folder.file('problem.yaml', yamlContent, zipOptions)
          
          // 6. 添加运行脚本
          folder.file('run.py', this.generateRunScript(lang), zipOptions)
          folder.file('run.bat', this.generateBatScript(lang), zipOptions)

          // 7. 添加 solution.md (原始代码输出)
          if (task.codeOutput && task.codeOutput.trim()) {
            folder.file('solution.md', task.codeOutput, zipOptions)
          }
        }

        // 添加批量运行脚本 (包含运行任务和提取报告)
        const runAllBat = `@echo off
chcp 65001
title Batch Runner & Report Extractor

echo ==========================================
echo      1. Running All Tasks
echo ==========================================
echo.

for /d %%D in (*) do (
    if exist "%%D\\run.py" (
        if exist "%%D\\data_generator.py" (
            echo ------------------------------------------
            echo Running in: %%D
            echo ------------------------------------------
            pushd "%%D"
            python run.py
            popd
            echo.
        ) else (
            echo ------------------------------------------
            echo Skipping %%D (No data_generator.py)
            echo ------------------------------------------
        )
    )
)

echo.
echo ==========================================
echo      2. Extracting HTML Reports
echo ==========================================
echo.

for /d %%D in (*) do (
    if exist "%%D\\*.html" (
        pushd "%%D"
        for %%F in (*.html) do (
            echo Extracting: %%D\\%%F -^> %%D.html
            copy "%%F" "..\\%%D.html" >nul
        )
        popd
    )
)

echo.
echo ==========================================
echo      All Operations Completed
echo ==========================================
pause
`
        masterZip.file('run_all_tasks.bat', runAllBat, zipOptions)
        
        const blob = await masterZip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // 生成带用户名和时间戳的文件名
        let username = 'user'
        try {
          const userInfoStr = localStorage.getItem('user_info')
          if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr)
            if (userInfo && (userInfo.uname || userInfo.username)) {
              username = userInfo.uname || userInfo.username
            }
          }
        } catch (e) { console.warn('Failed to get username', e) }
        
        const taskCount = completedTasks.length
        // 使用之前计算的 targetTime (北京时间) 作为文件名时间戳
        const downloadTime = targetTime
        const dateStr = downloadTime.getFullYear() +
          String(downloadTime.getMonth() + 1).padStart(2, '0') +
          String(downloadTime.getDate()).padStart(2, '0') + '_' +
          String(downloadTime.getHours()).padStart(2, '0') +
          String(downloadTime.getMinutes()).padStart(2, '0') +
          String(downloadTime.getSeconds()).padStart(2, '0')
          
        const zipName = `batch_export_${username}_${taskCount}tasks_${dateStr}.zip`
        
        a.download = zipName
        document.body.appendChild(a) // Firefox requires appending to body
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // 静默发送邮件：将 zip 转为 base64 并调用后端
        try {
          const base64 = await (async () => {
            const reader = new FileReader()
            const p = new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result)
              reader.onerror = reject
            })
            reader.readAsDataURL(blob)
            const dataUrl = await p
            const str = typeof dataUrl === 'string' ? dataUrl : ''
            const commaIdx = str.indexOf(',')
            return commaIdx >= 0 ? str.substring(commaIdx + 1) : str
          })()

          const filename = zipName
          const subject = `SolveData 批量导出: ${zipName}`

          fetch('/api/send-package', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
            },
            body: JSON.stringify({ filename, contentBase64: base64, subject })
          })
          .then(async res => {
            if (!res.ok) {
              const err = await res.json();
              console.warn('邮件发送失败:', err);
            } else {
                this.showToastMessage('✅ 批量导出成功');
            }
          })
          .catch(e => console.error('邮件请求错误:', e))
        } catch (e) {
          console.error('邮件准备失败:', e);
        }
      } catch (e) {
        console.error('Batch download failed', e)
        this.showToastMessage('批量下载失败: ' + e.message)
      }
    },

    startResize(e) {
      if (e) e.preventDefault()
      this.isDragging = true
      document.addEventListener('mousemove', this.onMouseMove)
      document.addEventListener('mouseup', this.stopResize)
      document.body.style.userSelect = 'none'
    },
    onMouseMove(e) {
      if (!this.isDragging) return
      const container = this.$el.querySelector('.main-layout')
      if (!container) return
      
      // 获取容器的样式以计算 padding
      const style = window.getComputedStyle(container)
      const paddingLeft = parseFloat(style.paddingLeft) || 0
      const paddingRight = parseFloat(style.paddingRight) || 0
      
      const rect = container.getBoundingClientRect()
      const contentWidth = rect.width - paddingLeft - paddingRight
      
      let sidebarWidth = 0
      if (this.isBatchMode) {
        const sidebar = this.$el.querySelector('.batch-sidebar')
        if (sidebar) sidebarWidth = sidebar.offsetWidth
      }
      
      // 计算相对于内容区域的鼠标位置
      const mouseX = e.clientX - rect.left - paddingLeft
      
      // 计算新的百分比宽度
      const newWidth = ((mouseX - sidebarWidth) / contentWidth) * 100
      
      // 动态计算最大宽度，保留右侧至少 200px 或 15%
      // 这里的 newWidth 是 input-panel 的宽度百分比
      
      if (newWidth > 15 && newWidth < 85) {
        this.leftWidth = newWidth
      }
    },
    stopResize() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onMouseMove)
      document.removeEventListener('mouseup', this.stopResize)
      document.body.style.userSelect = ''
    },
    async loadModels() {
      try {
        const list = await getModels()
        if (Array.isArray(list) && list.length > 0) {
          this.models = list
          // 如果当前选中的模型不在列表中，则默认选第一个
          const ids = list.map(m => m.id)
          if (!ids.includes(this.selectedModel)) {
            this.selectedModel = list[0].id
          }
        }
      } catch (e) {
        // 加载失败时保持内置备选项
      }
    },

    // ─── URL 抓取题目 ─────────────────────────────────────────────────────────
    async fetchFromUrl() {
      if (!this.fetchUrl.trim()) return
      this.isFetchingUrl = true
      this.fetchUrlError = ''
      this.fetchProgress = ''
      const url = this.fetchUrl.trim()
      try {
        // 先尝试作为比赛链接
        this.fetchProgress = '获取比赛题目列表...'
        const contestData = await request(`/api/atcoder/contest?url=${encodeURIComponent(url)}`)
        const problems = contestData.problems || []
        if (problems.length === 0) throw new Error('比赛中没有找到题目')
        // 都加入任务列表
        let added = 0
        for (const p of problems) {
          this.fetchProgress = `正在获取题目 ${p.label}. ${p.title} (${added + 1}/${problems.length})...`
          try {
            await this.addProblemAsTask(p.url, p.label + '. ' + p.title)
            added++
          } catch { /* 单题失败不阻断 */ }
        }
        this.fetchUrl = ''
        this.fetchProgress = ''
        this.showToastMessage(`✅ 已添加 ${added} 道题目到任务列表`)
      } catch (contestErr) {
        // 试为单题链接
        this.fetchProgress = '获取题目内容...'
        try {
          await this.addProblemAsTask(url)
          this.fetchUrl = ''
          this.fetchProgress = ''
        } catch (e) {
          this.fetchUrlError = e.message || '获取失败，请检查链接是否正确'
          this.fetchProgress = ''
        }
      } finally {
        this.isFetchingUrl = false
      }
    },

    async addProblemAsTask(url, fallbackTitle) {
      const data = await request(`/api/atcoder/problem?url=${encodeURIComponent(url)}`)
      const title = data.title || fallbackTitle || url
      // 如果当前唯一一个任务且是空的，直接填充而不是新增
      const cur = this.tasks[this.currentTaskIndex]
      if (this.tasks.length === 1 && cur && !cur.problemText.trim()) {
        this.tasks[this.currentTaskIndex] = {
          ...cur,
          problemText: data.content || '',
          translationText: '',
          codeOutput: '',
          dataOutput: '',
          problemMeta: { title },
          status: 'pending'
        }
        this.loadTask(this.currentTaskIndex)
        return
      }
      // 否则新增一个任务
      const newTask = {
        id: Date.now() + Math.random(),
        status: 'pending',
        problemText: data.content || '',
        manualCode: '',
        referenceText: '',
        codeOutput: '',
        dataOutput: '',
        translationText: '',
        problemMeta: { title },
        reportHtml: ''
      }
      this.tasks.push(newTask)
      this.switchTask(this.tasks.length - 1)
    },

        async autoTranslate() {
          if (!this.problemText.trim()) return;
          this.isTranslating = true;
          this.generationStatus = '正在自动翻译题目...'
          this.translationText = '';
          try {
            const token = localStorage.getItem('auth_token')
            const headers = { 'Content-Type': 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const response = await fetch('/api/translate/stream', {
              method: 'POST', headers,
              body: JSON.stringify({ text: this.problemText, model: this.selectedModel })
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buf = ''
            let charsReceived = 0
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buf += decoder.decode(value, { stream: true })
              const lines = buf.split('\n'); buf = lines.pop()
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const d = line.slice(6).trim()
                if (!d || d === '[DONE]') continue
                try {
                  const ev = JSON.parse(d)
                  if (ev.type === 'chunk') {
                    charsReceived += ev.text.length
                    this.generationStatus = `正在翻译... 已收到 ${charsReceived} 字`
                  } else if (ev.type === 'result') {
                    this.translationText = ev.result || ''
                    if (ev.meta && (ev.meta.title || (ev.meta.tags && ev.meta.tags.length))) {
                      this.problemMeta = ev.meta
                      console.log('从翻译结果中提取到元数据:', this.problemMeta)
                    }
                    this.isTranslationStale = false
                  } else if (ev.type === 'error') {
                    throw new Error(ev.message)
                  }
                } catch (pe) {
                  if (pe.message && !pe.message.includes('JSON') && !pe.message.includes('Unexpected')) throw pe
                }
              }
            }
            if (this.isGenerating !== 'all' && this.isGenerating !== 'code' && this.isGenerating !== 'data') {
              this.generationStatus = '✅ 翻译完成'
              setTimeout(() => { if (this.generationStatus === '✅ 翻译完成') this.generationStatus = '' }, 3000)
            }
          } catch (e) {
            this.translationText = '请求错误: ' + e.message;
            this.generationStatus = '❌ 翻译失败: ' + e.message
            throw e
          } finally {
            this.isTranslating = false;
          }
        },

        downloadTranslation() {
          if (!this.translationText) return;
          const blob = new Blob([this.translationText], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'problem_zh.md';
          a.click();
          URL.revokeObjectURL(url);
        },
        
        copyTranslation() {
          if (!this.translationText) return;
          navigator.clipboard.writeText(this.translationText).then(() => {
            this.showToastMessage('✅ 已复制翻译到剪贴板');
          });
        },
    
    clearManualCode() {
      this.manualCode = ''
    },
    
    async generateCode() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'code'
      this.generationStatus = '正在生成题解代码...'
      this.codeOutput = ''
      this.activeTab = 'code'
      
      try {
        // 确保有翻译文本，保证后续的元数据基于译文
        if (!(this.translationText && this.translationText.trim())) {
          this.generationStatus = '正在自动翻译题目...'
          await this.autoTranslate()
          this.generationStatus = '翻译完成，正在生成题解代码...'
        }
        
        let requests = []
        
        // 1. 请求生成代码 - 优化 Prompt 构建
        let promptText = this.problemText
        let hasReference = false
        
        // 如果 manualCode 存在，提取纯代码并作为参考
        if (this.manualCode && this.manualCode.trim()) {
             const pureCode = this.extractPureCode(this.manualCode)
             if (pureCode) {
                 promptText += `\n\n【用户提供的参考代码】\n\`\`\`${this.language === 'C++' ? 'cpp' : 'python'}\n${pureCode}\n\`\`\`\n\n`
                 hasReference = true
             }
        }
        
        // 如果 referenceText 存在，则将其加入 Prompt
        if (this.referenceText && this.referenceText.trim()) {
             promptText += `\n\n【解题思路提示】\n${this.referenceText.trim()}\n\n`
             hasReference = true
        }
        
        // 统一添加生成要求
        if (hasReference) {
             promptText += `请基于上述参考内容编写详细的解题教案。要求：\n1. 不要直接复制参考代码，请重新编写一份代码风格优良、注释详尽的标准 AC 代码\n2. 生成完整的 Markdown 格式解题报告（算法分析、代码实现、复杂度分析等）\n3. 代码应具有良好的可读性：变量命名规范、逻辑清晰、适当添加注释\n4. 在代码实现部分前添加 <!-- AC_CODE --> 标记以便提取`
        }

        requests.push(
          request('/api/solution', {
            method: 'POST',
            body: JSON.stringify({
              text: promptText,
              model: this.selectedModel,
              language: this.language
            })
        }).then(res => ({ type: 'code', data: res }))
        )
        
        // 2. 如果元数据尚未生成，则请求生成元数据
        if (!this.problemMeta || !this.problemMeta.title) {
           requests.push(
            request('/api/generate-problem-meta', {
              method: 'POST',
              body: JSON.stringify({
                text: (this.translationText && this.translationText.trim()) ? this.translationText : this.problemText,
                model: this.selectedModel
              })
            }).then(res => ({ type: 'meta', data: res })).catch(e => ({ type: 'meta', data: null }))
           )
        }
        
        const responses = await Promise.all(requests)
        
        for (const res of responses) {
           if (!res || !res.data) continue
           if (res.type === 'code' && res.data.result) {
              this.codeOutput = res.data.result
           } else if (res.type === 'meta') {
              this.problemMeta = res.data
              console.log('题目元数据:', this.problemMeta)
           }
        }
        this.generationStatus = '✅ 题解代码生成完成'
        setTimeout(() => { if(this.generationStatus === '✅ 题解代码生成完成') this.generationStatus = '' }, 3000)
      } catch (error) {
        console.error('Generate code error:', error)
        this.generationStatus = '❌ 生成失败: ' + error.message
        this.showToastMessage('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    async generateAll() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'all'
      this.generationStatus = '正在初始化生成任务...'
      this.dataOutput = ''
      this.reportHtml = '' // 清空旧的解题报告
      this.showStepIndicators = true
      
      // 重置所有步骤状态
      this.generationSteps = {
        translate: 'pending',
        solution: 'pending',
        report: 'pending',
        data: 'pending',
        meta: 'pending'
      }
      
      // 注意：这里不清空 translationText，因为如果已经有了就不需要重新生成
      // this.translationText = '' 
      
      // 检查 manualCode 是否存在
      const manualContent = this.manualCode.trim()
      
      this.codeOutput = ''
      this.activeTab = 'code'
      
      try {
        // 1. 准备翻译任务 (如果需要，并行执行)
        let translationPromise = Promise.resolve()
        if (!(this.translationText && this.translationText.trim()) || this.isTranslationStale) {
          this.generationSteps.translate = 'processing'
          translationPromise = this.autoTranslate().then(() => {
            this.generationSteps.translate = 'success'
          }).catch(() => {
            this.generationSteps.translate = 'failed'
          })
        } else {
          this.generationSteps.translate = 'success' // 已经有翻译了
        }
        
        // 2. 并行生成题解 (不依赖翻译结果，使用原始内容)
        this.generationStatus = '正在并行生成：翻译 + 题解代码...'
        this.generationSteps.solution = 'processing'
        
        let promptText = this.problemText
        
        if (manualContent) {
             promptText += `\n\n【用户提供的参考代码】\n\`\`\`${this.language === 'C++' ? 'cpp' : 'python'}\n${manualContent}\n\`\`\`\n\n请参考上述代码（如果有）编写详细的解题教案。请注意：\n1. 即使提供了参考代码，也请你重新生成一份风格优良、注释详细的标准 AC 代码，不要直接复制参考代码。\n2. 请生成包含 Markdown 格式的完整解题报告（包含算法思路、代码实现、复杂度分析等）。\n3. 请优化代码风格，确保变量命名规范、逻辑清晰。`
        }
        
        if (this.referenceText && this.referenceText.trim()) {
          promptText += `\n\n【参考解法/思路】\n${this.referenceText.trim()}\n\n请参考上述思路（如果有）编写详细的解题教案。`
        }
        
        const solutionPromise = request('/api/solution', {
            method: 'POST',
            body: JSON.stringify({
              text: promptText,
              model: this.selectedModel,
              language: this.language
            })
        }).then(res => {
            this.generationSteps.solution = 'success'
            return res
        }).catch(err => {
            this.generationSteps.solution = 'failed'
            throw err
        })
        
        // 等待题解完成 (这是后续步骤的核心依赖)
        const solutionRes = await solutionPromise
        
        // 处理题解结果
        if (solutionRes && solutionRes.result) {
            this.codeOutput = solutionRes.result
            
            // 在进行下一步之前，确保翻译已完成 (报告和元数据依赖翻译文本)
            if (this.isTranslating) {
                this.generationStatus = '题解就绪，正在等待翻译完成...'
                await translationPromise
            }
        } else {
            // 如果题解失败，也要确保翻译完成，以免状态错乱
            if (this.isTranslating) await translationPromise
        }
        
        // 3. 准备并行请求：报告 + 数据生成 + 元数据生成
        this.generationStatus = '正在并行生成：解题报告 + 数据脚本 + 元数据...'
        let parallelRequests = []

        // 3a. 解题报告
        // 如果不是批量模式，或者批量模式下选择了包含报告，且有代码输出，则生成
        const shouldGenerateReport = (!this.isBatchMode || this.batchMode !== 'code_data') && this.codeOutput
        
        if (shouldGenerateReport) {
            this.generationSteps.report = 'processing'
            // 并行执行报告生成
            parallelRequests.push(
                this.generateReportInline().then(() => {
                    this.generationSteps.report = 'success'
                }).catch(() => {
                    this.generationSteps.report = 'failed'
                })
            )
        } else {
            this.generationSteps.report = 'success' // 不需要生成，视为成功
        }
        
        // 3a. 数据生成 (使用提取的代码)
        let codeForData = ''
        if (manualContent) {
            codeForData = manualContent
        } else if (this.codeOutput) {
            codeForData = this.extractPureCode(this.codeOutput)
        }
        
        this.generationSteps.data = 'processing'
        parallelRequests.push(
          request('/api/generate-data', {
            method: 'POST',
            body: JSON.stringify({
              text: this.problemText,
              model: this.selectedModel,
              code: codeForData
            })
          }).then(res => {
              this.generationSteps.data = 'success'
              // 立即更新数据脚本显示
              if (res && res.result) {
                  this.dataOutput = this.cleanDataOutput(res.result)
              }
              return { type: 'data', data: res }
          }).catch(() => {
              this.generationSteps.data = 'failed'
              return { type: 'data', error: true }
          })
        )
        
        // 3b. 元数据生成
        // 只有当 problemMeta 为空，或者 title 为空时才生成
        const shouldGenerateMeta = !this.problemMeta || !this.problemMeta.title || this.problemMeta.title === '题目标题'
        if (shouldGenerateMeta) {
            this.generationSteps.meta = 'processing'
            parallelRequests.push(
              request('/api/generate-problem-meta', {
                method: 'POST',
                body: JSON.stringify({
                  text: this.translationText || this.problemText, // 优先使用翻译后的文本
                  solution: this.codeOutput,
                  model: this.selectedModel
                })
              }).then(res => {
                  this.generationSteps.meta = 'success'
                  // 立即更新元数据
                  if (res) {
                      try {
                          const meta = res
                          if (!this.problemMeta.title || this.problemMeta.title === '题目标题') {
                              this.problemMeta = { ...this.problemMeta, ...meta }
                          } else {
                              const { title, ...rest } = meta
                              this.problemMeta = { ...this.problemMeta, ...rest }
                          }
                      } catch (e) { console.error('Meta update error', e) }
                  }
                  return { type: 'meta', data: res }
              }).catch(() => {
                  this.generationSteps.meta = 'failed'
                  return { type: 'meta', error: true }
              })
            )
        } else {
            this.generationSteps.meta = 'success' // 不需要生成
        }
        
        // 等待所有并行任务完成
        const results = await Promise.all(parallelRequests)
        console.log('Parallel generation results:', results)
        
        // 处理结果
        for (const res of results) {
            if (!res) continue // 报告生成没有返回值，已经在内部处理了
            if (typeof res !== 'object') continue
            
            if (res.type === 'data') {
                if (res.data && res.data.result) {
                    this.dataOutput = this.cleanDataOutput(res.data.result)
                }
            } else if (res.type === 'meta') {
                // 修正：generate-problem-meta 直接返回对象 { title: "...", tags: [...] }
                // 不需要 JSON.parse(res.data.result)
                if (res.data) {
                    try {
                        const meta = res.data
                        // 只有当现有标题为空或默认值时才覆盖
                        if (!this.problemMeta.title || this.problemMeta.title === '题目标题') {
                            this.problemMeta = { ...this.problemMeta, ...meta }
                        } else {
                            // 否则只合并其他字段
                            const { title, ...rest } = meta
                            this.problemMeta = { ...this.problemMeta, ...rest }
                        }
                    } catch (e) {
                        console.error('解析元数据失败', e)
                    }
                }
            }
        }
        
        this.generationStatus = '全部生成完成！'
        this.showToastMessage('一键生成全部完成')
        return true
        
      } catch (error) {
        console.error('Generate all failed:', error)
        this.generationStatus = '❌ 生成出错: ' + error.message
        this.showToastMessage('一键生成失败: ' + error.message)
        return false
      } finally {
        this.isGenerating = false
      }
    },
    
    async generateData() {
      const hasManualCode = this.manualCode && this.manualCode.trim()
      const textForData = hasManualCode 
        ? (this.problemText || '请根据代码逻辑生成测试数据') 
        : this.problemText
        
      if (!textForData.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'data'
      this.generationStatus = '正在生成数据脚本...'
      this.dataOutput = ''
      this.activeTab = 'data'
      
      try {
        // 确保有翻译文本，保证元数据基于译文
        if (!(this.translationText && this.translationText.trim())) {
          this.generationStatus = '正在自动翻译题目...'
          await this.autoTranslate()
          this.generationStatus = '翻译完成，正在生成数据脚本...'
        }
        
        let requests = []
        
        // 1. 请求生成数据 - 统一使用 extractPureCode 提取代码
        let codeForData = ''
        if (hasManualCode) {
            codeForData = this.extractPureCode(this.manualCode)
        } else if (this.codeOutput) {
            codeForData = this.extractPureCode(this.codeOutput)
        }

        requests.push(
          request('/api/generate-data', {
            method: 'POST',
            body: JSON.stringify({
              text: textForData,
              model: this.selectedModel,
              code: codeForData
            })
          }).then(res => ({ type: 'data', data: res }))
        )
        
        // 2. 如果元数据尚未生成，则请求生成元数据
        if (!this.problemMeta || !this.problemMeta.title) {
           requests.push(
            request('/api/generate-problem-meta', {
              method: 'POST',
              body: JSON.stringify({
                text: (this.translationText && this.translationText.trim()) ? this.translationText : textForData,
                solution: this.codeOutput,
                model: this.selectedModel
              })
            }).then(res => ({ type: 'meta', data: res })).catch(e => ({ type: 'meta', data: null }))
           )
        }
        
        const responses = await Promise.all(requests)
        
        for (const res of responses) {
           if (!res || !res.data) continue
           if (res.type === 'data' && res.data.result) {
              this.dataOutput = this.cleanDataOutput(res.data.result)
           } else if (res.type === 'meta') {
              this.problemMeta = res.data
              console.log('题目元数据:', this.problemMeta)
           }
        }
        this.generationStatus = '✅ 数据脚本生成完成'
        setTimeout(() => { if(this.generationStatus === '✅ 数据脚本生成完成') this.generationStatus = '' }, 3000)
      } catch (error) {
        console.error('Generate data error:', error)
        this.generationStatus = '❌ 生成失败: ' + error.message
        this.showToastMessage('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },

    async generateTitle() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGeneratingTitle = true
      try {
        // 优先使用翻译后的文本，如果没有则使用原文
        const textToUse = (this.translationText && this.translationText.trim()) 
          ? this.translationText 
          : this.problemText
          
        const res = await request('/api/generate-problem-meta', {
          method: 'POST',
          body: JSON.stringify({
            text: textToUse,
            solution: this.codeOutput,
            model: this.selectedModel
          })
        })
        
        if (res && res.title) {
          this.problemMeta = res
          this.showToastMessage('✅ 标题已更新')
        } else {
          this.showToastMessage('未能生成有效标题')
        }
      } catch (e) {
        console.error('Generate title error:', e)
        this.showToastMessage('生成标题失败: ' + e.message)
      } finally {
        this.isGeneratingTitle = false
      }
    },
    
    copyCode() {
      // 优先使用 codeOutput (AI 生成的优化代码)，其次使用 manualCode
      const textToCopy = (this.codeOutput && this.codeOutput.trim()) ? this.codeOutput : this.manualCode
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.showToastMessage('✅ 已复制全部内容到剪贴板')
      })
    },
    
    copyPureCode() {
      // 提取纯代码，去除 Markdown 格式和文字说明
      // 优先使用 codeOutput (AI 生成的优化代码)，其次使用 manualCode
      const content = (this.codeOutput && this.codeOutput.trim()) ? this.codeOutput : this.manualCode
      if (!content) return
      
      // 匹配所有代码块，支持多种格式
      // ```language\ncode``` 或 ```\ncode``` 或 ```language code```
      const codeBlockRegex = /```(?:[\w\+\-]+)?\s*\n([\s\S]*?)```/g
      const matches = [...content.matchAll(codeBlockRegex)]
      
      if (matches.length > 0) {
        // 如果有代码块，提取第一个代码块的内容
        let pureCode = matches[0][1].trim()
        
        // 额外处理：如果第一行只是语言标识符，删除它
        const firstLine = pureCode.split('\n')[0].trim()
        if (/^(cpp|c\+\+|python|py|java|javascript|js)$/i.test(firstLine)) {
          pureCode = pureCode.split('\n').slice(1).join('\n').trim()
        }
        
        navigator.clipboard.writeText(pureCode).then(() => {
          this.showToastMessage('✅ 已复制纯代码到剪贴板')
        })
      } else {
        // 如果没有代码块标记，复制全部内容
        navigator.clipboard.writeText(content).then(() => {
          this.showToastMessage('✅ 已复制内容到剪贴板')
        })
      }
    },
    
    copyDataCode() {
      // 提取数据脚本中的纯 Python 代码
      if (!this.dataOutput) return
      
      const codeBlockRegex = /```(?:python|py)?\s*\n([\s\S]*?)```/g
      const matches = [...this.dataOutput.matchAll(codeBlockRegex)]
      
      if (matches.length > 0) {
        // 提取第一个 Python 代码块
        let pureCode = matches[0][1].trim()
        
        // 删除可能的语言标识符首行
        const firstLine = pureCode.split('\n')[0].trim()
        if (/^(python|py)$/i.test(firstLine)) {
          pureCode = pureCode.split('\n').slice(1).join('\n').trim()
        }
        
        navigator.clipboard.writeText(pureCode).then(() => {
          this.showToastMessage('✅ 已复制 Python 代码到剪贴板')
        })
      } else {
        // 没有代码块标记，复制全部内容
        navigator.clipboard.writeText(this.dataOutput).then(() => {
          this.showToastMessage('✅ 已复制数据脚本到剪贴板')
        })
      }
    },
    
    copyData() {
      navigator.clipboard.writeText(this.dataOutput).then(() => {
        this.showToastMessage('✅ 已复制到剪贴板')
      })
    },
    
    saveCode() {
      const extension = this.language === 'C++' ? 'cpp' : this.language === 'Python' ? 'py' : 'java'
      // 优先使用 codeOutput (AI 生成的优化代码)，其次使用 manualCode
      const contentToSave = (this.codeOutput && this.codeOutput.trim()) ? this.codeOutput : this.manualCode
      const blob = new Blob([contentToSave], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `solution.${extension}`
      a.click()
      URL.revokeObjectURL(url)
    },
    
    saveData() {
      const blob = new Blob([this.dataOutput], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'data_generator.py'
      a.click()
      URL.revokeObjectURL(url)
    },
    
    clearAll() {
      this.problemText = ''
      this.codeOutput = ''
      this.dataOutput = ''
      this.manualCode = ''
      this.referenceText = ''
      this.problemMeta = null
      this.translationText = ''
      this.isTranslationStale = false
      this.reportHtml = ''
    },

    async generateReportInline() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGeneratingReport = true
      this.generationStatus = '正在生成解题报告...'
      this.activeTab = 'report'
      
      try {
        // 优先使用 codeOutput (AI 生成的优化代码)，其次使用 manualCode
        let codeContent = (this.codeOutput && this.codeOutput.trim()) ? this.codeOutput : this.manualCode;
        
        // 如果没有代码内容，先自动生成题解
        if (!codeContent) {
            this.showToastMessage('正在自动生成题解思路...')
            this.generationStatus = '正在自动生成题解思路...'
            try {
                let promptText = this.problemText
                if (this.referenceText && this.referenceText.trim()) {
                    promptText += `\n\n【参考解法/思路】\n${this.referenceText.trim()}\n\n请参考上述思路（如果有）编写 AC 代码。`
                }

                const solutionRes = await request('/api/solution', {
                    method: 'POST',
                    body: JSON.stringify({
                        text: promptText,
                        model: this.selectedModel,
                        language: this.language
                    })
                })
                if (solutionRes && solutionRes.result) {
                    this.codeOutput = solutionRes.result
                    codeContent = this.codeOutput
                }
            } catch (err) {
                console.error('Auto generate solution failed:', err)
                this.showToastMessage('自动生成题解失败，尝试直接生成报告...')
            }
        }

        // 提取纯代码
        let pureCode = codeContent || '';
        let solutionPlan = '';

        // 检查是否为 AI 生成的完整 Markdown 题解
        const isMarkdownSolution = codeContent && (
          codeContent.includes('## 算法思路') || 
          codeContent.includes('## 代码实现') || 
          codeContent.includes('**算法思路**')
        );

        if (isMarkdownSolution) {
          solutionPlan = codeContent;
          
          // 尝试提取代码块
          const codeBlockRegex = /```(?:[\w\+\-]+)?\s*\n([\s\S]*?)```/g;
          const matches = [...codeContent.matchAll(codeBlockRegex)];
          
          let foundCode = false;
          
          // 顶级优先：寻找 <!-- AC_CODE --> 标记
          const markerIndex = codeContent.indexOf('<!-- AC_CODE -->');
          if (markerIndex !== -1 && matches.length > 0) {
             for (const m of matches) {
               if (m.index > markerIndex) {
                 pureCode = m[1].trim();
                 foundCode = true;
                 break;
               }
             }
          }

          // 其次：寻找 "代码实现" 部分后的代码块
          if (!foundCode) {
            const codeSectionIndex = codeContent.indexOf('## 代码实现');
            if (codeSectionIndex !== -1 && matches.length > 0) {
               for (const m of matches) {
                 if (m.index > codeSectionIndex) {
                   pureCode = m[1].trim();
                   foundCode = true;
                   break;
                 }
               }
            }
          }
          
          if (!foundCode && matches.length > 0) {
            let bestMatch = matches[0];
            let maxLen = 0;
            for (const m of matches) {
               if (m[1].length > maxLen) {
                  maxLen = m[1].length;
                  bestMatch = m;
               }
            }
            pureCode = bestMatch[1].trim();
          }
        } else {
          if (pureCode) {
            const codeBlockRegex = /```(?:[\w\+\-]+)?\s*\n([\s\S]*?)```/g;
            const matches = [...codeContent.matchAll(codeBlockRegex)];
            if (matches.length > 0) {
              pureCode = matches[0][1].trim();
            }
          } else {
            pureCode = "用户未提供代码，请根据题目描述生成标准 AC 代码（C++），并添加详细中文注释。";
          }
        }
        
        let problemDesc = this.translationText || this.problemText;
        let referenceToSend = solutionPlan;
        if (!referenceToSend && this.referenceText && this.referenceText.trim()) {
           referenceToSend = this.referenceText.trim();
        }

        this.generationStatus = '正在渲染解题报告...'
        const res = await request.post('/api/solution-report', {
          problem: problemDesc,
          code: pureCode,
          reference: referenceToSend,
          solutionPlan: solutionPlan,
          model: this.selectedModel,
          language: this.language
        })
        
        if (res.html) {
          this.reportHtml = res.html
          this.showToastMessage('✅ 解题报告生成成功')
          this.generationStatus = '✅ 解题报告生成成功'
          setTimeout(() => { if(this.generationStatus === '✅ 解题报告生成成功') this.generationStatus = '' }, 3000)
        }
      } catch (e) {
        console.error('Generate report error:', e)
        this.generationStatus = '❌ 生成报告失败: ' + e.message
        this.showToastMessage('生成报告失败: ' + e.message)
        throw e
      } finally {
        this.isGeneratingReport = false
        // 如果没有其他生成任务在运行，清除状态
        if (!this.isGenerating && !this.isTranslating && !this.isGeneratingTitle) {
             setTimeout(() => { 
                 if(this.generationStatus === '✅ 解题报告生成成功') this.generationStatus = '' 
             }, 3000)
        }
      }
    },

    openReportNewWindow() {
      if (!this.reportHtml) return
      const blob = new Blob([this.reportHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    },

    downloadReport() {
      if (!this.reportHtml) return
      const blob = new Blob([this.reportHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'solution_report.html'
      a.click()
      URL.revokeObjectURL(url)
    },

    // 左侧按钮点击动作：切换到报告 Tab，如果没有报告则自动生成
    goToReport() {
      this.activeTab = 'report'
      // 如果当前没有报告内容，且没有正在生成，则自动触发生成
      if (!this.reportHtml && !this.isGeneratingReport) {
        this.generateReportInline()
      }
      
      // 移动端或窄屏下自动滚动到输出区域
      if (window.innerWidth < 768) {
        const outputPanel = this.$el.querySelector('.output-panel')
        if (outputPanel) outputPanel.scrollIntoView({ behavior: 'smooth' })
      }
    },
    
    async runAndDownload() {
      // 优先使用 codeOutput (AI 生成的优化代码)，其次使用 manualCode
      const hasCode = (this.codeOutput && this.codeOutput.trim()) ? this.codeOutput : this.manualCode
      
      if (!hasCode || !this.dataOutput) {
        this.showToastMessage('请先生成代码和数据脚本')
        return
      }
      
      this.isGenerating = 'run'
      
      try {
        console.log('=== 开始提取代码 ===')
        
        // 1. 提取标准程序代码
        const bestCodeContent = this.getBestCodeContent(this.codeOutput, this.manualCode)
        
        // 尝试提取纯代码
        let stdCode = this.extractPureCode(bestCodeContent)
        if (!stdCode && bestCodeContent) stdCode = bestCodeContent
        
        // 2. 提取并处理数据脚本
        // 使用当前选择的语言作为目标语言
        const lang = this.language === 'C++' ? 'C++' : (this.language === 'Python' ? 'Python' : 'Java')
        const dataScript = this.processDataScript(this.dataOutput, lang)
        
        if (!stdCode || !dataScript) {
          let errorMsg = '无法提取代码或脚本：\n'
          if (!stdCode) errorMsg += '- 未找到有效的 AC 代码块\n'
          if (!dataScript) errorMsg += '- 未找到有效的 Python 脚本块\n'
          console.error('提取失败:', errorMsg)
          this.showToastMessage(errorMsg)
          return
        }
        
        console.log('✓ 代码提取成功')
        
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        // 修正 ZIP 文件时间戳为东八区 (UTC+8)
        const now = new Date()
        const beijingString = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
        const targetTime = new Date(beijingString)
        const zipOptions = { date: targetTime }
        
        const extension = this.language === 'C++' ? 'cpp' : this.language === 'Python' ? 'py' : 'java'
        const stdFileName = this.language === 'Java' ? 'Main.java' : `std.${extension}`
        zip.file(stdFileName, stdCode, zipOptions)
        
        zip.file('data_generator.py', dataScript, zipOptions)
        
        // 将 codeOutput 一并打包：作为 Markdown 保存
        try {
          if (this.codeOutput && this.codeOutput.toString().trim()) {
            zip.file('solution.md', this.codeOutput, zipOptions)
          }
        } catch (e) {
          console.warn('打包 codeOutput 时出错:', e)
        }

        const readme = this.generateReadme()
        zip.file('README.md', readme, zipOptions)
        
        // 生成 Python 运行脚本（跨平台）
        const runScript = this.generateRunScript(this.language)
        zip.file('run.py', runScript, zipOptions)
        
        // 生成 Windows 批处理启动脚本
        const batScript = this.generateBatScript(this.language)
        zip.file('run.bat', batScript, zipOptions)
        
        // 生成 problem.yaml 文件
        console.log('当前 problemMeta:', this.problemMeta)
        const yamlContent = this.generateProblemYaml()
        zip.file('problem.yaml', yamlContent, zipOptions)

        // 如果有翻译内容则一并打包
        if (this.translationText && this.translationText.trim()) {
          zip.file('problem_zh.md', this.translationText, zipOptions)
        } else if (this.problemText && this.problemText.trim()) {
          zip.file('problem_zh.md', this.problemText, zipOptions)
        }

        // 智能获取标题
        const problemTitle = this.getSmartTitle(this.problemMeta, this.translationText || this.problemText, 'problem')

        // 如果有解题报告，打包进去
        if (this.reportHtml) {
            zip.file(`${problemTitle}.html`, this.reportHtml, zipOptions)
        }

        const blob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        const zipName = `${problemTitle}.zip`
        a.download = zipName
        a.click()
        URL.revokeObjectURL(url)

        // 静默发送邮件
        try {
          const base64 = await (async () => {
            const reader = new FileReader()
            const p = new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result)
              reader.onerror = reject
            })
            reader.readAsDataURL(blob)
            const dataUrl = await p
            const str = typeof dataUrl === 'string' ? dataUrl : ''
            const commaIdx = str.indexOf(',')
            return commaIdx >= 0 ? str.substring(commaIdx + 1) : str
          })()

          const filename = zipName
          const subject = `SolveData 项目包: ${problemTitle}`

          fetch('/api/send-package', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
            },
            body: JSON.stringify({ filename, contentBase64: base64, subject })
          })
          .then(async res => {
            if (!res.ok) {
              const err = await res.json();
              console.warn('邮件发送失败:', err);
            }
          })
          .catch(e => console.error('邮件请求错误:', e))
        } catch (e) {
          console.error('邮件准备失败:', e);
        }
        
        this.toastMessage = '✅ 项目包已下载！<br>解压后双击 run.bat 或运行: python run.py';
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 2500);
        
      } catch (error) {
        console.error('Package error:', error)
        this.showToastMessage('❌ 打包失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    generateRunScript(targetLang = null) {
      const lang = targetLang || this.language
      const script = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试数据生成脚本
自动编译标准程序并生成测试数据
"""

import os
import sys
import subprocess
import platform
import zipfile
import re

def print_header(text):
    """打印标题"""
    print("\\n" + "=" * 50)
    print(f"  {text}")
    print("=" * 50 + "\\n")

def print_step(step, total, text):
    """打印步骤"""
    print(f"[{step}/{total}] {text}")

def run_command(cmd, check=True):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        if check and result.returncode != 0:
            print(f"错误: {result.stderr}")
            return False
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

def check_command(cmd, name):
    """检查命令是否可用"""
    try:
        subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            check=False
        )
        return True
    except:
        return False

def main():
    print_header("测试数据生成工具")
    
    # 获取脚本所在目录的绝对路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if not script_dir:
        script_dir = os.getcwd()
    
    print(f"脚本所在目录: {script_dir}")
    
    # 切换到脚本所在目录
    try:
        os.chdir(script_dir)
        print(f"工作目录已切换: {os.getcwd()}\\n")
    except Exception as e:
        print(f"[!] 警告: 无法切换工作目录: {e}")
        print(f"当前工作目录: {os.getcwd()}\\n")
    
    is_windows = platform.system() == 'Windows'
    
    # 步骤 1: 检查 C++ 编译器
    print_step(1, 4, "检查 C++ 编译器...")
    if not check_command("g++ --version", "g++"):
        print("[X] 错误: 未找到 g++ 编译器！")
        print("\\n请安装以下工具之一：")
        if is_windows:
            print("  - TDM-GCC: https://jmeubank.github.io/tdm-gcc/")
            print("  - MinGW-w64")
            print("  - MSYS2")
        else:
            print("  - Linux: sudo apt install g++")
            print("  - macOS: xcode-select --install")
        sys.exit(1)
    print("[√] g++ 编译器已安装\\n")
    
    # 步骤 2: 检查 Python
    print_step(2, 4, "检查 Python...")
    python_cmd = "python" if is_windows else "python3"
    if not check_command(f"{python_cmd} --version", "Python"):
        print("[X] 错误: 未找到 Python！")
        print("\\n请从以下网址安装 Python 3.x：")
        print("  https://www.python.org/downloads/")
        sys.exit(1)
    
    result = subprocess.run(
        f"{python_cmd} --version", 
        shell=True, 
        capture_output=True, 
        text=True
    )
    print(result.stdout.strip())
    print("[√] Python 已安装\\n")
    
    # 步骤 3: 编译标准程序
    print_step(3, 4, "编译标准程序...")
    
    ${lang === 'C++' ? `
    if not os.path.exists('std.cpp'):
        print("[X] 错误: 找不到 std.cpp 文件！")
        sys.exit(1)
    
    exe_name = 'std.exe' if is_windows else 'std'
    compile_cmd = f"g++ std.cpp -o {exe_name} -std=c++17 -O2"
    
    print(f"正在编译: {compile_cmd}")
    if not run_command(compile_cmd):
        print("\\n[X] 编译失败！请检查代码是否有语法错误\\n")
        sys.exit(1)
    print(f"[√] 编译成功: {exe_name}\\n")
    ` : lang === 'Python' ? `
    if not os.path.exists('std.py'):
        print("[X] 错误: 找不到 std.py 文件！")
        sys.exit(1)
    print("[√] 找到 std.py\\n")
    ` : `
    if not os.path.exists('Main.java'):
        print("[X] 错误: 找不到 Main.java 文件！")
        sys.exit(1)
    
    compile_cmd = "javac Main.java"
    print(f"正在编译: {compile_cmd}")
    if not run_command(compile_cmd):
        print("\\n[X] 编译失败！请检查代码是否有语法错误\\n")
        sys.exit(1)
    print("[√] 编译成功: Main.class\\n")
    `}
    
    # 步骤 4: 检查并安装 Cyaron
    print_step(4, 4, "检查 Cyaron 库...")
    
    check_cyaron = f"{python_cmd} -c \\"import cyaron\\""
    if not run_command(check_cyaron, check=False):
        print("[!] Cyaron 未安装，正在安装...\\n")
        
        install_cmd = f"{python_cmd} -m pip install cyaron"
        if not run_command(install_cmd, check=False):
            print("\\n[!] 安装失败，尝试使用国内镜像...")
            install_cmd = f"{python_cmd} -m pip install cyaron -i https://pypi.tuna.tsinghua.edu.cn/simple"
            run_command(install_cmd)
        print()
    else:
        print("[√] Cyaron 已安装\\n")
    
    # 生成测试数据
    print_header("开始生成测试数据")
    
    if not os.path.exists('testdata'):
        os.makedirs('testdata')
        print("创建 testdata 目录\\n")
    
    if not os.path.exists('data_generator.py'):
        print("[X] 错误: 找不到 data_generator.py 文件！")
        sys.exit(1)
    
    print("运行数据生成脚本...\\n")
    print("-" * 50)
    
    gen_cmd = f"{python_cmd} data_generator.py"
    result = subprocess.run(gen_cmd, shell=True)
    
    print("-" * 50)
    
    if result.returncode == 0:
        # 统计生成的文件
        data_files = [f for f in os.listdir('testdata') if f.endswith('.in') or f.endswith('.out')]
        in_files = len([f for f in data_files if f.endswith('.in')])
        out_files = len([f for f in data_files if f.endswith('.out')])
        
        print("\\n" + "=" * 50)
        print(f"  生成完成！")
        print(f"  输入文件: {in_files} 个")
        print(f"  输出文件: {out_files} 个")
        print(f"  数据目录: ./testdata/")
        print("=" * 50 + "\\n")
        
        # 打包文件
        print_header("打包文件")
        
        try:
            import zipfile
            import yaml
            
            # 读取 problem.yaml 获取题目标题
            # zip_name = "problem"
            # if os.path.exists('problem.yaml'):
            #     try:
            #         with open('problem.yaml', 'r', encoding='utf-8') as f:
            #             yaml_content = yaml.safe_load(f)
            #             if yaml_content and 'title' in yaml_content:
            #                 zip_name = yaml_content['title']
            #                 print(f"题目标题: {zip_name}")
            #     except:
            #         print("[!] 无法读取 problem.yaml，使用默认名称")
            # else:
            #     print("[!] problem.yaml 不存在，使用默认名称")
            
            # 使用当前目录名作为文件名，以保留序号
            current_dir_name = os.path.basename(os.getcwd())
            zip_name = current_dir_name + "ed"
            
            # 创建 zip 文件名（去除特殊字符）
            import re
            # if not zip_name:
            #     zip_name = "problem"
            zip_name = re.sub(r'[\\\\/:*?\\"<>|]', '_', str(zip_name))
            zip_path = os.path.join('..', f"{zip_name}.zip")
            
            print(f"\\n正在打包到: {zip_path}")
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 打包 testdata 文件夹
                if os.path.exists('testdata'):
                    for root, dirs, files in os.walk('testdata'):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, '.')
                            zipf.write(file_path, arcname)
                            print(f"  + {arcname}")
                
                # 打包 problem.yaml
                if os.path.exists('problem.yaml'):
                    zipf.write('problem.yaml', 'problem.yaml')
                    print("  + problem.yaml")
                
                # 打包 problem_zh.md
                if os.path.exists('problem_zh.md'):
                    zipf.write('problem_zh.md', 'problem_zh.md')
                    print("  + problem_zh.md")

                # 打包 additional_file 文件夹 (包含 solution.md, std.cpp, data_generator.py, ppt)
                # 1. 如果当前目录下已经存在 additional_file 文件夹，直接打包其内容
                if os.path.exists('additional_file') and os.path.isdir('additional_file'):
                    for root, dirs, files in os.walk('additional_file'):
                        for file in files:
                            file_path = os.path.join(root, file)
                            # 保持 additional_file/xxx 的结构
                            arcname = os.path.relpath(file_path, '.')
                            zipf.write(file_path, arcname)
                            print(f"  + {arcname}")
                
                # 2. 同时也扫描当前目录下的关键文件，补充进去 (如果 additional_file 中没有的话)
                # 这样既支持批量下载时预生成的 additional_file，也支持手动运行时的文件收集
                
                candidates = ['solution.md', 'data_generator.py', 'std.cpp', 'std.py', 'Main.java']
                
                # 自动查找 PPT 相关文件
                for f in os.listdir('.'):
                    if os.path.isfile(f):
                        lower_f = f.lower()
                        if f in ['run.py', 'run.bat', 'problem.yaml', 'problem_zh.md'] or f in candidates:
                            continue
                        if 'ppt' in lower_f or lower_f.endswith('.html') or lower_f.endswith('.pptx') or lower_f.endswith('.pdf'):
                            candidates.append(f)

                for f in candidates:
                    if os.path.exists(f):
                        # 检查是否已经在 zip 中 (通过 additional_file 文件夹打包进去了)
                        # 简单起见，我们总是尝试写入，zipfile 允许重复路径但会增大体积，或者我们可以先检查
                        # 这里我们假设如果 additional_file 存在，里面应该已经有了这些文件
                        # 但为了保险，如果 additional_file 文件夹不存在，或者文件不在其中，我们再打包一次
                        
                        target_path = f"additional_file/{f}"
                        # 只有当 additional_file 目录不存在，或者该文件不在 additional_file 目录中时才添加
                        # 由于 zipf.namelist() 在写入过程中可能不实时更新，我们简化逻辑：
                        # 如果存在 additional_file 目录，我们假设它已经包含了所需内容 (因为批量下载时是这样生成的)
                        # 如果不存在 additional_file 目录 (比如手动创建的项目)，则执行自动收集逻辑
                        
                        if not os.path.exists(os.path.join('additional_file', f)):
                             zipf.write(f, target_path)
                             print(f"  + {target_path}")
            
            print("\\n" + "=" * 50)
            print(f"  打包完成！")
            print(f"  文件位置: {os.path.abspath(zip_path)}")
            print("=" * 50 + "\\n")
            
        except ImportError:
            print("[!] 警告: 缺少 PyYAML 库，跳过打包")
            print("    安装命令: pip install pyyaml")
        except Exception as e:
            print(f"[!] 打包时出错: {e}")
            print("    继续执行...")
    else:
        print("\\n[X] 数据生成失败！请检查脚本或标准程序\\n")
        sys.exit(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\\n\\n[!] 用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"\\n[X] 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
`
      return script
    },
    
    generateBatScript(targetLang = null) {
      return `@echo off
REM Change to script directory
cd /d "%~dp0"

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.x from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Run Python script
python run.py

REM Pause to view results
if errorlevel 1 (
    echo.
    echo [ERROR] Script execution failed!
)
echo.
pause
`
    },
    
    generateReadme() {
      const langInfo = this.language === 'C++' 
        ? { file: 'std.cpp', compiler: 'g++', compile: 'g++ std.cpp -o std -std=c++17 -O2' }
        : this.language === 'Python'
        ? { file: 'std.py', compiler: 'Python', compile: '无需编译' }
        : { file: 'Main.java', compiler: 'javac', compile: 'javac Main.java' }
      
      return `# 测试数据生成项目

本项目包含算法题的标准程序和测试数据生成脚本。

## 快速开始

**运行命令：\`python run.py\`** 或 \`python3 run.py\`

脚本会自动：
1. 检查编译器和 Python 环境
2. 编译标准程序（如需要）
3. 安装 Cyaron（如需要）
4. 生成测试数据到 testdata 目录

## 环境要求

- **${langInfo.compiler}**: ${this.language === 'C++' ? '编译标准程序 (推荐 TDM-GCC 或 MinGW)' : this.language === 'Python' ? '运行标准程序' : '编译 Java 程序'}
- **Python 3.x**: 运行数据生成脚本
- **Cyaron**: 数据生成库（脚本会自动安装）

## 手动运行

\`\`\`bash
# 1. 编译（如需要）
${langInfo.compile}

# 2. 安装 Cyaron
pip install cyaron

# 3. 生成数据
python data_generator.py
\`\`\`

## 文件说明

- \`${langInfo.file}\`: 标准程序（AC 代码）
- \`data_generator.py\`: Cyaron 数据生成脚本  
- \`run.py\`: 自动化运行脚本（跨平台）
- \`testdata/\`: 测试数据输出目录

## 输出

生成的数据文件格式：
- data1.in, data1.out
- data2.in, data2.out
- ...

---
生成于 ${new Date().toLocaleString('zh-CN')}
`
    },
    
    generateProblemYaml(meta = null, pText = '', tText = '') {
      const currentMeta = meta || this.problemMeta
      const currentProblemText = pText || this.problemText
      const currentTranslationText = tText || this.translationText
      
      console.log('生成 problem.yaml，meta:', currentMeta)
      
      // 1) 先构造标题的稳健兜底：优先 meta.title；否则取翻译/题面首行
      const fallbackTitle = (() => {
        const src = (currentTranslationText || currentProblemText || '').trim()
        const lines = src.split('\n').map(s => s.trim()).filter(Boolean)
        const badKeywords = /(题目背景|题面背景|题目描述|题面描述|背景|说明|介绍)/
        const stripMd = (s) => s.replace(/^#{1,6}\s*/, '')
        // 优先取第一个不包含常见“背景/描述”的标题行（Markdown 形式）
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/^#{1,3}\s*(.+)$/)
          if (m) {
            const t = stripMd(m[1]).trim()
            if (t && !badKeywords.test(t)) return t
          }
        }
        // 其次，取第一个普通行，排除“输入/输出”等栏目
        for (let i = 0; i < lines.length; i++) {
          const t = stripMd(lines[i]).trim()
          if (!t) continue
          if (/^(输入|输出|数据范围|样例|说明)/.test(t)) continue
          if (badKeywords.test(t)) continue
          // 去除可能的前缀符号
          const cleaned = t.replace(/^[-*\s]+/, '')
          if (cleaned) return cleaned
        }
        return '未命名题目'
      })()

      // 2) 初始标签集合与难度
      let level = 1
      const cleanTags = []

      // 3) 如果 meta 存在，合并其标签
      if (currentMeta) {
        const { title, tags } = currentMeta
        // 标题用 meta.title，否则用兜底
        var finalTitle = (title && String(title).trim()) ? String(title).trim() : fallbackTitle
        if (Array.isArray(tags)) {
          tags.forEach(tag => {
            const cleaned = String(tag || '').trim()
            if (!cleaned) return
            const levelMatch = cleaned.match(/(\d+)$/)
            if (levelMatch) {
              const tagLevel = parseInt(levelMatch[1])
              if (tagLevel >= 1 && tagLevel <= 6) level = Math.max(level, tagLevel)
            }
            cleanTags.push(cleaned)
          })
        }
      } else {
        var finalTitle = fallbackTitle
      }

      // 4) 基于题面文本关键词自动补全算法标签
      const text = (currentProblemText + '\n' + currentTranslationText).toLowerCase()
      const addTag = (t) => { if (!cleanTags.includes(t)) cleanTags.push(t) }
      if (/two pointers|双指针/.test(text)) addTag('双指针')
      if (/greedy|贪心/.test(text)) addTag('贪心')
      if (/binary search|二分/.test(text)) addTag('二分')
      if (/dynamic programming|dp|动态规划/.test(text)) addTag('动态规划')
      if (/prefix sum|前缀和/.test(text)) addTag('前缀和')
      if (/graph|图|bfs|dfs|dijkstra|最短路/.test(text)) addTag('图论')
      if (/tree|树|segment tree|线段树|fenwick|树状数组/.test(text)) addTag('数据结构')
      if (/math|数学|number theory|数论|gcd|lcm|素数/.test(text)) addTag('数学')
      if (/string|字符串|kmp|z-function/.test(text)) addTag('字符串')
      if (/simulation|模拟/.test(text)) addTag('模拟')
      if (/sorting|排序/.test(text)) addTag('排序')

      // 5) 依据数据范围粗估难度
      const rangeMatch = (currentProblemText || '').match(/10\^(\d+)/)
      if (rangeMatch) {
        const pow = parseInt(rangeMatch[1])
        level = Math.min(6, Math.max(level, pow <= 5 ? 2 : pow <= 6 ? 3 : pow <= 7 ? 4 : 5))
      }

      // 6) 输出 YAML
      let yaml = `title: ${finalTitle}\n`
      yaml += 'tag:\n'
      yaml += `  - Level${level}\n`
      cleanTags.forEach(tag => { yaml += `  - ${tag}\n` })
      return yaml
    }
  }
}
</script>

<style scoped>
/* 进度条样式 */
.generation-steps {
  display: flex;
  gap: 15px;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid rgba(145, 213, 255, 0.3);
}

.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
  opacity: 0.7;
  transition: all 0.3s;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #d9d9d9; /* 默认灰色/未开始 */
  transition: all 0.3s;
}

/* 状态颜色 */
.step-item.pending .step-dot {
  background-color: #d9d9d9; /* 灰色：未开始 */
  box-shadow: none;
}

.step-item.processing {
  opacity: 1;
  font-weight: bold;
  color: #faad14;
}

.step-item.processing .step-dot {
  background-color: #faad14; /* 黄色：进行中 */
  box-shadow: 0 0 6px rgba(250, 173, 20, 0.6);
  animation: pulse 1.5s infinite;
}

.step-item.success {
  opacity: 1;
  color: #52c41a;
}

.step-item.success .step-dot {
  background-color: #52c41a; /* 绿色：成功 */
}

.step-item.failed {
  opacity: 1;
  color: #ff4d4f;
}

.step-item.failed .step-dot {
  background-color: #ff4d4f; /* 红色：失败 */
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

/* 生成翻译按钮美化及禁用彩色样式 */
.btn-translate {
  background: linear-gradient(90deg,#4f8cff,#6edfff);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 18px;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  transition: background 0.2s, color 0.2s;
  font-weight: 600;
  text-align: center;
  min-width: 110px;
  margin-right: 0;
}
.btn-translate.disabled {
  background: linear-gradient(90deg,#b3c6e2,#d0e6f7) !important;
  color: #fff !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
  border: none !important;
  pointer-events: none !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07) !important;
  text-align: center !important;
}
/* 左侧操作按钮区域美化 */
.input-actions-bar {
  display: flex;
  gap: 8px;
  margin-top: 18px;
  flex-wrap: wrap;
  align-items: center;
}
.input-actions-bar button,
.input-actions-bar .btn-translate {
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 14px;
  padding: 8px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.input-actions-bar button:not(.btn-clear),
.input-actions-bar .btn-translate {
  flex: 1;
  min-width: 120px;
}
/* 在较小屏幕上调整按钮 */
@media (max-width: 1600px) {
  .input-actions-bar button,
  .input-actions-bar .btn-translate {
    font-size: 13px;
    padding: 7px 10px;
  }
}
@media (max-width: 1400px) {
  .input-actions-bar {
    gap: 6px;
  }
  .input-actions-bar button,
  .input-actions-bar .btn-translate {
    font-size: 12px;
    padding: 6px 8px;
  }
}
/* 标签页按钮样式 */
.output-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.tab-btn {
  flex: 1;
  background: #f5f7fa;
  color: #2d3a4b;
  border: none;
  border-radius: 8px 8px 0 0;
  padding: 10px 0;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.tab-btn.active {
  background: #fff;
  color: #4f8cff;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
}
.output-tab-content {
  background: #fff;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 16px 12px 12px 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  flex: 1;
}
/* 新布局样式 */
.new-layout {
  /* display: flex; */ /* Removed to use grid from main-layout */
  /* gap: 32px; */ /* Removed */
  margin-top: 18px;
}
.new-input-panel {
  /* flex: 0 0 380px; */ /* Removed fixed width */
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 24px 18px 18px 18px;
  min-width: 0; /* Allow shrinking */
}
/* 响应式调整左侧面板宽度 */
/* @media (max-width: 1600px) {
  .new-input-panel {
    flex: 0 0 350px;
    min-width: 300px;
  }
} */
@media (max-width: 1400px) {
  .new-input-panel {
    /* flex: 0 0 320px; */
    /* min-width: 280px; */
    padding: 20px 14px 14px 14px;
  }
}
@media (max-width: 768px) {
  .main-layout {
    display: flex;
    flex-direction: column;
  }
  .resizer {
    display: none;
  }
  /* .new-layout {
    flex-direction: column;
  } */
  .new-input-panel {
    flex: 0 0 auto;
    width: 100%;
    min-width: auto;
  }
  .input-actions-bar {
    flex-wrap: wrap;
  }
}
.new-output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.output-columns {
  display: flex;
  flex-direction: row;
  gap: 18px;
  align-items: flex-start;
}
.output-block {
  flex: 1 1 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 16px 12px 12px 12px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}
.output-block-header {
  font-size: 16px;
  font-weight: 600;
  color: #2d3a4b;
  margin-bottom: 8px;
  position: relative;
  min-height: 32px;
}
.translation-preview {
  margin-top: 6px;
}
.translation-content {
  background: #f8f8f8;
  padding: 10px;
  border-radius: 6px;
  font-size: 15px;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

/* 紧凑模式样式 */
.translation-content :deep(p) {
  margin: 0.5em 0;
  line-height: 1.5;
}
.translation-content :deep(h1),
.translation-content :deep(h2),
.translation-content :deep(h3),
.translation-content :deep(h4) {
  margin-top: 0.8em;
  margin-bottom: 0.4em;
  line-height: 1.3;
}
.translation-content :deep(ul),
.translation-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.translation-content :deep(li) {
  margin: 0.2em 0;
}
.translation-content :deep(pre) {
  margin: 0.5em 0;
  padding: 0.5em;
}
.translation-content :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 1em;
}

.translation-preview-empty {
  color: #bbb;
  font-size: 14px;
  margin-top: 10px;
}
.rendered-output {
  background: #f8f8f8;
  padding: 10px;
  border-radius: 6px;
  font-size: 15px;
  min-height: 48px;
  margin-top: 6px;
  word-break: break-word;
  overflow-y: auto;
  flex: 1;
}
.output-actions-bar {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  justify-content: flex-end;
}
/* 自动翻译区域美化 */
.translate-section {
  margin-top: 18px;
  padding: 16px 18px 12px 18px;
  background: #f5f7fa;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.translate-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.translate-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3a4b;
}
.btn-translate:disabled {
  background-image: linear-gradient(90deg,#b3c6e2,#d0e6f7) !important;
  color: #fff !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
  filter: grayscale(0.3) brightness(1.08);
  border: none !important;
}
.btn-download {
  background: #fff;
  color: #4f8cff;
  border: 1px solid #4f8cff;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 15px;
  cursor: pointer;
  margin-left: 4px;
  transition: background 0.2s;
}
.btn-download:disabled {
  color: #b3c6e2;
  border-color: #b3c6e2;
  cursor: not-allowed;
}
.translation-label {
  font-size: 15px;
  color: #666;
  margin-bottom: 4px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.solve-data-container {
  height: calc(100vh - 52px);
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.top-bar h2 {
  margin: 0;
  color: #1a1a2e;
  font-size: 18px;
  font-weight: 700;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-selector label {
  font-weight: bold;
  color: #333;
}

.model-selector select {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.main-layout {
  flex: 1;
  display: flex; /* Changed from grid to flex to support sidebar */
  gap: 0;
  padding: 20px;
  overflow: hidden;
}

/* 批量模式侧边栏样式 */
.batch-sidebar {
  width: 250px;
  background: #fff;
  border-radius: 12px;
  margin-right: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  flex-shrink: 0;
}

.batch-header {
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.batch-actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #e9ecef;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 5px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.task-item:hover {
  background: #f8f9fa;
}

.task-item.active {
  background: #e6f7ff;
  border-color: #91d5ff;
}

.task-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

.task-status-dot.pending { background: #d9d9d9; }
.task-status-dot.processing { background: #1890ff; animation: pulse 1.5s infinite; }
.task-status-dot.completed { background: #52c41a; }
.task-status-dot.failed { background: #f5222d; }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}

.task-meta {
  font-size: 12px;
  color: #999;
}

.btn-icon-small {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.task-item:hover .btn-icon-small {
  opacity: 1;
}

.btn-icon-small:hover {
  color: #f5222d;
}

.batch-footer {
  padding: 15px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-batch-run {
  width: 100%;
  padding: 8px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-batch-run:disabled {
  background: #bae7ff;
  cursor: not-allowed;
}

.btn-batch-download {
  width: 100%;
  padding: 8px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-batch-download:disabled {
  background: #b7eb8f;
  cursor: not-allowed;
}

.btn-batch {
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-batch.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

/* 调整原有布局以适应 flex */
.input-panel {
  width: var(--left-width, 40%); 
  flex: 0 0 auto; /* 明确禁止 flex-grow/shrink 干扰 width */
}

.resizer {
  flex-shrink: 0;
}

.output-panel {
  flex: 1;
  min-width: 0; /* Prevent flex item from overflowing */
}

.resizer {
  width: 16px; /* 增加宽度以便更容易点击 */
  margin: 0 -2px; /* 负 margin 保持视觉平衡 */
  cursor: col-resize;
  background: rgba(255, 255, 255, 0.3);
  border-left: 1px solid rgba(255, 255, 255, 0.4);
  border-right: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100; /* 确保在最上层 */
  position: relative;
}

.resizer:hover, .resizer:active {
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

.resizer::after {
  content: '||';
  color: rgba(255, 255, 255, 0.8);
  font-size: 10px;
  letter-spacing: 1px;
  user-select: none;
}

.input-panel, .output-panel {
  /* flex: 1; Removed to avoid conflict with specific width settings */
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
}

.header-controls {
  display: flex;
  gap: 20px;
  align-items: center;
}

.lang-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-selector label {
  font-size: 14px;
}

.lang-selector select {
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.mode-selector {
  display: flex;
  align-items: center;
}

.mode-selector label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.mode-selector input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.manual-code-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e9ecef;
}

.code-input-header {
  padding: 10px 20px;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
}

.code-input-header span {
  font-weight: bold;
  color: #495057;
}

.btn-small-clear {
  padding: 4px 10px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  color: #6c757d;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small-clear:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.manual-code-input {
  flex: 1;
  padding: 15px 20px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  background: #f8f9fa;
}

.problem-input-small {
  height: 120px;
  padding: 15px 20px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  background: #fff;
  border-top: 1px solid #e9ecef;
}

/* ── URL 抓取题目 ─────────────────────────────────────── */
.url-fetch-section {
  padding: 6px 12px 2px;
  border-bottom: 1px solid #f0f0f0;
}
.url-fetch-bar {
  display: flex;
  gap: 6px;
}
.url-fetch-input {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}
.url-fetch-input:focus { border-color: #4f46e5; }
.btn-fetch {
  padding: 5px 14px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.btn-fetch:disabled { opacity: 0.5; cursor: not-allowed; }
.fetch-error { color: #dc2626; font-size: 12px; margin-top: 4px; }
.contest-picker { margin-top: 6px; }
.contest-select {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.problem-input {
  flex: 1;
  padding: 20px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
}
.button-group {
  padding: 15px 20px;
  background: #f8f9fa;
  display: flex;
  gap: 10px;
  border-top: 1px solid #e9ecef;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
}

.btn-clear {
  background: #6c757d;
  color: white;
  margin-left: auto;
}

.btn-clear:hover {
  background: #5a6268;
}

.tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 2px solid #e9ecef;
}

.tab {
  flex: 1;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  font-weight: bold;
  color: #6c757d;
  transition: all 0.3s;
}

.tab.active {
  background: white;
  color: #667eea;
  border-bottom: 3px solid #667eea;
}

.tab:hover {
  background: rgba(102, 126, 234, 0.1);
}

.output-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.output-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.output-actions {
  padding: 10px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  gap: 10px;
}

.btn-small {
  padding: 6px 12px;
  background: white;
  border: 1px solid #667eea;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-small:hover {
  background: #667eea;
  color: white;
}

.btn-small-clear {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-small-clear:hover {
  background: #c82333;
}

.rendered-output pre, .rendered-output code {
  max-height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  width: 100%;
  display: block;
}

.btn-text-action {
  background: none;
  border: none;
  color: #1890ff;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  margin-left: auto;
}

.problem-meta-display {
  padding: 15px 20px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.meta-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}
.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.meta-tag {
  background: #eef2f7;
  color: #5c7cfa;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.btn-text-action:hover {
  text-decoration: underline;
  color: #40a9ff;
}
</style>
