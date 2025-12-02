<template>
	<div class="chat-root">
		<h2>对话 (上下文模式)</h2>

		<div class="chat-toolbar">
			<div>
				<label class="label">模型:</label>
				<select v-model="model">
					<option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
				</select>
			</div>
			<div>
				<button @click="showSettings = !showSettings">{{ showSettings ? '隐藏设置' : '高级设置' }}</button>
				<button @click="clearChat">清空对话</button>
			</div>
		</div>

		<!-- 高级设置面板 -->
		<div v-if="showSettings" class="settings-panel">
			<div class="setting-row">
				<label>系统提示词 (System Prompt):</label>
				<textarea v-model="systemPrompt" placeholder="定义 AI 的角色、性格、说话风格等，例如：你是一个温柔体贴的陪聊AI，性格活泼开朗..." rows="4"></textarea>
			</div>
			<div class="setting-row">
				<label>助手初始消息 (可选):</label>
				<textarea v-model="initialAssistant" placeholder="AI 的第一句话，例如：你好呀！我是你的专属陪聊助手，有什么想聊的吗？" rows="2"></textarea>
			</div>
			<div class="setting-actions">
				<button @click="applySettings">应用设置</button>
				<button @click="resetSettings">重置为默认</button>
			</div>
		</div>

		<div class="chat-window">
			<div v-for="(m, i) in messages" :key="m.id" :id="'msg-'+m.id" :class="['chat-line', m.role]">
				<div class="chat-meta">{{ m.role === 'user' ? '你' : (m.role === 'assistant' ? 'AI' : m.role) }} <span class="time">{{ m.time || '' }}</span></div>
				<div class="chat-bubble">
					<div class="chat-content" v-html="renderMessage(m)"></div>
					<div class="chat-actions">
						<button @click="copyMessage(m)">复制</button>
					</div>
				</div>
			</div>
		</div>

		<div class="chat-input-area">
			<textarea v-model="inputText" :disabled="loading" placeholder="输入消息，Shift+Enter 换行，Enter 发送" @keydown.enter.exact.prevent="send" @keydown.enter.shift="newline"></textarea>
			<div class="input-actions">
				<button @click="send" :disabled="loading || !inputText.trim()">发送</button>
			</div>
		</div>
	</div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'

