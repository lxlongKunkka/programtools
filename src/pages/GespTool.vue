<template>
  <div class="gesp-tool page-container">
    <h1>GESP 试卷转换工具</h1>
    <p class="subtitle">上传 GESP 考级 PDF 或粘贴 HTML，自动提取题目、选项和图片，生成 Hydro 可用的导入文件。</p>

    <div class="model-selector" style="margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <label style="font-weight: bold; margin-right: 10px;">AI 模型选择:</label>
      <select v-model="selectedModel" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd; min-width: 200px;">
        <option v-for="model in availableModels" :key="model.id" :value="model.id">
          {{ model.name || model.id }}
        </option>
      </select>
    </div>

    <div class="tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'pdf' }" @click="activeTab = 'pdf'">PDF 上传</button>
      <button class="tab-btn" :class="{ active: activeTab === 'html' }" @click="activeTab = 'html'">HTML 粘贴</button>
      <button class="tab-btn" :class="{ active: activeTab === 'batch' }" @click="activeTab = 'batch'">批量 HTML</button>
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

    <div v-if="activeTab === 'batch'" class="upload-section html-mode">
      <div class="batch-controls" style="text-align: left; margin-bottom: 15px;">
        <input type="file" accept=".html,.htm" multiple @change="handleBatchFileSelect" :disabled="batchProcessing" />
        <div style="margin-top: 10px;">
          <label><input type="checkbox" v-model="batchOptions.refine"> 启用 AI 优化题目 (Refine)</label>
          <label style="margin-left: 15px;"><input type="checkbox" v-model="batchOptions.answers"> 启用 AI 生成答案 (Answers)</label>
        </div>
      </div>
      
      <div v-if="batchFiles.length > 0" class="batch-list" style="text-align: left; max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px;">
        <div v-for="file in batchFiles" :key="file.id" class="batch-item" style="padding: 5px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between;">
          <span>{{ file.name }}</span>
          <span :class="getStatusClass(file.status)">{{ file.progress || file.status }}</span>
        </div>
      </div>

      <div style="margin-top: 15px;">
        <button class="btn primary" @click="processBatch" :disabled="batchProcessing || batchFiles.length === 0">
          {{ batchProcessing ? '批量处理中...' : '开始批量处理' }}
        </button>
        <button class="btn success" @click="downloadBatchZip" :disabled="batchProcessing || !hasBatchResults" style="background-color: #e67e22;">
          全部打包下载 ZIP
        </button>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="result && activeTab !== 'batch'" class="result-section">
      <div class="download-actions">
        <button class="btn success" @click="downloadFile(result.xml, 'xml')">下载 FPS XML (推荐)</button>
        <button class="btn info" @click="downloadFile(result.md, 'original.md')">下载原始 Markdown</button>
        <button class="btn warning" @click="refineMarkdown" :disabled="refining">
          {{ refining ? 'AI 优化中...' : 'AI 优化 Markdown' }}
        </button>
        <button v-if="editableMarkdown !== result.md" class="btn primary" @click="downloadFile(editableMarkdown, 'refined.md')">下载优化后 Markdown</button>
        <button class="btn info" @click="downloadConfig" :disabled="!result || !result.json.length">下载 config.yaml</button>
        <button class="btn success" @click="downloadSolutionMd" :disabled="!result || !result.json.length">下载含解析 Markdown</button>
        <button class="btn primary" @click="downloadZip" :disabled="!result || !result.json.length" style="background-color: #e67e22;">打包下载 ZIP</button>
      </div>
      
      <div class="ai-actions" style="text-align: center; margin-bottom: 20px;">
        <button class="btn warning" @click="autoGenerateAnswers" :disabled="generatingAnswers || !result || !result.json.length">
          {{ generatingAnswers ? `AI 生成中 (${generatedCount}/${result.json.length})...` : 'AI 自动生成答案与解析' }}
        </button>
      </div>

      <div class="markdown-editor" style="margin: 20px 0;">
        <h3>Markdown 内容 (可编辑)</h3>
        <textarea v-model="editableMarkdown" style="width: 100%; height: 300px; font-family: monospace; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
      </div>

      <div class="preview-section">
        <h2>题目预览与编辑 (共 {{ result.json.length }} 题)</h2>
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
          
          <div class="prob-edit-section">
            <div class="edit-row">
              <div class="edit-group">
                <label>正确答案:</label>
                <input v-model="prob.userAnswer" placeholder="A/B/C/D/T/F" class="input-short">
              </div>
              <div class="edit-group">
                <label>分数:</label>
                <input type="number" v-model.number="prob.score" class="input-short">
              </div>
            </div>
            <div class="edit-group full-width">
              <label>题目解析:</label>
              <textarea v-model="prob.explanation" placeholder="输入题目解析..." class="input-area"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { marked } from 'marked'
