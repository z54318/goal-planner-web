import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { AppMessageProvider } from './common/message/AppMessageProvider'
import { AppRouter } from './router'

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  headings: {
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  colors: {
    blue: [
      '#eef5ff',
      '#dae8ff',
      '#b5d0ff',
      '#8db7ff',
      '#679fff',
      '#4e8fff',
      '#2d6cdf',
      '#1f5bc5',
      '#174ea8',
      '#103c80',
    ],
  },
  defaultRadius: 'md',
})

function App() {
  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="light"
    >
      <Notifications position="top-center" />
      <AppMessageProvider>
        <AppRouter />
      </AppMessageProvider>
    </MantineProvider>
  )
}

export default App
