import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // 严格模式：用于检测潜在问题，开发环境下启用，生产环境会自动剔除。StrictMode 会激活额外的检查和警告，帮助开发者发现潜在的错误和不安全的生命周期方法。
  <StrictMode>
    <App />
  </StrictMode>,
)
