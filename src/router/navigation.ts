import { useSyncExternalStore } from 'react'

// 订阅浏览器地址变化，让自定义路由在地址切换时触发重渲染。
function subscribe(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange)

  return () => {
    window.removeEventListener('popstate', onStoreChange)
  }
}

// 读取当前页面路径，作为简单路由系统的状态来源。
function getSnapshot() {
  return window.location.pathname
}

// 统一处理页面跳转，避免业务组件直接操作 history。
export function navigateTo(path: string, replace = false) {
  const nextMethod = replace ? 'replaceState' : 'pushState'

  window.history[nextMethod](null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// 提供给路由层的路径订阅 Hook。
export function useCurrentPath() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
