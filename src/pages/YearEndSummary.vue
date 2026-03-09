<template>
  <div class="page-container">
    <div class="header-section">
      <div class="header-content">
        <h1>📅 年终总结生成器</h1>
        <p class="subtitle">AI 智能辅助 · 一键生成专业汇报 · 轻松搞定年终大考</p>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧/上方 输入区 -->
      <div class="input-card">
        <div class="card-header">
          <h2>📝 填写关键信息</h2>
          <span class="step-badge">Step 1</span>
        </div>

        <div class="form-grid">
          <div class="form-group span-half">
            <label>💼 岗位/角色 <span class="required">*</span></label>
            <input 
              v-model="form.role" 
              placeholder="例如：高级前端工程师"
              type="text"
              class="modern-input"
            />
          </div>

          <div class="form-group span-half">
            <label>🔑 年度关键词</label>
            <input 
              v-model="form.keywords" 
              placeholder="例如：突破、提效"
              type="text"
              class="modern-input"
            />
          </div>

          <div class="form-group span-full">
            <label>🏆 主要成就 <span class="required">*</span></label>
            <textarea 
              v-model="form.achievements" 
              placeholder="列举核心项目和量化成果：&#10;1. 系统重构，性能提升30%&#10;2. 搭建组件库，开发效率提升50%"
              rows="4"
              class="modern-textarea"
            ></textarea>
            <p class="hint">💡 建议使用 STAR 法则：情境(Situation) -> 任务(Task) -> 行动(Action) -> 结果(Result)</p>
          </div>

          <div class="form-group span-full">
            <label>🏔️ 挑战与反思</label>
            <textarea 
              v-model="form.challenges" 
              placeholder="遇到的困难及应对策略..."
              rows="3"
              class="modern-textarea"
            ></textarea>
          </div>

          <div class="form-group span-full">
            <label>🚀 未来规划</label>
            <textarea 
              v-model="form.plans" 
              placeholder="明年的核心目标与成长方向..."
              rows="3"
              class="modern-textarea"
            ></textarea>
          </div>

          <div class="divider"></div>

          <div class="form-group span-half">
            <label>🎨 写作风格</label>
            <div class="select-wrapper">
              <select v-model="form.style" class="modern-select">
                <option value="正式严谨">👔 正式严谨（汇报首选）</option>
                <option value="轻松幽默">😄 轻松幽默（团队分享）</option>
                <option value="感性走心">❤️ 感性走心（个人回顾）</option>
                <option value="凡尔赛体">🌟 凡尔赛体（朋友圈装X）</option>
              </select>
            </div>
          </div>

          <div class="form-group span-half">
            <label>📏 篇幅要求</label>
            <div class="select-wrapper">
              <select v-model="form.length" class="modern-select">
                <option value="500字">精简版 (~500字)</option>
                <option value="800字">标准版 (~800字)</option>
                <option value="1500字">详细版 (>1500字)</option>
              </select>
            </div>
          </div>

          <div class="span-full advanced-toggle">
            <button type="button" class="text-btn" @click="showAdvanced = !showAdvanced">
              {{ showAdvanced ? '收起高级设置 ▲' : '显示高级设置 ▼' }}
            </button>
          </div>

          <template v-if="showAdvanced">
             <div class="form-group span-half">
                <label>🤖 AI 模型</label>
                <div class="select-wrapper">
                  <select v-model="form.model" class="modern-select">
                    <option value="gemini-3-flash-preview">gemini-3-flash-preview (默认)</option>
                     <option v-for="m in modelOptions" :key="m.id" :value="m.id">
                      {{ m.id }}
                    </option>
                  </select>
                </div>
             </div>
             <div class="form-group span-half">
                <label>🌡️ 创意度 ({{ form.temperature }})</label>
                <div class="range-wrapper">
                  <input 
                    type="range" 
                    v-model.number="form.temperature" 
                    min="0" max="2" step="0.1"
                    class="modern-range"
                  >
                </div>
             </div>
          </template>
        </div>

        <div class="action-area">
          <button class="generate-btn" @click="generateSummary" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>✨ 立即生成总结</span>
          </button>
        </div>
      </div>

      <!-- 右侧/下方 结果区 -->
      <div class="result-card" id="result-area" v-if="generatedSummary || loading">
        <div class="card-header">
          <h2>📄 生成结果 <span v-if="loading" class="status-generating">(AI 思考中...)</span></h2>
          <div class="header-actions" v-if="generatedSummary && !loading">
            <button class="action-btn secondary" @click="downloadSummary">
              📥 下载
            </button>
            <button class="action-btn" @click="copyToClipboard">
              <span v-if="copied">✅ 已复制</span>
              <span v-else>📋 复制</span>
            </button>
          </div>
        </div>
        
        <div class="paper-container">
            <div v-if="loading" class="loading-placeholder">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <p class="loading-text">正在根据您的经历构思文章结构...</p>
            </div>
            <div v-else class="markdown-body">
                <MarkdownViewer :content="generatedSummary" />
            </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import { reactive, ref, nextTick, onMounted } from 'vue'
import axios from 'axios'
import MarkdownViewer from '../components/MarkdownViewer.vue'
import { getModels } from '../utils/models'

