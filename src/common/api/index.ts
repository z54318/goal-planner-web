import axios, { AxiosError } from 'axios'
import { getAuthToken } from '../auth/token'
import { appEnv } from '../config/env'
import { AuthApi, Configuration, GoalsApi } from './typescript-axios'

// 统一解析 OpenAPI 请求错误，优先展示后端返回的 message。
function resolveApiErrorMessage(error: AxiosError) {
  const payload = error.response?.data

  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message

    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return error.message || '请求失败，请稍后重试。'
}

// 生成接口统一复用的 axios 实例。
export const instance = axios.create({
  baseURL: appEnv.publicPath,
  withCredentials: true,
})

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(new Error(resolveApiErrorMessage(error))),
)

// 用于 OpenAPI 调用的配置。当前生成路径已包含 /api，因此这里不额外拼接前缀。
export const configuration = new Configuration({
  basePath: '',
  apiKey: (name) => {
    if (name !== 'Authorization') {
      return ''
    }

    const token = getAuthToken()
    return token ? `Bearer ${token}` : ''
  },
  baseOptions: {
    withCredentials: true,
  },
})

// 实例化自动生成的接口类，后续业务模块统一从这里取用。
export const authApi = new AuthApi(configuration, undefined, instance)
export const goalsApi = new GoalsApi(configuration, undefined, instance)

export { Configuration }
export * from './typescript-axios/models'
