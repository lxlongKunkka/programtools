<template>
  <div class="gesp-tool page-container">
    <h1>GESP 试卷转换工具</h1>
    <p class="subtitle">上传 GESP 考级 PDF 或粘贴 HTML，自动提取题目、选项和图片，生成 Hydro 可用的导入文件。</p>

    <div class="tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'pdf' }" @click="activeTab = 'pdf'">PDF 上传</button>
      <button class="tab-btn" :class="{ active: activeTab === 'html' }" @click="activeTab = 'html'">HTML 粘贴</button>
    </div>

    <div v-if="activeTab === 'pdf'" class="upload-section">
      <input type="file" accept=".pdf" @change="handleFileSelect" :disabled="loading" />
      <button class="btn primary" @click="uploadAndConvert" :disabled="!selectedFile || loading">
        {{ loading ? '处理中...' : '开始转换' }}
      </button>
    </div>

    <div v-if="activeTab === 'html'" class="upload-section html-mode">
      <textarea v-model="htmlInput" placeholder="在此粘贴 HTML 内容..." class="html-input"></textarea>
      <button class="btn primary" @click="convertHtml" :disabled="!htmlInput || loading">
        {{ loading ? '处理中...' : '开始转换 HTML' }}
      </button>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="result" class="result-section">
      <div class="download-actions">
        <button class="btn success" @click="downloadFile(result.xml, 'xml')">下载 FPS XML (推荐)</button>
        <button class="btn info" @click="downloadFile(result.md, 'original.md')">下载原始 Markdown</button>
        <button class="btn warning" @click="refineMarkdown" :disabled="refining">
          {{ refining ? 'AI 优化中...' : 'AI 优化 Markdown' }}
        </button>
        <button v-if="editableMarkdown !== result.md" class="btn primary" @click="downloadFile(editableMarkdown, 'refined.md')">下载优化后 Markdown</button>
      </div>

      <div class="markdown-editor" style="margin: 20px 0;">
        <h3>Markdown 内容 (可编辑)</h3>
        <textarea v-model="editableMarkdown" style="width: 100%; height: 300px; font-family: monospace; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
      </div>

      <div class="preview-section">
        <h2>题目预览 (共 {{ result.json.length }} 题)</h2>
        <div v-for="prob in result.json" :key="prob.id" class="problem-card">
          <div class="prob-header">
            <span class="prob-id">#{{ prob.id }}</span>
            <span class="prob-type">{{ prob.type_name }}</span>
          </div>
          <div class="prob-stem" v-html="renderMarkdown(prob.stem)"></div>
          
          <div v-if="prob.options" class="prob-options">
            <div v-if="Array.isArray(prob.options)">
              <div v-for="(opt, idx) in prob.options" :key="idx">{{ opt }}</div>
            </div>
            <div v-else>
              <div v-for="(val, key) in prob.options" :key="key">{{ key }}. {{ val }}</div>
            </div>
          </div>
          
          <div v-if="prob.answer" class="prob-answer">
            <strong>参考答案:</strong> {{ Array.isArray(prob.answer) ? prob.answer.join(', ') : prob.answer }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { marked } from 'marked'

const activeTab = ref('pdf')
const htmlInput = ref('')
const selectedFile = ref(null)
const loading = ref(false)
const refining = ref(false)
const error = ref(null)
const result = ref(null)
const editableMarkdown = ref('')

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0]
  error.value = null
  result.value = null
  editableMarkdown.value = ''
}

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

const convertHtml = async () => {
  if (!htmlInput.value) return
  
  loading.value = true
  error.value = null
  result.value = null // Clear previous result
  
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    const response = await axios.post('/api/gesp/convert-html', {
      htmlContent: htmlInput.value
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    // For HTML conversion, we only get MD back initially
    // We construct a fake 'result' object so the UI can show the editor
    result.value = {
      md: response.data.md,
      xml: null, // No XML yet
      json: []   // No JSON preview yet
    }
    editableMarkdown.value = response.data.md
    
  } catch (err) {
    console.error(err)
    error.value = err.response?.data?.error || 'HTML 转换失败'
  } finally {
    loading.value = false
  }
}

const uploadAndConvert = async () => {
  if (!selectedFile.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const base64Data = await fileToBase64(selectedFile.value)
    // Login.vue uses 'auth_token', not 'token'
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    
    const response = await axios.post('/api/gesp/convert', {
      fileData: base64Data,
      fileName: selectedFile.value.name
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.data.success) {
      result.value = response.data.data
      editableMarkdown.value = result.value.md
    } else {
      error.value = '转换失败'
    }
  } catch (err) {
    console.error(err)
    if (err.response && err.response.status === 401) {
      error.value = '登录已过期，请重新登录'
      // Optional: redirect to login
      // import { useRouter } from 'vue-router'
      // const router = useRouter()
      // router.push('/login')
    } else {
      error.value = err.response?.data?.error || err.message || '发生错误'
    }
  } finally {
    loading.value = false
  }
}

const refineMarkdown = async () => {
  if (!editableMarkdown.value) return
  
  refining.value = true
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    // Note: ai routes are mounted at /api, so it is /api/refine-hydro, not /api/ai/refine-hydro
    const response = await axios.post('/api/refine-hydro', {
      text: editableMarkdown.value
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.data.result) {
      editableMarkdown.value = response.data.result
    }
  } catch (err) {
    console.error(err)
    alert('AI 优化失败: ' + (err.response?.data?.error || err.message))
  } finally {
    refining.value = false
  }
}

const downloadFile = (content, extension) => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const baseName = selectedFile.value ? selectedFile.value.name : 'gesp_export'
  a.download = baseName + '.' + extension
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

const renderMarkdown = (text) => {
  if (!text) return ''
  // 手动处理 Base64 图片，防止 marked 解析失败或显示源码
  // 匹配 ![...](data:image/...) 格式
  // 注意：Base64 字符串可能非常长，且可能包含换行符（虽然标准不建议，但为了保险）
  const imgRegex = /!\[(.*?)\]\((data:image\/.*?;base64,[\s\S]*?)\)/g
  
  let processedText = text.replace(imgRegex, (match, alt, src) => {
    // 移除 src 中的换行符，确保浏览器能正确识别
    const cleanSrc = src.replace(/\s/g, '')
    return `<img src="${cleanSrc}" alt="${alt}" style="max-width: 100%; display: block; margin: 10px 0;" />`
  })

  return marked(processedText)
}
</script>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}
.tab-btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
}
.tab-btn.active {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #1890ff;
}
.upload-section {
  margin: 30px 0;
  padding: 20px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
}
.html-mode {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.html-input {
  width: 100%;
  height: 200px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
  resize: vertical;
}
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 0 10px;
}
.btn.primary { background-color: #3498db; color: white; }
.btn.success { background-color: #2ecc71; color: white; }
.btn.info { background-color: #9b59b6; color: white; }
.btn:disabled { background-color: #ccc; cursor: not-allowed; }

.problem-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.prob-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #7f8c8d;
  font-size: 0.9em;
}
.prob-stem :deep(img) {
  max-width: 100%;
}
.prob-options {
  margin: 15px 0;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
}
.prob-answer {
  margin-top: 10px;
  color: #27ae60;
}
.error-msg {
  color: #e74c3c;
  margin: 10px 0;
  text-align: center;
}
.download-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}
</style>
