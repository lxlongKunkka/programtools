import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import MarkdownViewer from './components/MarkdownViewer.vue'
import './styles/global.css'

const app = createApp(App)
app.component('MarkdownViewer', MarkdownViewer)
app.use(router)
app.mount('#app')
