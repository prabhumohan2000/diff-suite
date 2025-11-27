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
import DifferenceIcon from '@mui/icons-material/Difference'
import SettingsIcon from '@mui/icons-material/Settings'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { useThemeMode } from '@/components/ThemeProvider'

interface HeaderProps {
  enableStorage?: boolean
  onStorageToggle?: (enabled: boolean) => void
  onSettingsClick?: () => void
  onDrawerToggle?: () => void
  sidebarVisible?: boolean
  onSidebarToggle?: () => void
}

export default function Header({
  enableStorage = true,
  onStorageToggle,
  onSettingsClick,
  onDrawerToggle,
  sidebarVisible = true,
  onSidebarToggle
}: HeaderProps) {
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
        elevation={0}
        sx={{
          background: mode === 'dark'
            ? 'rgba(18, 18, 18, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)',
          color: mode === 'dark' ? '#fff' : '#1e293b',
          transition: 'all 0.3s ease',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar className="min-h-[70px] px-4 sm:px-8 justify-between">
          {/* Logo Section */}
          <Box className="flex items-center gap-3">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={onDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Tooltip title={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}>
              <IconButton
                color="inherit"
                aria-label="toggle sidebar"
                onClick={onSidebarToggle}
                sx={{ mr: 2, display: { xs: 'none', md: 'inline-flex' } }}
              >
                {sidebarVisible ? <MenuOpenIcon /> : <MenuIcon />}
              </IconButton>
            </Tooltip>

            <Box
              sx={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                borderRadius: '12px',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              }}
            >
              <CodeIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                component="div"
                className="font-bold leading-none tracking-tight"
                sx={{
                  fontSize: '1.25rem',
                  background: mode === 'dark'
                    ? 'linear-gradient(to right, #fff, #cbd5e1)'
                    : 'linear-gradient(to right, #1e293b, #475569)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Diff Suite
              </Typography>
            </Box>
          </Box>

          {/* Actions Section */}
          <Box className="flex items-center gap-2">
            <Tooltip title={enableStorage ? 'Disable browser session' : 'Enable browser session'}>
              <IconButton
                onClick={() => onStorageToggle?.(!enableStorage)}
                sx={{
                  color: enableStorage ? '#7c3aed' : 'inherit',
                  border: '1px solid',
                  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  borderRadius: '10px',
                  p: 1,
                  background: enableStorage ? (mode === 'dark' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.05)') : 'transparent',
                  '&:hover': {
                    background: enableStorage ? (mode === 'dark' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)') : (mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                  },
                }}
              >
                <DifferenceIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton
                onClick={toggleMode}
                sx={{
                  color: 'inherit',
                  border: '1px solid',
                  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  borderRadius: '10px',
                  p: 1,
                  '&:hover': {
                    background: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                  },
                }}
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
