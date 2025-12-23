<template>
  <div class="solution-report-root">
    <h2>AI 解题报告生成器</h2>

    <div class="toolbar">
      <div class="toolbar-left">
        <label class="label">模型:</label>
        <select v-model="model">
          <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button @click="generate" :disabled="loading || !problemText.trim()" class="btn-primary">
          {{ loading ? '⏳ 生成中...' : '🚀 生成报告' }}
        </button>
        <button @click="clear" class="btn-secondary">🧹 清空</button>
        <button @click="downloadHtml" :disabled="!resultHtml" class="btn-secondary">💾 下载 HTML</button>
      </div>
    </div>

    <div class="content-area">
      <div class="input-panel">
        <div class="input-section" style="flex: 2">
          <label class="section-label">📝 题目描述</label>
          <textarea 
            v-model="problemText" 
            placeholder="粘贴题目内容..."
            :disabled="loading"
          ></textarea>
        </div>
        <div class="input-section" style="flex: 1">
          <label class="section-label">💡 参考思路 (可选)</label>
          <textarea 
            v-model="referenceText" 
            placeholder="输入解题思路或提示..."
            :disabled="loading"
          ></textarea>
        </div>
        <div class="input-section" style="flex: 2">
          <label class="section-label">💻 AC 代码</label>
          <textarea 
            v-model="codeText" 
            placeholder="粘贴通过的代码..."
            :disabled="loading"
          ></textarea>
        </div>
      </div>

      <div class="output-panel">
        <div class="panel-header">
          <h3>预览</h3>
        </div>
        <div class="preview-area" v-if="resultHtml">
          <iframe :srcdoc="resultHtml" frameborder="0" width="100%" height="100%"></iframe>
        </div>
        <div class="preview-area empty" v-else>
          <p>✨ 生成的 HTML 报告将显示在这里</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import request from '../utils/request'
import { getModels } from '../utils/models'

export default {
  inject: ['showToastMessage'],
  data() {
    return {
      problemText: '',
      codeText: '',
      referenceText: '',
      resultHtml: '',
      loading: false,
      model: 'gemini-2.0-flash',
      rawModelOptions: []
    }
  },
  computed: {
    user() {
      try {
        return JSON.parse(localStorage.getItem('user_info'))
      } catch (e) { return null }
    },
    isPremium() {
      return this.user && (this.user.role === 'admin' || this.user.role === 'premium' || this.user.role === 'teacher' || this.user.priv === -1)
    },
    modelOptions() {
      const all = this.rawModelOptions || []
      if (this.isPremium) return all
      return all.filter(m => m.id === 'gemini-2.0-flash')
    }
  },
  async mounted() {
    this.rawModelOptions = await getModels()
    if (this.modelOptions.length > 0) {
      this.model = this.modelOptions[0].id
    }

    // 检查是否有自动生成任务
    const reportDataStr = localStorage.getItem('solution_report_data');
    if (reportDataStr) {
      try {
        const reportData = JSON.parse(reportDataStr);
        if (reportData.problem) this.problemText = reportData.problem;
        if (reportData.code) this.codeText = reportData.code;
        if (reportData.reference) this.referenceText = reportData.reference;
        
        // 清除数据
        localStorage.removeItem('solution_report_data');

        if (reportData.autoStart && this.problemText && this.codeText) {
          this.$nextTick(() => {
            this.generate();
          });
        }
      } catch (e) {
        console.error('Failed to parse report data', e);
      }
    }
  },
  methods: {
    async generate() {
      if (!this.problemText.trim()) return
      
      this.loading = true
      this.resultHtml = ''
      
      try {
        const res = await request.post('/api/solution-report', {
          problem: this.problemText,
          code: this.codeText,
          reference: this.referenceText,
          model: this.model
        })
        
        if (res.html) {
          this.resultHtml = res.html
          this.showToastMessage('生成成功！')
        }
      } catch (e) {
        console.error(e)
        this.showToastMessage('生成失败: ' + (e.response?.data?.error || e.message))
      } finally {
        this.loading = false
      }
    },
    clear() {
      this.problemText = ''
      this.codeText = ''
      this.referenceText = ''
      this.resultHtml = ''
    },
    downloadHtml() {
      if (!this.resultHtml) return
      
      let filename = 'solution_report.html'
      // 尝试从 HTML 中提取标题
      const titleMatch = this.resultHtml.match(/<h1>(.*?)<\/h1>/) || this.resultHtml.match(/<title>(.*?)<\/title>/)
      if (titleMatch && titleMatch[1]) {
        // 移除 HTML 标签，只保留文本
        let title = titleMatch[1].replace(/<[^>]+>/g, '').trim()
        // 替换非法字符
        title = title.replace(/[\\/:*?"<>|]/g, '_')
        if (title) {
          filename = `${title}_解题报告.html`
        }
      }

      const blob = new Blob([this.resultHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.solution-report-root {
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.content-area {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0; /* Important for nested flex scrolling */
}

.input-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}

.section-label {
  font-weight: bold;
  margin-bottom: 10px;
  display: block;
}

textarea {
  flex: 1;
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
}

.output-panel {
  flex: 1;
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.preview-area {
  flex: 1;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}

.preview-area.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  background: #f9f9f9;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #409eff;
  color: white;
}

.btn-primary:hover {
  background: #66b1ff;
}

.btn-primary:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f4f4f5;
  color: #606266;
}

.btn-secondary:hover {
  background: #e9e9eb;
}

select {
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
</style>
