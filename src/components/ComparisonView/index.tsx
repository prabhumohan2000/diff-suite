'use client'

import React, { useState, useCallback, useEffect, useRef, startTransition } from 'react'
import {
  Box,
  Button,
  Paper,
  Grid,
  Divider,
  Typography,
  Stack,
  Chip,
  Alert,
  AlertTitle,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
  CircularProgress,
  Snackbar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import SettingsIcon from '@mui/icons-material/Settings'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CodeEditor from '@/components/CodeEditor'
import DiffDisplay from '@/components/DiffDisplay'
import FileDropZone, { UploadedFileInfo } from '@/components/FileDropZone'
import { FormatType, ComparisonResult, ComparisonOptions, ValidationResult } from '@/types'
import { compareJSON, reorderObjectKeys } from '@/utils/comparators/jsonComparator'
import { compareXML } from '@/utils/comparators/xmlComparator'
import { computeDiff, sortObjectKeys, computeLineDiff } from '@/utils/diffUtils/diffChecker'
import { createLineDiff } from '@/utils/diffUtils/lineDiff'
import { normalizeXMLAttributes } from '@/utils/diffUtils/xmlNormalizer'
import { prettifyXML } from '@/utils/diffUtils/xmlFormatter'
import { validateJSON } from '@/utils/validators/jsonValidator'
import { validateXML } from '@/utils/validators/xmlValidator'
import {  compareTextEnhanced } from '@/utils/comparators/textComparator'

interface ComparisonViewProps {
  formatType: FormatType
  leftContent: string
  rightContent: string
  onLeftContentChange: (content: string) => void
  onRightContentChange: (content: string) => void
  options: ComparisonOptions
  onOptionsChange: (options: ComparisonOptions) => void
}

export default function ComparisonView({
  formatType,
  leftContent,
  rightContent,
  onLeftContentChange,
  onRightContentChange,
  options,
  onOptionsChange,
}: ComparisonViewProps) {
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const pendingRequestIdRef = useRef<string | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const [leftFileInfo, setLeftFileInfo] = useState<UploadedFileInfo | null>(null)
  const [rightFileInfo, setRightFileInfo] = useState<UploadedFileInfo | null>(null)
  const lastPrettifyRef = useRef<{ side: 'left' | 'right'; prev: string } | null>(null)

  // Reset all states when inputs are cleared
  useEffect(() => {
    if (!leftContent.trim()) {
      setLeftFileInfo(null)
    }
    if (!rightContent.trim()) {
      setRightFileInfo(null)
    }
    if (!leftContent.trim() || !rightContent.trim()) {
      setResult(null)
      setShowResults(false)
      setLoading(false)
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      pendingRequestIdRef.current = null
    }
  }, [leftContent, rightContent])

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (showResults && result && resultsRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [showResults, result])

  // Expose reset function to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore - we know this exists from the parent component
      window.comparisonViewResetRef = {
        current: () => {
          setResult(null)
          setShowResults(false)
          setLoading(false)
          if (workerRef.current) {
            workerRef.current.terminate()
            workerRef.current = null
          }
          pendingRequestIdRef.current = null
          setAnchorEl(null) // Close the settings menu if open
        }
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.comparisonViewResetRef = null
      }
    }
  }, [])
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  })

  const handleMenuClose = () => {
    setAnchorEl(null);
    setAnchorPosition(null);
  };

  const isLargeContent = useCallback((content: string) => {
    return content.length > 10_000 // Consider content large if over 50KB
  }, [])

  const handleDownload = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handlePrettifySide = useCallback((side: 'left' | 'right') => {
    const target = side === 'left' ? leftContent : rightContent
    const setSide = side === 'left' ? onLeftContentChange : onRightContentChange
    try {
      if (formatType === 'json') {
        lastPrettifyRef.current = { side, prev: target }
        const valid = validateJSON(target)
        if (!valid.valid) throw new Error('Cannot format invalid JSON')
        const formatted = JSON.stringify(JSON.parse(target), null, 2)
        setSide(formatted)
        return
      }
      if (formatType === 'xml') {
        lastPrettifyRef.current = { side, prev: target }
        const valid = validateXML(target)
        if (!valid.valid) throw new Error('Cannot format invalid XML')
        const formatted = prettifyXML(target)
        setSide(formatted)
        return
      }
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: e instanceof Error ? e.message : 'Could not format content',
        severity: 'error',
      })
    }
  }, [formatType, leftContent, rightContent, onLeftContentChange, onRightContentChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (!lastPrettifyRef.current) return
        e.preventDefault()
        const { side, prev } = lastPrettifyRef.current
        if (side === 'left') {
          onLeftContentChange(prev)
        } else {
          onRightContentChange(prev)
        }
        lastPrettifyRef.current = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onLeftContentChange, onRightContentChange])

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setSnackbar({
        open: true,
        message: 'Copied to clipboard',
        severity: 'success',
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      setSnackbar({
        open: true,
        message: 'Failed to copy to clipboard',
        severity: 'error',
      })
    }
  }, [])

  // Centralized worker initialization to avoid duplicate logic
  const initWorker = useCallback(() => {
    if (workerRef.current) return true
    try {
      const worker = new Worker(new URL('../../workers/compare.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onmessage = (e: MessageEvent<any>) => {
        const data = e.data || {}
        const { id } = data

        if (pendingRequestIdRef.current && id !== pendingRequestIdRef.current) return

        if (data.type === 'progress') {
          const p = typeof data.progress === 'number' ? data.progress : undefined
          const msg = typeof data.message === 'string' && data.message ? data.message : `Comparing…`
          try {
            // @ts-ignore
            window.globalOverlay?.show?.(msg, p)
            // @ts-ignore
            window.globalOverlay?.update?.(msg, p)
          } catch {}
          return
        }

        pendingRequestIdRef.current = null
        if (data.error) {
          console.error('Worker error:', data.error)
          setSnackbar({ open: true, message: String(data.error), severity: 'error' })
          setLoading(false)
          try {
            // @ts-ignore
            window.globalOverlay?.hide?.()
          } catch {}
          return
        }
        const result = data.result
        setResult(result)
        setShowResults(true)
        setLoading(false)
        try {
          // @ts-ignore
          window.globalOverlay?.hide?.()
        } catch {}
      }
      return true
    } catch (err) {
      console.error('Failed to initialize comparison worker:', err)
      workerRef.current = null
      return false
    }
  }, [])

  useEffect(() => {
    // Try to create the worker on mount; if it fails, we'll fallback to main-thread compare
    initWorker()
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [initWorker])

  // Expose an opener so parent toolbar Settings button can anchor this menu
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.comparisonViewOpenSettings = (anchor?: HTMLElement | null) => {
        if (anchor) {
          setAnchorEl(anchor)
          const rect = anchor.getBoundingClientRect()
          setAnchorPosition({
            top: rect.bottom + 8,
            left: rect.right - 8,
          })
        } else {
          setAnchorEl(null)
          setAnchorPosition({
            top: window.innerHeight * 0.2,
            left: window.innerWidth * 0.5,
          })
        }
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.comparisonViewOpenSettings = undefined
      }
    }
  }, [])

  const handleCompare = useCallback(() => {
    setLoading(true)
    // Prefer using worker when available to avoid blocking the UI
    if (!workerRef.current) {
      const ok = initWorker()
      if (!ok) {
        console.warn('Worker unavailable; will run compare on main thread')
      }
    }
    if (workerRef.current) {
      const id = `${Date.now()}-${Math.random()}`
      pendingRequestIdRef.current = id
      try {
        workerRef.current.postMessage({ id, left: leftContent, right: rightContent, formatType, options: { ...options, includeLineDiff: formatType !== 'text' } })
      } catch (err) {
        // If worker postMessage fails, fallback to main thread
        console.error('Worker postMessage failed, falling back to main-thread compare', err)
        // Fallthrough to main-thread path below
      }
      return
    }
  }, [leftContent, rightContent, formatType, options,initWorker])

  const handleOptionChange = (key: keyof ComparisonOptions) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Reset current results to require clicking Compare again
    setResult(null)
    setShowResults(false)
    onOptionsChange({
      ...options,
      [key]: event.target.checked,
    } as ComparisonOptions)
  }

  const handleToggleCaseSensitive = useCallback(() => {
    setResult(null)
    setShowResults(false)
    onOptionsChange({ ...options, caseSensitive: !options.caseSensitive })
  }, [onOptionsChange, options])

  const handleSwapMobile = useCallback(() => {
    if (!leftContent && !rightContent) return
    setResult(null)
    setShowResults(false)
    onLeftContentChange(rightContent)
    onRightContentChange(leftContent)
    setLeftFileInfo(rightFileInfo)
    setRightFileInfo(leftFileInfo)
  }, [leftContent, rightContent, onLeftContentChange, onRightContentChange, leftFileInfo, rightFileInfo])

  // When user edits either textarea, hide results to avoid heavy recompute
  // Note: We don't clear file info here - it should persist even if user edits the content
  const handleLeftChange = useCallback((content: string) => {
    setResult(null)
    setShowResults(false)
    onLeftContentChange(content)
    // Only clear file info if content is completely empty
    if (!content.trim()) {
      setLeftFileInfo(null)
    }
  }, [onLeftContentChange])

  const handleRightChange = useCallback((content: string) => {
    setResult(null)
    setShowResults(false)
    onRightContentChange(content)
    // Only clear file info if content is completely empty
    if (!content.trim()) {
      setRightFileInfo(null)
    }
  }, [onRightContentChange])

  return (
    <Box className="w-full relative z-10">
      <Menu
        anchorEl={anchorEl}
        anchorReference={anchorPosition ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={anchorPosition || undefined}
        open={Boolean(anchorEl || anchorPosition)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 0,
          className: "glass-card dark:glass-card-dark smooth-transition",
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))',
            mt: 1.5,
            '& .MuiMenuItem-root': {
              py: 1.5,
              px: 2,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, opacity: 0.7 }}>
          <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
            {formatType.toUpperCase()} Options
          </Typography>
        </Box>
        {formatType === 'json' && (
          <>
            <MenuItem onClick={() => handleOptionChange('ignoreKeyOrder')({ target: { checked: !options.ignoreKeyOrder }} as React.ChangeEvent<HTMLInputElement>)}>
              <ListItemIcon sx={{ minWidth: '36px' }}>
                {options.ignoreKeyOrder ? (
                  <CheckBoxIcon sx={{ 
                    '& path': {
                      fill: 'url(#gradientCheckbox)',
                    },
                    color: '#7c3aed',
                  }} />
                ) : (
                  <CheckBoxOutlineBlankIcon sx={{ color: '#7c3aed' }} />
                )}
              </ListItemIcon>
              <ListItemText>Ignore Key Order</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleOptionChange('ignoreArrayOrder')({ target: { checked: !options.ignoreArrayOrder }} as React.ChangeEvent<HTMLInputElement>)}>
              <ListItemIcon sx={{ minWidth: '36px' }}>
                {options.ignoreArrayOrder ? (
                  <CheckBoxIcon sx={{ 
                    '& path': {
                      fill: 'url(#gradientCheckbox)',
                    },
                    color: '#7c3aed',
                  }} />
                ) : (
                  <CheckBoxOutlineBlankIcon sx={{ color: '#7c3aed' }} />
                )}
              </ListItemIcon>
              <ListItemText>Ignore Array Order</ListItemText>
            </MenuItem>
          </>
        )}
        {formatType === 'xml' && (
          <MenuItem onClick={() => handleOptionChange('ignoreAttributeOrder')({ target: { checked: !options.ignoreAttributeOrder }} as React.ChangeEvent<HTMLInputElement>)}>
            <ListItemIcon sx={{ minWidth: '36px' }}>
              {options.ignoreAttributeOrder ? (
                <CheckBoxIcon sx={{ 
                  '& path': {
                    fill: 'url(#gradientCheckbox)',
                  },
                  color: '#7c3aed',
                }} />
              ) : (
                <CheckBoxOutlineBlankIcon sx={{ color: '#7c3aed' }} />
              )}
            </ListItemIcon>
            <ListItemText>Ignore Attribute Order</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => handleOptionChange('ignoreWhitespace')({ target: { checked: !options.ignoreWhitespace }} as React.ChangeEvent<HTMLInputElement>)}>
          <ListItemIcon sx={{ minWidth: '36px' }}>
            {options.ignoreWhitespace ? (
              <CheckBoxIcon sx={{ 
                '& path': {
                  fill: 'url(#gradientCheckbox)',
                },
                color: '#7c3aed',
              }} />
            ) : (
              <CheckBoxOutlineBlankIcon sx={{ color: '#7c3aed' }} />
            )}
          </ListItemIcon>
          <ListItemText>Ignore Whitespace</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleToggleCaseSensitive}>
          <ListItemIcon sx={{ minWidth: '36px' }}>
            {options.caseSensitive ? (
              <CheckBoxIcon sx={{ 
                '& path': {
                  fill: 'url(#gradientCheckbox)',
                },
                color: '#7c3aed',
              }} />
            ) : (
              <CheckBoxOutlineBlankIcon sx={{ color: '#7c3aed' }} />
            )}
          </ListItemIcon>
          <ListItemText>Case Sensitive</ListItemText>
        </MenuItem>
        <svg width={0} height={0}>
          <defs>
            <linearGradient id="gradientCheckbox" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </Menu>
    <Box className="mb-3 flex justify-center items-center gap-2">  
        <IconButton
          sx={{
            display: { xs: 'inline-flex', md: 'none' },
            backgroundColor: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(124, 58, 237, 0.16)',
            },
          }}
          aria-label="comparison settings"
          onClick={(e) => {
            setAnchorEl(e.currentTarget)
            setAnchorPosition(null)
          }}
        >
          <SettingsIcon />
        </IconButton>
        <IconButton
          sx={{
            display: { xs: 'inline-flex', md: 'none' },
            backgroundColor: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(124, 58, 237, 0.16)',
            },
          }}
          aria-label="swap content"
          disabled={!leftContent.trim() || !rightContent.trim()}
          onClick={handleSwapMobile}
        >
          <SwapHorizIcon />
        </IconButton>
    </Box>
      <Box className="mb-3 flex justify-center items-center gap-2">
        <Button
          variant="contained"
          size="large"
          onClick={() => startTransition(() => handleCompare())}
          disabled={loading || !leftContent.trim() || !rightContent.trim()}
          className="w-full sm:w-auto min-w-[160px] smooth-transition"
          // startIcon={loading ? null : <CompareArrowsIcon />}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            background: '#dc2626',
            boxShadow: '0 4px 16px rgba(248, 113, 113, 0.45)',
            py: 1.25,
            px: 4,
            borderRadius: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
              filter: 'brightness(108%)',
              boxShadow: '0 6px 22px rgba(248, 113, 113, 0.6)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 10px rgba(248, 113, 113, 0.5)',
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
              boxShadow: 'none',
            },
          }}
          disableElevation
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              <span>Processing...</span>
            </Box>
          ) : (
            'Compare'
          )}
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5.5}>
          <Paper 
            elevation={0}
            className="glass-card dark:glass-card-dark p-4 smooth-transition"
            sx={{
              height: '100%',
            }}
          >
            <FileDropZone
              onFileDrop={(file, side) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                  const content = e.target?.result as string
                  handleLeftChange(content)
                }
                reader.readAsText(file)
              }}
              side="left"
              formatType={formatType}
            onFileInfoChange={(info) => setLeftFileInfo(info)}
            >
            <>
              <Box
                  sx={{
                    display: { xs: 'flex', md: 'none' },
                    mt: 1,
                    mb: 1,
                    gap: 1,
                    justifyContent: 'flex-start',
                  }}
                >
                  <IconButton
                    component="label"
                    size="small"
                    aria-label="upload left mobile"
                  >
                    <FileUploadIcon fontSize="small" />
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
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const content = ev.target?.result as string
                          handleLeftChange(content)
                        }
                        reader.readAsText(file)
                      }}
                    />
                  </IconButton>
                  {leftContent && (
                    <>
                      <IconButton
                        size="small"
                        aria-label="download left mobile"
                        onClick={() => handleDownload(leftContent, `left.${formatType}`)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      {(formatType === 'json' || formatType === 'xml') && (
                        <IconButton
                          size="small"
                          aria-label="prettify left mobile"
                          onClick={() => handlePrettifySide('left')}
                        >
                          <AutoFixHighIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        aria-label="copy left mobile"
                        onClick={() => handleCopy(leftContent)}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="clear left mobile"
                        onClick={() => handleLeftChange('')}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
                <CodeEditor
                  value={leftContent}
                  onChange={handleLeftChange}
                  formatType={formatType}
                  label=""
                  placeholder={`Paste first ${formatType.toUpperCase()} here...`}
                />
              </>
            </FileDropZone>
          </Paper>
        </Grid>

        <Grid
          item
          xs={12}
          md={1}
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Divider orientation="vertical" flexItem>
            <Chip
              icon={<CompareArrowsIcon />}
              label="VS"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Divider>
        </Grid>

        <Grid item xs={12} md={5.5}>
          <Paper 
            elevation={0}
            className="glass-card dark:glass-card-dark p-4 smooth-transition"
            sx={{
              height: '100%',
            }}
          >
            <FileDropZone
              onFileDrop={(file, side) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                  const content = e.target?.result as string
                  handleRightChange(content)
                }
                reader.readAsText(file)
              }}
              side="right"
              formatType={formatType}
            onFileInfoChange={(info) => setRightFileInfo(info)}
            >
            <>
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                mt: 1,
                mb: 1,
                gap: 1,
                justifyContent: 'flex-start',
              }}
            >
              <IconButton
                component="label"
                size="small"
                aria-label="upload right mobile"
              >
                <FileUploadIcon fontSize="small" />
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
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      const content = ev.target?.result as string
                      handleRightChange(content)
                    }
                    reader.readAsText(file)
                  }}
                />
              </IconButton>
              {rightContent && (
                <>
                  <IconButton
                    size="small"
                    aria-label="download right mobile"
                    onClick={() => handleDownload(rightContent, `right.${formatType}`)}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  {(formatType === 'json' || formatType === 'xml') && (
                    <IconButton
                      size="small"
                      aria-label="prettify right mobile"
                      onClick={() => handlePrettifySide('right')}
                    >
                      <AutoFixHighIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    aria-label="copy right mobile"
                    onClick={() => handleCopy(rightContent)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="clear right mobile"
                    onClick={() => handleRightChange('')}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
            <CodeEditor
              value={rightContent}
              onChange={handleRightChange}
              formatType={formatType}
              label=""
              placeholder={`Paste second ${formatType.toUpperCase()} here...`}
            />
          </>
            </FileDropZone>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {showResults && result && leftContent.trim() && rightContent.trim() && (
        <Box ref={resultsRef} className="mt-6 smooth-transition">
          {result.errors ? (
            <>
              <Typography variant="h6" className="font-bold text-red-500 mb-4 text-center" sx={{marginBottom: '16px'}}>
                Invalid Data
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={5.5}>
                  {result.errors.left ? (
                    <Alert 
                      severity="error"
                      className="glass-card dark:glass-card-dark smooth-transition h-full"
                      sx={{
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(244, 67, 54, 0.2)',
                        '&:hover': {
                          boxShadow: '0 6px 24px rgba(244, 67, 54, 0.3)',
                        },
                      }}
                    >
                      <AlertTitle className="font-bold">Left Content Error</AlertTitle>
                      {result.errors.left.message}
                      {(result.errors.left.line || result.errors.left.column) && (
                        <Typography variant="body2" className="mt-2">
                          {result.errors.left.line && `Line: ${result.errors.left.line}`}
                          {result.errors.left.line && result.errors.left.column && ' | '}
                          {result.errors.left.column && `Column: ${result.errors.left.column}`}
                        </Typography>
                      )}
                    </Alert>
                  ) : (
                    <Alert severity="success" className="glass-card dark:glass-card-dark h-full">
                      <AlertTitle className="font-bold">Left Content Valid</AlertTitle>
                      The content is valid {formatType.toUpperCase()}
                    </Alert>
                  )}
                </Grid>

                <Grid
                  item
                  xs={12}
                  md={1}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Divider orientation="vertical" flexItem>
                    <Chip
                      icon={<CompareArrowsIcon />}
                      label="VS"
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Divider>
                </Grid>

                <Grid item xs={12} md={5.5}>
                  {result.errors.right ? (
                    <Alert 
                      severity="error"
                      className="glass-card dark:glass-card-dark smooth-transition h-full"
                      sx={{
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(244, 67, 54, 0.2)',
                        '&:hover': {
                          boxShadow: '0 6px 24px rgba(244, 67, 54, 0.3)',
                        },
                      }}
                    >
                      <AlertTitle className="font-bold">Right Content Error</AlertTitle>
                      {result.errors.right.message}
                      {(result.errors.right.line || result.errors.right.column) && (
                        <Typography variant="body2" className="mt-2">
                          {result.errors.right.line && `Line: ${result.errors.right.line}`}
                          {result.errors.right.line && result.errors.right.column && ' | '}
                          {result.errors.right.column && `Column: ${result.errors.right.column}`}
                        </Typography>
                      )}
                    </Alert>
                  ) : (
                    <Alert severity="success" className="glass-card dark:glass-card-dark h-full">
                      <AlertTitle className="font-bold">Right Content Valid</AlertTitle>
                      The content is valid {formatType.toUpperCase()}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </>
          ) : result.identical ? (
            <Alert 
              severity="success"
              className="glass-card dark:glass-card-dark smooth-transition"
              sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
                '&:hover': {
                  boxShadow: '0 6px 24px rgba(16, 185, 129, 0.3)',
                },
              }}
            >
              <AlertTitle className="font-bold">No Differences Found</AlertTitle>
              The two inputs are identical.
            </Alert>
          ) : (
            <>
              {result.summary && (
                <Paper 
                  elevation={0}
                  className="glass-card dark:glass-card-dark p-4 mb-4 smooth-transition"
                  sx={{
                    '&:hover': {
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                    },
                  }}
                >
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Chip
                      label={`Added: ${result.summary.added}`}
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600, transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
                    />
                    <Chip
                      label={`Removed: ${result.summary.removed}`}
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 600, transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
                    />
                    <Chip
                      label={`Modified: ${result.summary.modified}`}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 600, transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
                    />
                  </Stack>
                </Paper>
              )}
              <DiffDisplay
                formatType={formatType}
                result={result}
                leftContent={leftContent}
                rightContent={rightContent}
              />
            </>
          )}
        </Box>
      )}
    </Box>
  )
}
