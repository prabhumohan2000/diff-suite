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
import ModeSelector from '@/components/ModeSelector'
import ValidationView from '@/components/ValidationView'
import ComparisonView from '@/components/ComparisonView'
import { FormatType, ActionType, ComparisonOptions } from '@/types'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import RefreshIcon from '@mui/icons-material/Refresh'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DownloadIcon from '@mui/icons-material/Download'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { validateJSON } from '@/utils/validators/jsonValidator'
import { validateXML } from '@/utils/validators/xmlValidator'
import { prettifyXML } from '@/utils/diffUtils/xmlFormatter'
import SettingsIcon from '@mui/icons-material/Settings'

const STORAGE_KEY = 'diff-suite-state'
const defaultComparisonOptions: ComparisonOptions = {
  ignoreKeyOrder: false,
  ignoreArrayOrder: false,
  caseSensitive: true,
  ignoreWhitespace: false,
  ignoreAttributeOrder: false,
}

export default function Home() {
  // Initialize mode tabs from localStorage so refreshes land
  // on the last-used JSON/XML/Text + Validate/Compare selection.
  const [formatType, setFormatType] = useState<FormatType>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('diffsuite_format_type') as FormatType | null
      if (saved === 'json' || saved === 'xml' || saved === 'text') {
        return saved
      }
    }
    return 'json'
  })
  const [actionType, setActionType] = useState<ActionType>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('diffsuite_action_type') as ActionType | null
      if (saved === 'validate' || saved === 'compare') {
        return saved
      }
    }
    return 'validate'
  })
  const [leftContent, setLeftContent] = useState('')
  const [rightContent, setRightContent] = useState('')
  const [options, setOptions] = useState<ComparisonOptions>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedOpt = window.localStorage.getItem('diffsuite_options')
        if (savedOpt) {
          const parsed = JSON.parse(savedOpt)
          return { ...defaultComparisonOptions, ...parsed }
        }
      } catch {}
    }
    return { ...defaultComparisonOptions }
  })
  const [enableStorage, setEnableStorage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('diff-suite-storage-enabled')
      return saved !== 'false' // Default to true
    }
    return true
  })
  const pendingOptionsRestoreRef = useRef(false)

  // Load content/options from persistent storage on mount when enabled.
  // Mode tabs are restored via the lazy useState initializers above.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storage = window.localStorage

        const savedLeft = storage.getItem('diffsuite_input_1') || ''
        const savedRight = storage.getItem('diffsuite_input_2') || ''
        const savedOpt = storage.getItem('diffsuite_options')

        // Restore content/settings only when storage is enabled
        if (enableStorage) {
          if (savedLeft) setLeftContent(savedLeft)
          if (savedRight) setRightContent(savedRight)
          if (savedOpt) {
            try {
              const parsed = JSON.parse(savedOpt)
              pendingOptionsRestoreRef.current = true
              setOptions((prev) => ({ ...defaultComparisonOptions, ...prev, ...parsed }))
            } catch {}
          }
        }
      } catch (e) {
        console.error('Failed to restore from sessionStorage', e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableStorage])

  // Save state to localStorage.
  // Mode tabs (format/action) are always saved; content/options only when enabled,
  // and cleared when both sides are empty.
  useEffect(() => {
    if (pendingOptionsRestoreRef.current) {
      // Allow restored options to render before persisting again
      pendingOptionsRestoreRef.current = false
      return
    }

    if (typeof window !== 'undefined') {
      try {
        const storage = window.localStorage
        storage.setItem('diffsuite_format_type', formatType)
        storage.setItem('diffsuite_action_type', actionType)

        if (enableStorage) {
          // Always persist comparison options so toggles survive refresh even when content is empty
          storage.setItem('diffsuite_options', JSON.stringify(options))

          const hasContent = !!leftContent || !!rightContent
          if (hasContent) {
            if (leftContent) storage.setItem('diffsuite_input_1', leftContent)
            else storage.removeItem('diffsuite_input_1')

            if (rightContent) storage.setItem('diffsuite_input_2', rightContent)
            else storage.removeItem('diffsuite_input_2')
          } else {
            storage.removeItem('diffsuite_input_1')
            storage.removeItem('diffsuite_input_2')
          }
        }
      } catch (e) {
        console.error('Failed to save to sessionStorage', e)
      }
    }
  }, [formatType, actionType, leftContent, rightContent, options, enableStorage])


  const handleFormatChange = useCallback((newFormat: FormatType) => {
    if (newFormat === formatType) return

    setFormatType(newFormat)
    setOptions({ ...defaultComparisonOptions })
    setLeftContent('')
    setRightContent('')

    // Text mode only supports compare action
    if (newFormat === 'text') {
      setActionType('compare')
    }

    // Reset any existing results when format changes
    try {
      if (typeof window !== 'undefined') {
        // Reset any existing results
        // @ts-ignore
        window.comparisonViewResetRef?.current?.()
        // @ts-ignore
        window.validationViewResetRef?.current?.()
      }
    } catch {}
  }, [formatType])

  const handleActionChange = useCallback((newAction: ActionType) => {
    setActionType(newAction)
  }, [])

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '', severity: 'error' })
  const [overlay, setOverlay] = useState<{ open: boolean; message?: string; progress?: number }>({ open: false })
  const lastPrettifyRef = useRef<{ side: 'left' | 'right'; prev: string } | null>(null)

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
      // Max allowed file size in bytes (2 MB) with a small buffer for OS rounding
      const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
      const SIZE_BUFFER = 1024 // allow slight rounding difference (~1 KiB)
      const MAX_FILE_SIZE = MAX_FILE_SIZE_BYTES + SIZE_BUFFER

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
          message: `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max allowed size is ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
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
    // Clear any persisted data for inputs only
    try {
      if (typeof window !== 'undefined') {
        const storages = [window.localStorage, window.sessionStorage]
        for (const s of storages) {
          try {
            s.removeItem('diffsuite_input_1')
            s.removeItem('diffsuite_input_2')
          } catch {}
        }
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
        return
      }

      // Ctrl+Z or Cmd+Z to undo last prettify (JSON/XML)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (lastPrettifyRef.current) {
          e.preventDefault()
          const { side, prev } = lastPrettifyRef.current
          if (side === 'right') {
            setRightContent(prev)
          } else {
            setLeftContent(prev)
          }
          lastPrettifyRef.current = null
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleReset, setLeftContent, setRightContent])

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

  const handlePrettify = useCallback((side: 'left' | 'right' | 'single') => {
    const target = side === 'right' ? rightContent : leftContent
    try {
      if (formatType === 'json') {
        const targetSide: 'left' | 'right' = side === 'right' ? 'right' : 'left'
        lastPrettifyRef.current = { side: targetSide, prev: target }
        const valid = validateJSON(target)
        if (!valid.valid) throw new Error('Cannot format invalid JSON')
        const formatted = JSON.stringify(JSON.parse(target), null, 2)
        if (side === 'right') setRightContent(formatted)
        else setLeftContent(formatted)
        return
      }
      if (formatType === 'xml') {
        const targetSide: 'left' | 'right' = side === 'right' ? 'right' : 'left'
        lastPrettifyRef.current = { side: targetSide, prev: target }
        const valid = validateXML(target)
        if (!valid.valid) throw new Error('Cannot format invalid XML')
        const formatted = prettifyXML(target)
        if (side === 'right') setRightContent(formatted)
        else setLeftContent(formatted)
        return
      }
      // For text, do nothing
      setSnackbar({ open: true, message: 'Formatting is available for JSON or XML only', severity: 'info' })
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Could not format content'
      setSnackbar({ open: true, message: msg, severity: 'error' })
    }
  }, [formatType, leftContent, rightContent])

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
            // Clear persisted input/options and reset content for clarity.
            // Keep last used mode tabs intact.
            const storages = [window.localStorage, window.sessionStorage]
            for (const s of storages) {
              try {
                s.removeItem('diffsuite_input_1')
                s.removeItem('diffsuite_input_2')
                s.removeItem('diffsuite_options')
              } catch {}
            }
            setLeftContent('')
            setRightContent('')
            setOptions({ ...defaultComparisonOptions })
            setSnackbar({ open: true, message: 'Auto-save disabled - Data will clear on refresh', severity: 'warning' })
          } else {
            setSnackbar({ open: true, message: 'Auto-save enabled - Your work will be saved', severity: 'success' })
          }
        }}
        onSettingsClick={() => {
          if (actionType !== 'compare') return
          if (typeof window !== 'undefined') {
            try {
              // @ts-ignore
              window.comparisonViewOpenSettings?.(null)
            } catch {}
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

        {actionType === 'validate' ? (
          <Stack
            direction="row"
            spacing={1}
            className="mb-4 flex-wrap gap-2 justify-center"
          >
            <Tooltip title="Upload file for left side">
              <IconButton
                component="label"
                size="small"
                aria-label="upload file left"
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
                  onChange={(e) => handleFileUpload('left', e)}
                />
              </IconButton>
            </Tooltip>
            {leftContent && (
              <>
                {(formatType === 'json' || formatType === 'xml') && (
                  <Tooltip title={`Prettify ${formatType.toUpperCase()}`}>
                    <IconButton size="small" onClick={() => handlePrettify('single')} aria-label="prettify">
                      <AutoFixHighIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Download content">
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(leftContent, `validate.${formatType}`)}
                    aria-label="download validate content"
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy content">
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(leftContent)}
                    aria-label="copy"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Reset">
              <IconButton size="small" onClick={handleReset} aria-label="reset">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack
            direction="row"
            spacing={1}
            className="mb-4 flex-wrap gap-2"
            sx={{
              justifyContent: { xs: 'center', md: 'space-between' },
              alignItems: 'center',
              display: { xs: 'none', md: 'flex' }, // hide global compare toolbar on mobile
            }}
          >
            {/* Left-aligned controls (left editor) */}
            <Box className="flex items-center gap-2">
              <Tooltip title="Upload left content">
                <IconButton
                  component="label"
                  size="small"
                  aria-label="upload file left"
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
                    onChange={(e) => handleFileUpload('left', e)}
                  />
                </IconButton>
              </Tooltip>
              {leftContent && (
                <>
                  <Tooltip title="Download left content">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(leftContent, `left.${formatType}`)}
                      aria-label="download left"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  {(formatType === 'json' || formatType === 'xml') && (
                    <Tooltip title={`Prettify left ${formatType.toUpperCase()}`}>
                      <IconButton size="small" onClick={() => handlePrettify('left')} aria-label="prettify left">
                        <AutoFixHighIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Copy left content">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(leftContent)}
                      aria-label="copy left"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear left">
                    <IconButton
                      size="small"
                      onClick={() => setLeftContent('')}
                      aria-label="clear left"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>

            {/* Center controls (shared actions) */}
            <Box className="flex items-center gap-2 justify-center">
              <Tooltip title="Swap left and right">
                <IconButton
                  size="small"
                  onClick={handleSwap}
                  aria-label="swap content"
                  disabled={!leftContent.trim() || !rightContent.trim()}
                >
                  <SwapHorizIcon />
                </IconButton>
              </Tooltip>
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
            </Box>

            {/* Right-aligned controls (right editor) */}
            <Box className="flex items-center gap-2 justify-start">
              <Tooltip title="Upload right conent">
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
              {rightContent && (
                <>
                  <Tooltip title="Download right content">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(rightContent, `right.${formatType}`)}
                      aria-label="download right"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  {(formatType === 'json' || formatType === 'xml') && (
                    <Tooltip title={`Prettify right ${formatType.toUpperCase()}`}>
                      <IconButton size="small" onClick={() => handlePrettify('right')} aria-label="prettify right">
                        <AutoFixHighIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Copy right content">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(rightContent)}
                      aria-label="copy right"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear right">
                    <IconButton
                      size="small"
                      onClick={() => setRightContent('')}
                      aria-label="clear right"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Stack>
        )}

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