import JSZip from 'jszip'

const activeTab = ref('pdf')
const htmlInput = ref('')
const selectedFile = ref(null)
const loading = ref(false)
const refining = ref(false)
const generatingAnswers = ref(false)
const generatedCount = ref(0)
const error = ref(null)
const result = ref(null)
const editableMarkdown = ref('')

const selectedModel = ref('gemini-2.5-flash')
const availableModels = ref([])
const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
const isAdmin = userInfo.role === 'admin' || userInfo.priv === -1

onMounted(async () => {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    const res = await axios.get('/api/models', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    
    const allModels = res.data || []
    
    if (isAdmin) {
        availableModels.value = allModels
    } else {
        availableModels.value = allModels.filter(m => {
            if (m.id === 'gemini-2.0-flash' || m.id === 'gemini-2.5-flash') return true
            if (m.role === 'admin') return false
            return true
        })
    }
    
    // Prefer gemini-2.5-flash if available, otherwise keep default or pick first
    if (availableModels.value.find(m => m.id === 'gemini-2.5-flash')) {
        selectedModel.value = 'gemini-2.5-flash'
    } else if (!availableModels.value.find(m => m.id === selectedModel.value)) {
        if (availableModels.value.length > 0) {
            selectedModel.value = availableModels.value[0].id
        }
    }
    
  } catch (e) {
    console.error('Failed to fetch models', e)
    availableModels.value = [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
    ]
    if (isAdmin) {
        availableModels.value.push({ id: 'o4-mini', name: 'o4-mini' })
    }
  }
})

// Batch Mode State
const batchFiles = ref([])
const batchProcessing = ref(false)
const batchOptions = ref({
  refine: true,
  answers: true
})

const hasBatchResults = computed(() => {
  return batchFiles.value.some(f => f.status === 'done')
})

const getStatusClass = (status) => {
  if (status === 'done') return 'text-success'
  if (status === 'error') return 'text-error'
  if (status === 'processing') return 'text-primary'
  return 'text-gray'
}

const handleBatchFileSelect = (event) => {
  const files = Array.from(event.target.files)
  batchFiles.value = files.map(f => ({
    id: Math.random().toString(36).substr(2, 9),
    file: f,
    name: f.name,
    status: 'pending',
    progress: '等待处理',
    result: null
  }))
}

