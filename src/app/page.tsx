'use client'

import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import {
  Container,
  Box,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  Typography,
  Paper,
} from '@mui/material'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import ActionButton from '@/components/ActionButton'
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
      } catch { }
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

  // Sidebar mobile toggle state
  const [mobileOpen, setMobileOpen] = useState(false)
  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen)
  }, [mobileOpen])

  // Sidebar visibility state (desktop)
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('diff-suite-sidebar-visible')
      return saved !== 'false' // Default to true
    }
    return true
  })

  const handleSidebarToggle = useCallback(() => {
    const newValue = !sidebarVisible
    setSidebarVisible(newValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem('diff-suite-sidebar-visible', String(newValue))
    }
  }, [sidebarVisible])

  // Load content/options from persistent storage on mount when enabled.
  // Mode tabs are restored via the lazy useState initializers above.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storage = window.localStorage

        // Use format+action-specific keys so JSON/XML/Text and Validate/Compare
        // all have isolated storage.
        const leftKey = `diffsuite_input_1_${formatType}_${actionType}`
        const rightKey = `diffsuite_input_2_${formatType}_${actionType}`

        let savedLeft = storage.getItem(leftKey) || ''
        let savedRight = storage.getItem(rightKey) || ''

        // Backwards compatibility: migrate older keys forward into the
        // new format+action-specific keys.
        if (!savedLeft && !savedRight) {
          // v2: format-specific only (diffsuite_input_1_json, etc.)
          const formatLeftKey = `diffsuite_input_1_${formatType}`
          const formatRightKey = `diffsuite_input_2_${formatType}`

          const formatLeft = storage.getItem(formatLeftKey) || ''
          const formatRight = storage.getItem(formatRightKey) || ''

          if (formatLeft || formatRight) {
            savedLeft = formatLeft
            savedRight = formatRight

            if (formatLeft) storage.setItem(leftKey, formatLeft)
            if (formatRight) storage.setItem(rightKey, formatRight)

            storage.removeItem(formatLeftKey)
            storage.removeItem(formatRightKey)
          }
        }

        if (!savedLeft && !savedRight) {
          // v1: legacy non-format-specific keys
          const legacyLeft = storage.getItem('diffsuite_input_1') || ''
          const legacyRight = storage.getItem('diffsuite_input_2') || ''

          if (legacyLeft || legacyRight) {
            savedLeft = legacyLeft
            savedRight = legacyRight

            if (legacyLeft) storage.setItem(leftKey, legacyLeft)
            if (legacyRight) storage.setItem(rightKey, legacyRight)

            storage.removeItem('diffsuite_input_1')
            storage.removeItem('diffsuite_input_2')
          }
        }

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
            } catch { }
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

            // Use format+action-specific keys to prevent data leakage
            // between JSON/XML/Text and Validate/Compare.
            const leftKey = `diffsuite_input_1_${formatType}_${actionType}`
            const rightKey = `diffsuite_input_2_${formatType}_${actionType}`

          // Only save content when it exists - don't remove from localStorage when empty
          // This allows reset button to clear UI while preserving data for refresh
          if (leftContent) {
            storage.setItem(leftKey, leftContent)
          }
          if (rightContent) {
            storage.setItem(rightKey, rightContent)
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
    setMobileOpen(false) // Close sidebar on selection (mobile)

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
    } catch { }
  }, [formatType])

  const handleActionChange = useCallback((newAction: ActionType) => {
    setActionType(newAction)
    setLeftContent('')
    setRightContent('')
    setMobileOpen(false) // Close sidebar on selection (mobile)
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

  const handleStorageToggle = useCallback((enabled: boolean) => {
    setEnableStorage(enabled)
    localStorage.setItem('diff-suite-storage-enabled', String(enabled))
    if (!enabled) {
      const storages = [window.localStorage, window.sessionStorage]
      const formats: FormatType[] = ['json', 'xml', 'text']
      const actions: ActionType[] = ['validate', 'compare']
      for (const s of storages) {
        try {
          // Remove legacy non-format-specific keys
          s.removeItem('diffsuite_input_1')
          s.removeItem('diffsuite_input_2')
          s.removeItem('diffsuite_options')

          // Remove format-specific keys for all supported formats
          for (const fmt of formats) {
            s.removeItem(`diffsuite_input_1_${fmt}`)
            s.removeItem(`diffsuite_input_2_${fmt}`)
            // Remove format+action-specific keys for all combinations
            for (const act of actions) {
              s.removeItem(`diffsuite_input_1_${fmt}_${act}`)
              s.removeItem(`diffsuite_input_2_${fmt}_${act}`)
            }
          }
        } catch { }
      }
      setLeftContent('')
      setRightContent('')
      setOptions({ ...defaultComparisonOptions })
      setSnackbar({ open: true, message: 'Auto-save disabled - Data will clear on refresh', severity: 'warning' })
    } else {
      setSnackbar({ open: true, message: 'Auto-save enabled - Your work will be saved', severity: 'success' })
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
        } catch { }
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
    // DO NOT clear localStorage - only clear UI state
    // localStorage should only be cleared when session storage is disabled
    // This allows data to be restored on page refresh
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
    } catch { }
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
    } catch { }
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
      }}
    >
      <Header
        enableStorage={enableStorage}
        onStorageToggle={handleStorageToggle}
        onSettingsClick={() => {
          if (actionType !== 'compare') return
          if (typeof window !== 'undefined') {
            try {
              // @ts-ignore
              window.comparisonViewOpenSettings?.(null)
            } catch { }
          }
        }}
        onDrawerToggle={handleDrawerToggle}
        sidebarVisible={sidebarVisible}
        onSidebarToggle={handleSidebarToggle}
      />

      <Box sx={{ display: 'flex', flex: 1, pt: { xs: '70px', sm: '88px' } }}>
        <Sidebar
          mobileOpen={mobileOpen}
          onDrawerToggle={handleDrawerToggle}
          formatType={formatType}
          actionType={actionType}
          onFormatChange={handleFormatChange}
          onActionChange={handleActionChange}
          sidebarVisible={sidebarVisible}
          enableStorage={enableStorage}
          onStorageToggle={handleStorageToggle}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: {
              xs: '100%',
              md: sidebarVisible ? `calc(100% - 280px)` : '100%'
            },
            transition: 'width 0.3s ease'
          }}
        >
          <Container maxWidth={false} sx={{ maxWidth: { xs: '100%', lg: 1400 }, mx: 'auto', px: { xs: 0, md: 2 } }}>
            {actionType === 'validate' && (
              <Paper
                elevation={0}
                className="glass-card dark:glass-card-dark"
                sx={{
                  p: 1.5,
                  mb: 3,
                  borderRadius: '16px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1.5,
                  flexWrap: 'wrap',
                  width: 'fit-content',
                  mx: 'auto',
                }}
              >
                <ActionButton
                  component="label"
                  title="Upload file"
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
                </ActionButton>

                {leftContent && (
                  <>
                    {(formatType === 'json' || formatType === 'xml') && (
                      <ActionButton
                        title={`Prettify ${formatType.toUpperCase()}`}
                        onClick={() => handlePrettify('single')}
                      >
                        <AutoFixHighIcon />
                      </ActionButton>
                    )}
                    <ActionButton
                      title="Download"
                      onClick={() => handleDownload(leftContent, `validate.${formatType}`)}
                    >
                      <DownloadIcon />
                    </ActionButton>
                    <ActionButton
                      title="Copy"
                      onClick={() => handleCopy(leftContent)}
                    >
                      <ContentCopyIcon />
                    </ActionButton>
                  </>
                )}
                <ActionButton
                  title="Reset"
                  onClick={handleReset}
                >
                  <RefreshIcon />
                </ActionButton>
              </Paper>
            )}
            {actionType === 'compare' && (
              <Box
                className="mb-4"
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                {/* Left-aligned controls (left editor) */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Paper
                    elevation={0}
                    className="glass-card dark:glass-card-dark"
                    sx={{ p: 1, borderRadius: '16px', display: 'flex', gap: 1 }}
                  >
                    <ActionButton
                      component="label"
                      title="Upload left"
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
                    </ActionButton>
                    {leftContent && (
                      <>
                        <ActionButton
                          title="Download left"
                          onClick={() => handleDownload(leftContent, `left.${formatType}`)}
                        >
                          <DownloadIcon />
                        </ActionButton>
                        {(formatType === 'json' || formatType === 'xml') && (
                          <ActionButton
                            title="Prettify left"
                            onClick={() => handlePrettify('left')}
                          >
                            <AutoFixHighIcon />
                          </ActionButton>
                        )}
                        <ActionButton
                          title="Copy left"
                          onClick={() => handleCopy(leftContent)}
                        >
                          <ContentCopyIcon />
                        </ActionButton>
                        <ActionButton
                          title="Clear left"
                          onClick={() => setLeftContent('')}
                        >
                          <RefreshIcon />
                        </ActionButton>
                      </>
                    )}
                  </Paper>
                </Box>

                {/* Center controls (shared actions) - Always centered */}
                <Paper
                  elevation={0}
                  className="glass-card dark:glass-card-dark"
                  sx={{ p: 1, borderRadius: '16px', display: 'flex', gap: 1 }}
                >
                  <ActionButton
                    title="Swap content"
                    onClick={handleSwap}
                    disabled={!leftContent.trim() || !rightContent.trim()}
                  >
                    <SwapHorizIcon />
                  </ActionButton>
                  <ActionButton
                    title="Comparison Options"
                    onClick={(e) => {
                      try {
                        // @ts-ignore
                        window.comparisonViewOpenSettings?.(e.currentTarget)
                      } catch { }
                    }}
                  >
                    <SettingsIcon />
                  </ActionButton>
                </Paper>

                {/* Right-aligned controls (right editor) */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Paper
                    elevation={0}
                    className="glass-card dark:glass-card-dark"
                    sx={{ p: 1, borderRadius: '16px', display: 'flex', gap: 1 }}
                  >
                    <ActionButton
                      component="label"
                      title="Upload right"
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
                    </ActionButton>
                    {rightContent && (
                      <>
                        <ActionButton
                          title="Download right"
                          onClick={() => handleDownload(rightContent, `right.${formatType}`)}
                        >
                          <DownloadIcon />
                        </ActionButton>
                        {(formatType === 'json' || formatType === 'xml') && (
                          <ActionButton
                            title="Prettify right"
                            onClick={() => handlePrettify('right')}
                          >
                            <AutoFixHighIcon />
                          </ActionButton>
                        )}
                        <ActionButton
                          title="Copy right"
                          onClick={() => handleCopy(rightContent)}
                        >
                          <ContentCopyIcon />
                        </ActionButton>
                        <ActionButton
                          title="Clear right"
                          onClick={() => setRightContent('')}
                        >
                          <RefreshIcon />
                        </ActionButton>
                      </>
                    )}
                  </Paper>
                </Box>
              </Box>
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
        </Box>
      </Box>

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
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-in-out',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          <Box
            sx={(theme) => ({
              background: theme.palette.mode === 'dark'
                ? 'rgba(30, 30, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: theme.palette.mode === 'dark'
                ? '1px solid rgba(124, 58, 237, 0.3)'
                : '1px solid rgba(124, 58, 237, 0.2)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
                : '0 20px 60px rgba(124, 58, 237, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
              p: 4,
              minWidth: 280,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              animation: 'scaleIn 0.3s ease-out',
              '@keyframes scaleIn': {
                from: { transform: 'scale(0.9)', opacity: 0 },
                to: { transform: 'scale(1)', opacity: 1 },
              },
            })}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Gradient background circle */}
              <Box
                sx={{
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)', opacity: 0.5 },
                    '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                  },
                }}
              />
              {/* Spinner with gradient */}
              <CircularProgress
                size={56}
                thickness={4}
                sx={{
                  color: 'transparent',
                  '& .MuiCircularProgress-circle': {
                    stroke: 'url(#gradient)',
                    strokeLinecap: 'round',
                  },
                }}
              />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </Box>

            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography
                variant="body1"
                sx={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 700,
                  fontSize: '1rem',
                  mb: 0.5,
                }}
              >
                {overlay.message || 'Processing…'}
              </Typography>
              {typeof overlay.progress === 'number' && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  {Math.max(0, Math.min(100, Math.round(overlay.progress)))}%
                </Typography>
              )}
            </Box>

            {typeof overlay.progress === 'number' && (
              <Box sx={{ width: '100%' }}>
                <Box
                  sx={{
                    height: 8,
                    width: '100%',
                    background: 'rgba(124, 58, 237, 0.1)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${Math.max(0, Math.min(100, Math.round(overlay.progress)))}%`,
                      background: 'linear-gradient(90deg, #7c3aed 0%, #ec4899 100%)',
                      borderRadius: 12,
                      transition: 'width 300ms ease',
                      boxShadow: '0 0 10px rgba(124, 58, 237, 0.5)',
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
