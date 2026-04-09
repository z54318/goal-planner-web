const AUTH_TOKEN_KEY = 'goal-planner-token'
const AUTH_USERNAME_KEY = 'goal-planner-username'

// 统一整理 token 格式，去掉多余空格和可选的 Bearer 前缀。
function normalizeAuthToken(token: string) {
  return token.replace(/^Bearer\s+/i, '').trim()
}

// 读取本地保存的登录令牌，供请求层统一附带。
export function getAuthToken() {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
  return normalizeAuthToken(token)
}

// 保存登录成功后的令牌。
export function setAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, normalizeAuthToken(token))
}

// 清理本地令牌，通常用于退出登录。
export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

// 读取当前登录用户名，供导航栏等区域展示。
export function getAuthUsername() {
  return window.localStorage.getItem(AUTH_USERNAME_KEY) ?? ''
}

// 保存当前登录用户名。
export function setAuthUsername(username: string) {
  window.localStorage.setItem(AUTH_USERNAME_KEY, username.trim())
}

// 清理当前登录用户名。
export function clearAuthUsername() {
  window.localStorage.removeItem(AUTH_USERNAME_KEY)
}

// 从常见的接口返回结构中提取 JWT，兼容不同字段命名。
export function extractAuthToken(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const source = payload as Record<string, unknown>
  const directToken = ['token', 'accessToken', 'access_token', 'jwt']
    .map((key) => source[key])
    .find((value): value is string => typeof value === 'string' && value.length > 0)

  if (directToken) {
    return normalizeAuthToken(directToken)
  }

  return extractAuthToken(source.data)
}