const processBatch = async () => {
  if (batchFiles.value.length === 0) return
  batchProcessing.value = true
  
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
  
  for (const item of batchFiles.value) {
    if (item.status === 'done') continue // Skip already done
    
    item.status = 'processing'
    item.progress = '读取文件中...'
    
    try {
      // 1. Read File
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsText(item.file)
      })
      
      // 2. Convert HTML
      item.progress = '转换 HTML...'
      const convertRes = await axios.post('/api/gesp/convert-html', {
        htmlContent: text
      }, { headers: { 'Authorization': `Bearer ${token}` } })
      
      let md = convertRes.data.md
      let serverTitle = convertRes.data.title
      
      let { problems, title: parsedTitle } = parseMarkdownToJson(md)
      
      // Priority: Server Title > Parsed Title > Filename
      // But ignore "题目列表" as it is a generic fallback
      let title = serverTitle
      if (!title || title === '题目列表') {
          title = parsedTitle
      }
      if (!title || title === '题目列表') {
        title = item.name.replace(/\.[^/.]+$/, "")
      }
      
      // 3. AI Refine (Optional)
      if (batchOptions.value.refine) {
        item.progress = 'AI 优化题目...'
        try {
          const refineRes = await axios.post('/api/refine-hydro', { 
            text: md,
            model: selectedModel.value
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (refineRes.data.result) {
            md = refineRes.data.result
            // Re-parse after refine
            const parsed = parseMarkdownToJson(md)
            problems = parsed.problems
            // Restore title if lost
            if (parsed.title) title = parsed.title
            else {
                // Force title back into MD
                md = `# ${title}\n\n${md}`
            }
          }
        } catch (e) {
          console.error('Refine failed for ' + item.name, e)
        }
      }
      
      // 4. AI Answers (Optional)
      if (batchOptions.value.answers) {
        item.progress = 'AI 生成答案...'
        let count = 0
        for (const prob of problems) {
          try {
            const ansRes = await axios.post('/api/generate-answer', {
              problem: { stem: prob.stem, options: prob.options },
              model: selectedModel.value
            }, { headers: { 'Authorization': `Bearer ${token}` } })
            
            if (ansRes.data.answer) prob.userAnswer = ansRes.data.answer
            if (ansRes.data.explanation) prob.explanation = ansRes.data.explanation
          } catch (e) {
            console.error('Answer gen failed', e)
          }
          count++
          item.progress = `AI 生成答案 (${count}/${problems.length})...`
        }
      }
      
      item.result = { md, json: problems, title }
      item.status = 'done'
      item.progress = '完成'
      
    } catch (err) {
      console.error('Batch processing error:', err)
      if (err.response && err.response.data) {
          console.error('Server Error Details:', err.response.data)
          if (err.response.data.stderr) {
              console.error('Python Stderr:', err.response.data.stderr)
          }
      }
      item.status = 'error'
      item.progress = '失败: ' + (err.message || '未知错误')
    }
  }
  
  batchProcessing.value = false
}

const downloadBatchZip = async () => {
  const zip = new JSZip()
  let count = 0
  const usedNames = new Set()
  
  for (const item of batchFiles.value) {
    if (item.status !== 'done' || !item.result) continue
    
    let folderName = item.result.title || item.name.replace(/\.[^/.]+$/, "")
    // Sanitize folder name
    folderName = folderName.replace(/[\\/:*?"<>|]/g, "_").trim()
    
    // Ensure uniqueness
    let uniqueName = folderName
    let counter = 1
    while (usedNames.has(uniqueName)) {
        uniqueName = `${folderName} (${counter})`
        counter++
    }
    usedNames.add(uniqueName)
    
    const folder = zip.folder(uniqueName)
    
    // 1. problem.yaml
    const problemYaml = `title: ${uniqueName}\ntag:\n  - GESP\n`
    folder.file("problem.yaml", problemYaml)
    
    // 2. problem_zh.md
    // Ensure title is in MD
    let finalMd = item.result.md
    if (!finalMd.startsWith('# ')) {
        finalMd = `# ${uniqueName}\n\n${finalMd}`
    }
    folder.file("problem_zh.md", finalMd)
    
    // 3. testdata/config.yaml
    let configYaml = "type: objective\nanswers:\n"
    item.result.json.forEach(p => {
      const ans = p.userAnswer ? p.userAnswer.trim().toUpperCase() : ''
      const score = p.score || 2
      if (ans) {
          configYaml += `  '${p.id}':\n  - ${ans}\n  - ${score}\n`
      }
    })
    const testdata = folder.folder("testdata")
    testdata.file("config.yaml", configYaml)
    
    // 4. additional_file/solution.md
    let solutionMd = `# ${uniqueName} - 题目与解析\n\n`
    item.result.json.forEach(p => {
      solutionMd += `${p.id}), ${p.stem}\n`
      solutionMd += `{{ select(${p.id}) }}\n`
      if (p.options) {
          if (Array.isArray(p.options)) {
               p.options.forEach(opt => {
                  solutionMd += `- ${opt}\n`
              })
          } else {
               Object.entries(p.options).forEach(([k, v]) => {
                   solutionMd += `- ${k}. ${v}\n`
               })
          }
      }
      solutionMd += `\n> **答案**: ${p.userAnswer || '未设置'}\n`
      if (p.explanation) {
          solutionMd += `> **解析**: ${p.explanation}\n`
      }
      solutionMd += `\n---\n\n`
    })
    const additional = folder.folder("additional_file")
    additional.file("solution.md", solutionMd)
    
    count++
  }
  
  if (count === 0) {
    alert('没有可下载的处理结果')
    return
  }
  
  try {
      const fileName = `GESP_Batch_Export_${new Date().toISOString().slice(0,10)}.zip`
      const content = await zip.generateAsync({type:"blob"})
      const url = window.URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Always send email in background
      sendZipToEmail(content, fileName)
  } catch (e) {
      console.error("Batch ZIP generation failed", e)
      alert("打包下载失败")
  }
}

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
    const { problems, title } = parseMarkdownToJson(response.data.md)
    result.value = {
      md: response.data.md,
      xml: null, // No XML yet
      json: problems,   // Parse MD to JSON for preview
      title: title
    }
    editableMarkdown.value = response.data.md
    
  } catch (err) {
    console.error('HTML Convert Error:', err)
    if (err.response && err.response.data) {
        console.error('Server Error Details:', err.response.data)
        if (err.response.data.stderr) {
            console.error('Python Stderr:', err.response.data.stderr)
        }
    }
    const data = err.response?.data
    if (data) {
        error.value = `HTML 转换失败: ${data.error || ''} ${data.details || ''} ${data.stderr || ''}`
    } else {
        error.value = 'HTML 转换失败: ' + (err.message || '未知错误')
    }
  } finally {
    loading.value = false
  }
}

