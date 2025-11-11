'use client'

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  useScrollTrigger,
  Slide,
  IconButton,
  Tooltip,
} from '@mui/material'
import CodeIcon from '@mui/icons-material/Code'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import DifferenceIcon from '@mui/icons-material/Difference' // ⬅️ updated icon import
import { useThemeMode } from '@/components/ThemeProvider'

interface HeaderProps {
  enableStorage?: boolean
  onStorageToggle?: (enabled: boolean) => void
}

export default function Header({ enableStorage = true, onStorageToggle }: HeaderProps) {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  })
  const { mode, toggleMode } = useThemeMode()

  return (
    // Keep header visible while still adjusting elevation/visuals on scroll
    <Slide appear={false} direction="down" in={true}>
      <AppBar
        position="fixed"
        elevation={trigger ? 8 : 4}
        sx={{
          background: '#7c3aed',
          backdropFilter: 'blur(10px)',
          color: 'white',
          transition: 'all 0.3s ease',
          boxShadow: trigger
            ? '0 8px 32px rgba(168, 85, 247, 0.4)'
            : '0 4px 20px rgba(168, 85, 247, 0.3)',
        }}
      >
        <Toolbar className="min-h-[64px] sm:min-h-[80px] px-4 sm:px-8 items-center justify-center">
          <Box className="flex items-center justify-start flex-grow mx-4 sm:mx-8">
            <CodeIcon className="mr-3 text-white" sx={{ fontSize: { xs: 28, sm: 32 } }} />
            <Box className="flex flex-col items-start">
              <Typography
                variant="h5"
                component="div"
                className="font-bold text-white leading-tight"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, mt: 2 }}
              >
                Diff suite
              </Typography>
              <Typography
                variant="body2"
                component="div"
                className="text-white/90 leading-tight"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mt: 0.25, mb: 2 }}
              >
                Comparison and validation tool
              </Typography>
            </Box>
          </Box>

          <Box className="flex-shrink-0 w-[72px] sm:w-[88px]" /> {/* Spacer for alignment */}

          <Box className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Tooltip title={enableStorage ? 'Disable browser session' : 'Enable browser session'}>
              <IconButton
                onClick={() => onStorageToggle?.(!enableStorage)}
                sx={{
                  color: enableStorage ? 'white' : 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'scale(1.1)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
                aria-label="toggle storage"
                size="small"
                className="!p-2"
              >
                <DifferenceIcon fontSize="small" /> {/* 🔄 updated icon */}
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton
                onClick={toggleMode}
                sx={{
                  color: 'white',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'scale(1.1)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
                aria-label="toggle theme"
                size="small"
                className="!p-2"
              >
                {mode === 'dark' ? (
                  <Brightness7Icon fontSize="small" />
                ) : (
                  <Brightness4Icon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
    </Slide>
  )
}