export default {
  name: 'YearEndSummary',
  components: {
    MarkdownViewer
  },
  setup() {
    const form = reactive({
      role: '',
      keywords: '',
      achievements: '',
      challenges: '',
      plans: '',
      style: '正式严谨',
      length: '800字',
      model: 'gemini-3-flash-preview',
      temperature: 0.7
    })

    const generatedSummary = ref('')
    const copied = ref(false)
    const loading = ref(false)
    const showAdvanced = ref(false)
    const modelOptions = ref([])

    onMounted(async () => {
      try {
        const list = await getModels()
        if (Array.isArray(list)) {
          modelOptions.value = list
          // 默认选中第一个或者 o4-mini
          if (!form.model && list.length > 0) form.model = list[0].id
        }
      } catch (e) { console.warn('failed to load models', e) }
    })

    const generateSummary = async () => {
      if (!form.role && !form.achievements) {
        alert('请至少填写岗位和主要成就')
        return
      }

      loading.value = true
      generatedSummary.value = '' 
      
      // 平滑滚动到结果区域
      nextTick(() => {
        const resultArea = document.getElementById('result-area')
        if (resultArea) {
          resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })

      try {
        const response = await axios.post('/api/summary', form)
        if (response.data && response.data.result) {
          generatedSummary.value = response.data.result
        } else {
          generatedSummary.value = '> 生成失败：服务器未返回有效内容。'
        }
      } catch (error) {
        console.error('Error:', error)
        generatedSummary.value = `> 生成失败: ${error.response?.data?.error || error.message}`
      } finally {
        loading.value = false
      }
    }

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(generatedSummary.value)
        copied.value = true
        setTimeout(() => {
          copied.value = false
        }, 2000)
      } catch (err) {
        alert('复制失败，请手动复制')
      }
    }

    const downloadSummary = () => {
      if (!generatedSummary.value) return
      
      const dateStr = new Date().toISOString().split('T')[0]
      const roleStr = form.role ? `_${form.role}` : ''
      const filename = `年终总结${roleStr}_${dateStr}.md`
      
      const blob = new Blob([generatedSummary.value], { type: 'text/markdown;charset=utf-8;' })
      const link = document.createElement('a')
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }

    return {
      form,
      generatedSummary,
      loading,
      copied,
      showAdvanced,
      modelOptions,
      generateSummary,
      copyToClipboard,
      downloadSummary
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  background-color: #f8f9fc;
}

.header-section {
  text-align: center;
  margin-bottom: 40px;
}

.header-content h1 {
  font-size: 2.5rem;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #42b883 0%, #0e6ba8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(66, 184, 131, 0.2);
}

.subtitle {
  color: #64748b;
  font-size: 1.1rem;
  font-weight: 500;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* Card Styles */
.input-card, .result-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  padding: 30px;
  transition: all 0.3s ease;
  border: 1px solid #eef2f6;
}

.input-card:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #e2e8f0;
}

.card-header h2 {
  font-size: 1.25rem;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-badge {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
}

/* Form Grid */
.form-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.span-half {
  width: calc(50% - 10px);
}
.span-full {
  width: 100%;
}

@media (max-width: 640px) {
  .span-half {
    width: 100%;
  }
}

.form-group label {
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

.modern-input, .modern-textarea, .modern-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 1rem;
  line-height: 1.5;
  color: #1e293b;
  background-color: #f8fafc;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-input:focus, .modern-textarea:focus, .modern-select:focus {
  outline: none;
  border-color: #42b883;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.15);
}

.modern-input::placeholder, .modern-textarea::placeholder {
  color: #94a3b8;
}

.hint {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 6px;
  margin-bottom: 0;
}

.divider {
  width: 100%;
  height: 1px;
  background-color: #f1f5f9;
  margin: 10px 0;
}

.select-wrapper {
  position: relative;
}

.text-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 8px 0;
  width: 100%;
  text-align: center;
}
.text-btn:hover {
  color: #42b883;
}
.modern-range {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  accent-color: #42b883;
  margin-top: 10px;
}
.range-wrapper {
    display: flex;
    align-items: center;
    height: 100%;
}
.advanced-toggle {
    text-align: center;
    margin: 10px 0;
}

/* Button Styles */
.action-area {
  margin-top: 30px;
}

.generate-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #42b883 0%, #3aa876 100%);
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(66, 184, 131, 0.25);
  display: flex;
  justify-content: center;
  align-items: center;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(66, 184, 131, 0.3);
}

.generate-btn:active:not(:disabled) {
  transform: translateY(0);
}

.generate-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.8;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Result Card */
.result-card {
  animation: slideUp 0.5s ease-out;
  border-top: 4px solid #42b883;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  background: #f1f5f9;
  color: #334155;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.action-btn.secondary {
  background: #fff;
  border: 1px solid #e2e8f0;
}
.action-btn.secondary:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.paper-container {
  background: #fff;
  min-height: 200px;
}

.status-generating {
  font-size: 0.9rem;
  color: #42b883;
  margin-left: 10px;
  font-weight: normal;
}

/* Skeleton Loading */
.loading-placeholder {
  padding: 20px 0;
}

.skeleton-line {
  height: 16px;
  background: #f1f5f9;
  border-radius: 4px;
  margin-bottom: 16px;
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.skeleton-line.title {
  height: 32px;
  width: 60%;
  margin-bottom: 30px;
  background: #e2e8f0;
}

.skeleton-line.short {
  width: 80%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.loading-text {
  text-align: center;
  color: #64748b;
  margin-top: 20px;
  font-style: italic;
}
</style>