const parseMarkdownToJson = (md) => {
  if (!md) return { problems: [], title: '' }
  
  const problems = []
  const lines = md.split('\n')
  let currentProb = null
  let currentStem = []
  let currentOptions = []
  let title = ''

  // Try to extract title from the first non-empty line if it starts with #
  for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      if (line.startsWith('# ')) {
          const t = line.substring(2).trim()
          // Ignore if it looks like a section header (e.g. "一、", "1.", "Part 1")
          // Also ignore if it is just "题目列表" which is a default fallback
          const isSection = /^(一|二|三|四|五|六|七|八|九|十|\d+)[、\.]/.test(t)
          if (!isSection && t !== '题目列表') {
              title = t
          }
      }
      break // Only check the first content line
  }
  
  const flushProb = () => {
    if (currentProb) {
      currentProb.stem = currentStem.join('\n').trim()
      // 提取图片 URL
      const images = extractImageUrls(currentProb.stem)
      currentProb.images = images
      currentProb.options = currentOptions
      problems.push(currentProb)
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Match start of problem: "1), "
    const startMatch = line.match(/^(\d+)\),\s*(.*)/)
    if (startMatch) {
      flushProb()
      currentProb = {
        id: startMatch[1],
        type_name: '选择/判断', 
        stem: '',
        options: [],
        answer: '',
        userAnswer: '', // Manual answer
        score: 2,       // Default score
        explanation: '' // Manual explanation
      }
      currentStem = [startMatch[2]] 
      currentOptions = []
      continue
    }
    
    if (!currentProb) continue
    
    const optMatch = line.match(/^-\s*([A-Z]\.|true|false)?\s*(.*)/)
    if (optMatch) {
      let optText = line.substring(1).trim()
      currentOptions.push(optText)
    } else if (line.includes('{{ select(')) {
      // Ignore select marker
    } else {
      currentStem.push(lines[i]) 
    }
  }
  
  flushProb()
  return { problems, title }
}

// 提取 Markdown 中的图片 URL 或占位符
const extractImageUrls = (text) => {
  if (!text) return []
  const images = []

  // 1. 匹配真实的网络 URL 图片
  const urlRegex = /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g
  let match
  while ((match = urlRegex.exec(text)) !== null) {
    images.push({
      alt: match[1],
      url: match[2]
    })
  }

  // 2. 如果没有找到真实图片，检查是否有占位符（如 [[IMAGE_0]]）
  // 这种情况通常发生在 AI 优化后，占位符没有被正确恢复
  if (images.length === 0) {
    const placeholderRegex = /\[\[IMAGE_\d+\]\]/g
    let placeholderMatch
    while ((placeholderMatch = placeholderRegex.exec(text)) !== null) {
      // 保存占位符信息，标记为占位符类型
      images.push({
        alt: placeholderMatch[1],
        url: placeholderMatch[0], // 保存原始占位符
        isPlaceholder: true
      })
    }
  }

  return images
}

