'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { ThemeProvider as MUIThemeProvider, createTheme, Theme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  mode: ThemeMode
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useThemeMode() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider')
  }
  return context
}

function getTheme(mode: ThemeMode): Theme {
  const alertLightColors = {
    error: {
      bg: '#fdecea',
      color: '#5f2120',
      icon: '#d32f2f',
    },
    success: {
      bg: '#edf7ed',
      color: '#1e4620',
      icon: '#2e7d32',
    },
  }

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#a855f7',
      },
      secondary: {
        main: '#ec4899',
      },
      ...(mode === 'dark' && {
        background: {
          default: '#121212',
          paper: '#1e1e1e',
        },
      }),
      ...(mode === 'light' && {
        background: {
          default: '#f5f5f5',
          paper: '#ffffff',
        },
      }),
    },
    shape: {
      borderRadius: 8,
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    components: {
      MuiAlert: {
        styleOverrides: {
          standardError: {
            backgroundColor: alertLightColors.error.bg,
            color: alertLightColors.error.color,
            '& .MuiAlert-icon': { color: alertLightColors.error.icon },
          },
          standardSuccess: {
            backgroundColor: alertLightColors.success.bg,
            color: alertLightColors.success.color,
            '& .MuiAlert-icon': { color: alertLightColors.success.icon },
          },
        },
      },
    },
  })
}

// Helper function to get initial theme (runs synchronously)
function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  
  try {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode
    if (savedMode === 'dark' || savedMode === 'light') {
      return savedMode
    }
  } catch (e) {
    // localStorage might not be available
  }
  
  // Check system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with the correct theme immediately
  const [mode, setMode] = useState<ThemeMode>(getInitialTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light'
    setMode(newMode)
    localStorage.setItem('theme-mode', newMode)
  }

  const theme = getTheme(mode)

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  )
}
