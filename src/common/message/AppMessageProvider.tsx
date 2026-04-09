import type { PropsWithChildren } from 'react'
import { createContext, useContext } from 'react'
import { notifications } from '@mantine/notifications'

type MessageType = 'success' | 'error' | 'warning' | 'info'

type OpenMessageOptions = {
  duration?: number
}

type AppMessageContextValue = {
  success: (content: string, options?: OpenMessageOptions) => void
  error: (content: string, options?: OpenMessageOptions) => void
  warning: (content: string, options?: OpenMessageOptions) => void
  info: (content: string, options?: OpenMessageOptions) => void
}

const DEFAULT_DURATION = 3000

const AppMessageContext = createContext<AppMessageContextValue | null>(null)

function mapMessageColor(type: MessageType) {
  const colors: Record<MessageType, string> = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  }

  return colors[type]
}

export function AppMessageProvider({ children }: PropsWithChildren) {
  function open(type: MessageType, content: string, options?: OpenMessageOptions) {
    notifications.show({
      color: mapMessageColor(type),
      message: content,
      autoClose: options?.duration ?? DEFAULT_DURATION,
      withCloseButton: true,
    })
  }

  const value: AppMessageContextValue = {
    success: (content, options) => open('success', content, options),
    error: (content, options) => open('error', content, options),
    warning: (content, options) => open('warning', content, options),
    info: (content, options) => open('info', content, options),
  }

  return (
    <AppMessageContext.Provider value={value}>{children}</AppMessageContext.Provider>
  )
}

export function useAppMessage() {
  const context = useContext(AppMessageContext)

  if (!context) {
    throw new Error('useAppMessage 必须在 AppMessageProvider 内使用。')
  }

  return context
}