const downloadConfig = () => {
  if (!result.value || !result.value.json) return
  
  let yaml = "type: objective\nanswers:\n"
  
  result.value.json.forEach(p => {
    const ans = p.userAnswer ? p.userAnswer.trim().toUpperCase() : ''
    const score = p.score || 2
    
    if (ans) {
        yaml += `  '${p.id}':\n  - ${ans}\n  - ${score}\n`
    }
  })
  
  downloadFile(yaml, 'config.yaml')
}

const downloadSolutionMd = () => {
  if (!result.value || !result.value.json) return
  
  let md = editableMarkdown.value
  // Append explanations to the end of the file or try to insert them?
  // Appending to the end is safer but less readable if we want it per problem.
  // Let's reconstruct MD from JSON to be safe and include explanations.
  
  let newMd = "# GESP 题目与解析\n\n"
  
  result.value.json.forEach(p => {
    newMd += `${p.id}), ${p.stem}\n`
    newMd += `{{ select(${p.id}) }}\n`
    p.options.forEach(opt => {
        newMd += `- ${opt}\n`
    })
    newMd += `\n> **答案**: ${p.userAnswer || '未设置'}\n`
    if (p.explanation) {
        newMd += `> **解析**: ${p.explanation}\n`
    }
    newMd += `\n---\n\n`
  })
  
  downloadFile(newMd, 'solution.md')
}

const downloadZip = async () => {
  if (!result.value || !result.value.json) return
  
  // --- Sync Editor Content to JSON before download ---
  // This ensures manual edits in the editor are reflected in solution.md and config.yaml
  const { problems: currentProblems, title: currentTitle } = parseMarkdownToJson(editableMarkdown.value)
  
  // Merge existing answers/explanations
  const oldMap = new Map(result.value.json.map(p => [p.id, p]))
  currentProblems.forEach(p => {
      const old = oldMap.get(p.id)
      if (old) {
          if (old.userAnswer) p.userAnswer = old.userAnswer
          if (old.explanation) p.explanation = old.explanation
          if (old.score) p.score = old.score
      }
  })
  
  result.value.json = currentProblems
  if (currentTitle) result.value.title = currentTitle
  // --------------------------------------------------

  const zip = new JSZip()
  
  // 1. problem.yaml
  let title = 'GESP Problem'
  if (result.value && result.value.title) {
      title = result.value.title
  } else if (selectedFile.value && selectedFile.value.name) {
    title = selectedFile.value.name.replace(/\.[^/.]+$/, "")
  }
  
  const problemYaml = `title: ${title}
tag:
  - GESP
`
  zip.file("problem.yaml", problemYaml)
  
  // 2. problem_zh.md
  zip.file("problem_zh.md", editableMarkdown.value)
  
  // 3. testdata/config.yaml
  let configYaml = "type: objective\nanswers:\n"
  result.value.json.forEach(p => {
    const ans = p.userAnswer ? p.userAnswer.trim().toUpperCase() : ''
    const score = p.score || 2
    if (ans) {
        configYaml += `  '${p.id}':\n  - ${ans}\n  - ${score}\n`
    }
  })
  const testdata = zip.folder("testdata")
  testdata.file("config.yaml", configYaml)
  
  // 4. additional_file/solution.md
  let solutionMd = `# ${title} - 题目与解析\n\n`
  result.value.json.forEach(p => {
    solutionMd += `${p.id}), ${p.stem}\n`
    solutionMd += `{{ select(${p.id}) }}\n`
    if (p.options) {
        if (Array.isArray(p.options)) {
             p.options.forEach(opt => {
                solutionMd += `- ${opt}\n`
            })
        } else {
             Object.entries(p.options).forEach(([k, v]) => {
                 solutionMd += `- ${k}. ${v}\n`
             })
        }
    }
   
    solutionMd += `\n> **答案**: ${p.userAnswer || '未设置'}\n`
    if (p.explanation) {
        solutionMd += `> **解析**: ${p.explanation}\n`
    }
    solutionMd += `\n---\n\n`
  })
  
  const additional = zip.folder("additional_file")
  additional.file("solution.md", solutionMd)
  
  // Generate and download
  try {
      const content = await zip.generateAsync({type:"blob"})
      const url = window.URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Always send email in background
      sendZipToEmail(content, `${title}.zip`)
  } catch (e) {
      console.error("ZIP generation failed", e)
      alert("打包下载失败")
  }
}

