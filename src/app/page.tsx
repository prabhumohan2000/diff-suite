'use client'

import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import {
  Container,
  Box,
  Stack,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ModeSelector from '@/components/ModeSelector'
import ValidationView from '@/components/ValidationView'
import ComparisonView from '@/components/ComparisonView'
import { FormatType, ActionType, ComparisonOptions } from '@/types'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import RefreshIcon from '@mui/icons-material/Refresh'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DownloadIcon from '@mui/icons-material/Download'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SettingsIcon from '@mui/icons-material/Settings'

const STORAGE_KEY = 'diff-suite-state'

function loadState() {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error)
  }
  return null
}

function saveState(state: any) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save state to localStorage:', error)
  }
}

export default function Home() {
  const [formatType, setFormatType] = useState<FormatType>('json')
  const [actionType, setActionType] = useState<ActionType>('validate')
  const [leftContent, setLeftContent] = useState('')
  const [rightContent, setRightContent] = useState('')
  const [options, setOptions] = useState<ComparisonOptions>({
    ignoreKeyOrder: false,
    ignoreArrayOrder: false,
    caseSensitive: true,
    ignoreWhitespace: false,
    ignoreAttributeOrder: false,
  })
  const [enableStorage, setEnableStorage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('diff-suite-storage-enabled')
      return saved !== 'false' // Default to true
    }
    return true
  })

  // Load state from sessionStorage on mount if enabled
  useEffect(() => {
    if (enableStorage && typeof window !== 'undefined') {
      try {
        const savedLeft = sessionStorage.getItem('diffsuite_input_1') || ''
        const savedRight = sessionStorage.getItem('diffsuite_input_2') || ''
        const savedFmt = sessionStorage.getItem('diffsuite_format_type') as FormatType | null
        const savedAct = sessionStorage.getItem('diffsuite_action_type') as ActionType | null
        const savedOpt = sessionStorage.getItem('diffsuite_options')

        // Always restore saved content regardless of format
        if (savedLeft) setLeftContent(savedLeft)
        if (savedRight) setRightContent(savedRight)
        if (savedFmt) setFormatType(savedFmt)
        if (savedAct) setActionType(savedAct)
        if (savedOpt) setOptions(JSON.parse(savedOpt))
      } catch (e) {
        console.error('Failed to restore from sessionStorage', e)
      }
    } else if (!enableStorage && typeof window !== 'undefined') {
      // Clear any old session data
      sessionStorage.removeItem('diffsuite_input_1')
      sessionStorage.removeItem('diffsuite_input_2')
      sessionStorage.removeItem('diffsuite_format_type')
      sessionStorage.removeItem('diffsuite_action_type')
      sessionStorage.removeItem('diffsuite_options')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableStorage])

  // Save state to sessionStorage whenever it changes and enabled
  useEffect(() => {
    if (enableStorage && typeof window !== 'undefined') {
      try {
        // Save all content regardless of current format
        sessionStorage.setItem('diffsuite_format_type', formatType)
        sessionStorage.setItem('diffsuite_action_type', actionType)
        if (leftContent) sessionStorage.setItem('diffsuite_input_1', leftContent)
        if (rightContent) sessionStorage.setItem('diffsuite_input_2', rightContent)
        sessionStorage.setItem('diffsuite_options', JSON.stringify(options))
      } catch (e) {
        console.error('Failed to save to sessionStorage', e)
      }
    }
  }, [formatType, actionType, leftContent, rightContent, options, enableStorage])


  const handleFormatChange = useCallback((newFormat: FormatType) => {
    setFormatType(newFormat)
    
    // Text mode only supports compare action
    if (newFormat === 'text') {
      setActionType('compare')
    }

    // Reset comparison options when format changes but preserve content
    if (newFormat !== formatType) {
      setOptions({
        ignoreKeyOrder: false,
        ignoreArrayOrder: false,
        ignoreAttributeOrder: false,
        caseSensitive: true,
        ignoreWhitespace: false
      })
    }
  }, [formatType, setOptions])

  const handleActionChange = useCallback((newAction: ActionType) => {
    setActionType(newAction)
  }, [])

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '', severity: 'error' })
  const [overlay, setOverlay] = useState<{ open: boolean; message?: string; progress?: number }>({ open: false })

  // Expose a simple global overlay controller for other components (ComparisonView/FileDropZone)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.globalOverlay = {
        show: (message?: string, progress?: number) => setOverlay({ open: true, message: message || 'Processing…', progress }),
        update: (message?: string, progress?: number) => setOverlay((prev) => ({ open: true, message: message ?? prev.message, progress: typeof progress === 'number' ? progress : prev.progress })),
        hide: () => setOverlay({ open: false, message: undefined, progress: undefined }),
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.globalOverlay = undefined
      }
    }
  }, [])

  const handleFileUpload = useCallback(
    (side: 'left' | 'right', event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      // Max allowed file size in bytes (2 MB)
      const MAX_FILE_SIZE = 2 * 1024 * 1024

      const accepted = formatType === 'json'
        ? ['.json']
        : formatType === 'xml'
        ? ['.xml']
        : ['.txt', '.text'];
  
      const name = file.name.trim().toLowerCase();
      const valid = accepted.some((ext) => name.endsWith(ext));
  
      if (!valid) {
        const typeLabel =
          formatType === 'json'
            ? 'JSON (.json)'
            : formatType === 'xml'
            ? 'XML (.xml)'
            : 'TXT (.txt or .text)';
        setSnackbar({
          open: true,
          message: `Invalid file for ${formatType.toUpperCase()}. Expected ${typeLabel}.`,
          severity: 'error',
        });
        event.target.value = '';
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setSnackbar({
          open: true,
          message: `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max allowed size is ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB.`,
          severity: 'error',
        });
        event.target.value = '';
        return;
      }
  
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        startTransition(() => {
          if (side === 'left') setLeftContent(content);
          else setRightContent(content);
        })
        // After upload, require user to Compare/Validate again
        try {
          if (typeof window !== 'undefined') {
            // @ts-ignore
            window.comparisonViewResetRef?.current?.()
            // @ts-ignore
            window.validationViewResetRef?.current?.()
          }
        } catch {}
        setOverlay({ open: false })
        event.target.value = ''; // ensure reset happens after read
      };
      const LARGE_FILE = 500 * 1024
      if (file.size >= LARGE_FILE) setOverlay({ open: true, message: 'Reading file…' })
      reader.readAsText(file);
    },
    [formatType, setSnackbar, setLeftContent, setRightContent]
  );
  

  // Key for forcing remount of components
  const [resetKey, setResetKey] = useState(0)
  
  const handleReset = useCallback(() => {
    setLeftContent('')
    setRightContent('')
    // Clear any persisted session data for inputs/options
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('diffsuite_input_1')
        sessionStorage.removeItem('diffsuite_input_2')
        // Keep format/action unless explicitly changed by user
        // sessionStorage.removeItem('diffsuite_options') // optional: keep options
      }
    } catch {}
    // Attempt to reset any child view state if available
    try {
      // @ts-ignore - exposed by ComparisonView
      if (typeof window !== 'undefined' && window.comparisonViewResetRef?.current) {
        // @ts-ignore
        window.comparisonViewResetRef.current()
      }
      // @ts-ignore - exposed by ValidationView
      if (typeof window !== 'undefined' && window.validationViewResetRef?.current) {
        // @ts-ignore
        window.validationViewResetRef.current()
      }
    } catch {}
    // Force remount of components by changing the key
    setResetKey(prev => prev + 1)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to clear
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        handleReset()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleReset])

  const handleSwap = useCallback(() => {
    const temp = leftContent
    setLeftContent(rightContent)
    setRightContent(temp)
    // Clear any existing comparison/validation results; user must Compare again
    try {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.comparisonViewResetRef?.current?.()
        // @ts-ignore
        window.validationViewResetRef?.current?.()
      }
    } catch {}
  }, [leftContent, rightContent])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a snackbar notification here
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  const handleDownload = useCallback(
    (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    []
  )

  return (
    <Box 
      className="flex flex-col min-h-screen relative z-10"
      sx={{
        backgroundColor: 'background.default',
        minHeight: '100vh',
        // Offset for fixed header height (64px mobile ~ 80px desktop)
        pt: { xs: '72px', sm: '88px' },
      }}
    >
      <Header 
        enableStorage={enableStorage}
        onStorageToggle={(enabled) => {
          setEnableStorage(enabled)
          localStorage.setItem('diff-suite-storage-enabled', String(enabled))
          if (!enabled) {
            // Clear sessionStorage and reset state for clarity
            sessionStorage.removeItem('diffsuite_json_input_1')
            sessionStorage.removeItem('diffsuite_json_input_2')
            sessionStorage.removeItem('diffsuite_format_type')
            sessionStorage.removeItem('diffsuite_action_type')
            sessionStorage.removeItem('diffsuite_options')
            setLeftContent('')
            setRightContent('')
            setOptions({
              ignoreKeyOrder: false,
              ignoreArrayOrder: false,
              caseSensitive: true,
              ignoreWhitespace: false,
              ignoreAttributeOrder: false,
            })
            setSnackbar({ open: true, message: 'Auto-save disabled - Data will clear on refresh', severity: 'warning' })
          } else {
            setSnackbar({ open: true, message: 'Auto-save enabled - Your work will be saved', severity: 'success' })
          }
        }}
      />
      <Container maxWidth={false} className="flex-1 py-8 relative z-10" sx={{ maxWidth: { xs: '100%', lg: 1400 }, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <ModeSelector
          formatType={formatType}
          actionType={actionType}
          onFormatChange={handleFormatChange}
          onActionChange={handleActionChange}
        />

        <Stack direction="row" spacing={1} className="mb-4 flex-wrap gap-2 justify-center">
          <Tooltip title="Upload file">
            <IconButton
              component="label"
              size="small"
              aria-label="upload file"
            >
              <FileUploadIcon />
              <input
                type="file"
                hidden
                accept={
                  formatType === 'json'
                    ? '.json'
                    : formatType === 'xml'
                    ? '.xml'
                    : '.txt,.text'
                }
                onChange={(e) => handleFileUpload(actionType === 'validate' ? 'left' : 'left', e)}
              />
            </IconButton>
          </Tooltip>
          {actionType === 'compare' && (
            <>
              <Tooltip title="Upload file for right side">
                <IconButton
                  component="label"
                  size="small"
                  aria-label="upload file right"
                >
                  <FileUploadIcon />
                  <input
                    type="file"
                    hidden
                    accept={
                      formatType === 'json'
                        ? '.json'
                        : formatType === 'xml'
                        ? '.xml'
                        : '.txt,.text'
                    }
                    onChange={(e) => handleFileUpload('right', e)}
                  />
                </IconButton>
              </Tooltip>
              <Tooltip title="Swap left and right">
                <IconButton
                  size="small"
                  onClick={handleSwap}
                  aria-label="swap content"
                >
                  <SwapHorizIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          {actionType === 'compare' && (
            <Tooltip title="Comparison Options">
              <IconButton
                size="small"
                aria-label="comparison settings"
                onClick={(e) => {
                  try {
                    // @ts-ignore
                    window.comparisonViewOpenSettings?.(e.currentTarget)
                  } catch {}
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Reset">
            <IconButton size="small" onClick={handleReset} aria-label="reset">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {actionType === 'validate' && leftContent && (
            <Tooltip title="Copy content">
              <IconButton
                size="small"
                onClick={() => handleCopy(leftContent)}
                aria-label="copy"
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          )}
          {actionType === 'compare' && (
            <>
              {leftContent && (
                <Tooltip title="Download left content">
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(leftContent, `left.${formatType}`)}
                    aria-label="download left"
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              )}
              {rightContent && (
                <Tooltip title="Download right content">
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(rightContent, `right.${formatType}`)}
                    aria-label="download right"
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Stack>

        {actionType === 'validate' ? (
          <ValidationView
            key={`${formatType}-${resetKey}`}
            formatType={formatType}
            content={leftContent}
            onContentChange={setLeftContent}
          />
        ) : (
          <ComparisonView
            key={`${formatType}-${resetKey}`}
            formatType={formatType}
            leftContent={leftContent}
            rightContent={rightContent}
            onLeftContentChange={setLeftContent}
            onRightContentChange={setRightContent}
            options={options}
            onOptionsChange={setOptions}
          />
        )}
      </Container>
      {/* <Footer /> */}


      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        // Keep page-level notices at top; others moved to bottom to avoid overlap
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: { xs: '56px', sm: '72px' } }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {overlay.open && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box className="flex flex-col items-center gap-2" sx={{ minWidth: 260 }}>
            <CircularProgress size={40} sx={{ color: 'white' }} />
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
              {overlay.message || 'Processing…'}{typeof overlay.progress === 'number' ? ` ${Math.max(0, Math.min(100, Math.round(overlay.progress)))}%` : ''}
            </Typography>
            {typeof overlay.progress === 'number' && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, Math.round(overlay.progress)))}
                  style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, Math.round(overlay.progress)))}%`, background: '#90caf9', transition: 'width 200ms ease' }} />
                </div>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}

