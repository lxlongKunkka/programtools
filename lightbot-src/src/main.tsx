import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import 'mobile-drag-drop/default.css'
import { polyfill as mobileDndPolyfill } from 'mobile-drag-drop'
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour'
import App from './app/App'

// 触屏设备：polyfill 让 HTML5 拖拽在 iOS/Android 上正常工作
mobileDndPolyfill({
  holdToDrag: 200,
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
})
// 允许 polyfill 在拖拽过程中阻止页面滚动
window.addEventListener('touchmove', () => {}, { passive: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