const sendZipToEmail = async (blob, fileName) => {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onloadend = async () => {
        const base64data = reader.result
        await axios.post('/api/gesp/send-email', {
            zipData: base64data,
            fileName: fileName
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        console.log(`Email sent to 110076790@qq.com`)
    }
  } catch (e) {
      console.error("Email send failed", e)
      // Silent fail or log only, don't disturb user
  }
}

const autoGenerateAnswers = async () => {
  if (!result.value || !result.value.json) return
  if (!confirm('确定要使用 AI 自动生成所有题目的答案和解析吗？这将消耗一定时间。')) return

  generatingAnswers.value = true
  generatedCount.value = 0
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

  try {
    // Process sequentially to avoid rate limits
    for (const prob of result.value.json) {
      // Skip if already has answer (optional, currently overwriting or filling empty)
      // if (prob.userAnswer) continue 

      try {
        const response = await axios.post('/api/generate-answer', {
          problem: {
            stem: prob.stem,
            options: prob.options
          },
          model: selectedModel.value
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        const data = response.data
        if (data.answer) {
          prob.userAnswer = data.answer
        }
        if (data.explanation) {
          prob.explanation = data.explanation
        }
      } catch (e) {
        console.error(`Failed to generate answer for problem ${prob.id}:`, e)
      }
      
      generatedCount.value++
    }
  } catch (err) {
    console.error('Auto generate error:', err)
    alert('AI 生成过程中发生错误')
  } finally {
    generatingAnswers.value = false
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
      // Set title from filename for PDF
      if (selectedFile.value && selectedFile.value.name) {
          result.value.title = selectedFile.value.name.replace(/\.[^/.]+$/, "")
      }
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
      text: editableMarkdown.value,
      model: selectedModel.value
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.data.result) {
      let refined = response.data.result
      
      // 强制恢复标题逻辑
      let expectedTitle = ''
      if (result.value && result.value.title) {
          expectedTitle = result.value.title
      } else if (selectedFile.value && selectedFile.value.name) {
          expectedTitle = selectedFile.value.name.replace(/\.[^/.]+$/, "")
      }
      
      if (expectedTitle) {
        const lines = refined.trim().split('\n')
        const firstLine = lines[0].trim()
        // 如果第一行不是以 # 开头，或者看起来像章节标题（如 # 一、...），则插入标题
        const isChapterTitle = /^#\s*[一二三四五六七八九十\d]+[、\.]/.test(firstLine)
        if (!firstLine.startsWith('# ') || isChapterTitle) {
            refined = `# ${expectedTitle}\n\n${refined}`
        }
      }

      editableMarkdown.value = refined
      
      // 重新解析 JSON 以更新 result.value.json，确保下载时使用的是优化后的文本
      // 同时保留已有的答案和解析
      const { problems: newProblems, title: newTitle } = parseMarkdownToJson(refined)
      
      // Merge old answers/explanations
      if (result.value && result.value.json) {
          const oldMap = new Map(result.value.json.map(p => [p.id, p]))
          newProblems.forEach(p => {
              const old = oldMap.get(p.id)
              if (old) {
                  if (old.userAnswer) p.userAnswer = old.userAnswer
                  if (old.explanation) p.explanation = old.explanation
                  if (old.score) p.score = old.score
              }
          })
      }
      
      result.value.json = newProblems
      if (newTitle) result.value.title = newTitle
      
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
.prob-edit-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #eee;
}
.edit-row {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}
.edit-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.edit-group.full-width {
  width: 100%;
}
.input-short {
  width: 120px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.input-area {
  width: 100%;
  height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
}
.error-msg {
  color: #e74c3c;
  margin: 10px 0;
  text-align: center;
}
.download-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 30px;
}
</style>