export default {
	data() {
		return {
			inputText: '',
			messages: [],
			loading: false,
			model: 'o4-mini',
			modelOptions: [],
			sessionId: null,
			showSettings: false,
			systemPrompt: '',
			initialAssistant: ''
		}
	},
	async mounted() {
		// load models
		try {
			const r = await fetch('/api/models')
			if (r.ok) this.modelOptions = await r.json()
		} catch (e) { console.warn('failed to load models', e) }

		// 从 localStorage 加载设置
		try {
			const savedSystem = localStorage.getItem('chat_system_prompt')
			const savedInitial = localStorage.getItem('chat_initial_assistant')
			if (savedSystem) this.systemPrompt = savedSystem
			if (savedInitial) this.initialAssistant = savedInitial
		} catch (e) { console.warn('failed to load settings', e) }

		// session persistence: load or create sessionId in localStorage
		let sid = localStorage.getItem('chat_sessionId')
		if (!sid) { sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` }
		this.sessionId = sid
		localStorage.setItem('chat_sessionId', sid)
		try {
			const resp = await fetch(`/api/sessions/${sid}`)
			if (resp.ok) {
				const data = await resp.json()
				if (Array.isArray(data) && data.length > 0) this.messages = data
			}
		} catch (e) { console.warn('failed to load session', e) }
	},
	methods: {
		makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}` },
		renderMessage(m) {
			const raw = m.content || ''
			try {
				const html = marked.parse(raw, { mangle: false, headerIds: false })
				return DOMPurify.sanitize(html)
			} catch (e) { return `<pre>${raw}</pre>` }
		},
		renderMathForMessage(id) {
			try {
				const el = this.$el && this.$el.querySelector && this.$el.querySelector(`#msg-${id}`)
				if (!el) return
				setTimeout(() => {
					try {
						renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false, ignoredTags: ['script','noscript','style','textarea','pre','code'] })
					} catch (e) { console.warn('KaTeX render error for single message', e) }
				}, 40)
			} catch (e) { console.warn('renderMathForMessage error', e) }
		},
		async send() {
			const text = this.inputText.trim()
			if (!text || this.loading) return
			const now = new Date().toLocaleTimeString()
			const looksLikeLatex = /\\[a-zA-Z]+|\\\(|\\\)|\^\{|\\frac|\\int|\\sum|\\sqrt/.test(text)
			const userContent = (!text.includes('$') && looksLikeLatex) ? `$$${text}$$` : text
			const uid = this.makeId()
			this.messages.push({ id: uid, role: 'user', content: userContent, time: now })
			this.$nextTick(() => { this.renderMathForMessage(uid); const el = this.$el.querySelector('.chat-window'); if (el) el.scrollTop = el.scrollHeight })

			// 构建发送给后端的消息数组，插入 system 和 initial assistant
			const apiMessages = []
			if (this.systemPrompt && this.systemPrompt.trim()) {
				apiMessages.push({ role: 'system', content: this.systemPrompt.trim() })
			}
			if (this.initialAssistant && this.initialAssistant.trim() && this.messages.length === 1) {
				// 只在第一次用户发消息时插入 initial assistant
				apiMessages.push({ role: 'assistant', content: this.initialAssistant.trim() })
			}
			// 添加所有历史消息
			apiMessages.push(...this.messages.map(m => ({ role: m.role, content: m.content })))

			const payload = { messages: apiMessages, model: this.model, sessionId: this.sessionId }
			this.inputText = ''
			this.loading = true
			try {
				const resp = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
				let data = null
				const ct = resp.headers.get('content-type') || ''
				try { if (ct.includes('application/json')) data = await resp.json(); else { const txt = await resp.text(); data = { rawText: txt } } } catch (e) { try { const txt = await resp.text(); data = { rawText: txt } } catch (e2) { data = null } }
				if (resp.ok) {
					let reply = (data && (data.result || data.rawText)) || (typeof data === 'string' ? data : JSON.stringify(data))
					const replyLooksLikeLatex = typeof reply === 'string' && /\\[a-zA-Z]+|\\\(|\\\)|\^\{|\\frac|\\int|\\sum|\\sqrt/.test(reply)
					if (replyLooksLikeLatex && !reply.includes('$')) reply = `$$${reply}$$`
					const aid = this.makeId()
					this.messages.push({ id: aid, role: 'assistant', content: reply, time: new Date().toLocaleTimeString() })
					this.$nextTick(() => { this.renderMathForMessage(aid); const el = this.$el.querySelector('.chat-window'); if (el) el.scrollTop = el.scrollHeight })
				} else {
					const err = (data && (data.error || data.detail)) || 'Chat request failed'
					alert(`Error: ${err}`)
				}
			} catch (e) {
				console.error('chat request error', e)
				alert('Network error: ' + e.message)
			} finally {
				this.loading = false
			}
		},
		newline(e) { const textarea = e.target; const pos = textarea.selectionStart; this.inputText = this.inputText.slice(0,pos) + '\n' + this.inputText.slice(pos); this.$nextTick(() => { textarea.selectionStart = textarea.selectionEnd = pos + 1 }) },
		copyMessage(m) { const text = m.content || ''; navigator.clipboard.writeText(text).then(()=>{ alert('已复制消息到剪贴板') }).catch(err => { console.error('copy failed', err); alert('复制失败: ' + err) }) },
		clearChat() { this.messages = []; fetch(`/api/sessions/${this.sessionId}/clear`, { method: 'POST' }).catch(()=>{}) },
		applySettings() {
			// 保存设置到 localStorage
			localStorage.setItem('chat_system_prompt', this.systemPrompt)
			localStorage.setItem('chat_initial_assistant', this.initialAssistant)
			alert('设置已保存')
		},
		resetSettings() {
			this.systemPrompt = ''
			this.initialAssistant = ''
			localStorage.removeItem('chat_system_prompt')
			localStorage.removeItem('chat_initial_assistant')
			alert('设置已重置')
		}
	}
}
</script>

<style scoped>
.chat-root { display:flex; flex-direction:column; gap:8px }
.chat-toolbar { display:flex; justify-content:space-between; align-items:center; gap:8px }
.chat-toolbar > div { display:flex; gap:8px; align-items:center }
.label { margin-right:6px; font-weight:600 }
.settings-panel { border:1px solid #e0e0e0; padding:16px; background:#f5f5f5; border-radius:8px; margin-bottom:8px }
.setting-row { margin-bottom:12px }
.setting-row label { display:block; font-weight:600; margin-bottom:6px; color:#333 }
.setting-row textarea { width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-family:inherit; resize:vertical }
.setting-actions { display:flex; gap:8px; margin-top:8px }
.setting-actions button { padding:6px 12px }
.chat-window { border:1px solid #ddd; padding:12px; height:520px; overflow:auto; background:#f9fbff; border-radius:6px }
.chat-line { margin-bottom:12px }
.chat-meta { font-size:12px; color:#666; margin-bottom:6px }
.chat-bubble { display:flex; justify-content:space-between; gap:8px }
.chat-content { flex:1; white-space:pre-wrap; padding:10px; border-radius:8px; background:#fff }
.chat-line.user .chat-content { background:#e6f7ff }
.chat-line.assistant .chat-content { background:#fff7e6 }
.chat-line.system .chat-content { background:#fff1f0 }
.chat-actions { display:flex; align-items:center }
.chat-input-area { display:flex; gap:8px; align-items:flex-end }
.chat-input-area textarea { flex:1; height:120px; padding:10px; border-radius:8px; border:1px solid #ccc; resize:vertical }
.input-actions button { padding:8px 14px }
</style>
