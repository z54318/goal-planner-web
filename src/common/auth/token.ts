const AUTH_TOKEN_KEY = 'goal-planner-token'

// 读取本地保存的登录令牌，供请求层统一附带。
export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
}

// 保存登录成功后的令牌。
export function setAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

// 清理本地令牌，通常用于退出登录。
export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
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
    return directToken
  }

  return extractAuthToken(source.data)
}
