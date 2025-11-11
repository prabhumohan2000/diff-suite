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
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CodeEditor from '@/components/CodeEditor'
import DiffDisplay from '@/components/DiffDisplay'
import FileDropZone, { UploadedFileInfo } from '@/components/FileDropZone'
import { FormatType, ComparisonResult, ComparisonOptions, ValidationResult } from '@/types'
import { compareJSON, reorderObjectKeys } from '@/utils/comparators/jsonComparator'
import { compareXML } from '@/utils/comparators/xmlComparator'
import { computeDiff, sortObjectKeys, computeLineDiff } from '@/utils/diffChecker'
import { createLineDiff } from '@/utils/diffUtils/lineDiff'
import { normalizeXMLAttributes } from '@/utils/xmlNormalizer'
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
  const workerRef = useRef<Worker | null>(null)
  const pendingRequestIdRef = useRef<string | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const [leftFileInfo, setLeftFileInfo] = useState<UploadedFileInfo | null>(null)
  const [rightFileInfo, setRightFileInfo] = useState<UploadedFileInfo | null>(null)

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
  };

  const isLargeContent = useCallback((content: string) => {
    return content.length > 10_000 // Consider content large if over 50KB
  }, [])

  useEffect(() => {
    // Try to create the worker; if it fails, we'll fallback to main-thread compare
    try {
      // worker file relative to this module
      workerRef.current = new Worker(new URL('../../workers/compare.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current.onmessage = (e: MessageEvent<any>) => {
        const data = e.data || {}
        const { id } = data
        if (pendingRequestIdRef.current && id !== pendingRequestIdRef.current) return

        // Handle streaming progress without clearing the pending id
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
    } catch (err) {
      // Worker not available – fine, we'll run comparisons on main thread
      workerRef.current = null
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Expose an opener so parent toolbar Settings button can anchor this menu
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.comparisonViewOpenSettings = (anchor?: HTMLElement | null) => {
        if (anchor) setAnchorEl(anchor)
        else setAnchorEl(document.body as unknown as HTMLElement)
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

    // Use setTimeout so UI can render loading state
    setTimeout(() => {
      try {
        let comparisonResult: ComparisonResult
        if (formatType === 'json') {
          // Validate both JSON inputs first
          const leftValidation = validateJSON(leftContent)
          const rightValidation = validateJSON(rightContent)

          if (!leftValidation.valid || !rightValidation.valid) {
            setResult({
              identical: false,
              errors: {
                left: !leftValidation.valid ? {
                  message: leftValidation.error?.message || 'Invalid JSON',
                  position: leftValidation.error?.position,
                  line: leftValidation.error?.line,
                  column: leftValidation.error?.column
                } : undefined,
                right: !rightValidation.valid ? {
                  message: rightValidation.error?.message || 'Invalid JSON',
                  position: rightValidation.error?.position,
                  line: rightValidation.error?.line,
                  column: rightValidation.error?.column,
                } : undefined,
              }
            })
            setShowResults(true)
            return
          }

          // Fallback: for large JSON and no worker, avoid deep structural diff
          if (isLargeContent(leftContent) || isLargeContent(rightContent)) {
            let leftText = leftContent
            let rightText = rightContent
            if (!options.ignoreKeyOrder) {
              // When ignoreKeyOrder is false, normalize key order for consistent line-by-line comparison
              try {
                const leftParsed = JSON.parse(leftText)
                const rightParsed = JSON.parse(rightText)
                if (leftParsed !== null && typeof leftParsed === 'object' && !Array.isArray(leftParsed) &&
                    rightParsed !== null && typeof rightParsed === 'object' && !Array.isArray(rightParsed)) {
                  // Reorder right to match left's key order
                  const reorderedRight = reorderObjectKeys(rightParsed, leftParsed)
                  leftText = JSON.stringify(leftParsed, null, 2)
                  rightText = JSON.stringify(reorderedRight, null, 2)
                }
              } catch {}
            }
            const d = computeDiff(leftText, rightText, { ignoreWhitespace: !!options.ignoreWhitespace, caseSensitive: options.caseSensitive !== false })
            const added = d.rightLines.filter((x) => x.type === 'added').length
            const removed = d.leftLines.filter((x) => x.type === 'removed').length
            const modified = Math.min(
              d.leftLines.filter((x) => x.type === 'changed').length,
              d.rightLines.filter((x) => x.type === 'changed').length
            )
            comparisonResult = {
              identical: added === 0 && removed === 0 && modified === 0,
              summary: { added, removed, modified },
              differences: added + removed + modified > 0 ? [{ type: 'modified', path: '$' }] as any : [],
              leftLines: d.leftLines.map((l) => ({ lineNumber: l.lineNumber, type: (l.type === 'changed' ? 'removed' : (l.type as any)), content: l.content })),
              rightLines: d.rightLines.map((r) => ({ lineNumber: r.lineNumber, type: (r.type === 'changed' ? 'added' : (r.type as any)), content: r.content })),
            } as any
          } else {
            comparisonResult = compareJSON(leftContent, rightContent, {
              ignoreKeyOrder: options.ignoreKeyOrder,
              ignoreArrayOrder: options.ignoreArrayOrder,
              caseSensitive: options.caseSensitive,
              ignoreWhitespace: options.ignoreWhitespace,
            })
            // Create line diff with normalized key order for display only when ignoreKeyOrder is false
            if (!options.ignoreKeyOrder) {
              try {
                let leftForDiff = leftContent
                let rightForDiff = rightContent
                const leftParsed = JSON.parse(leftContent)
                const rightParsed = JSON.parse(rightContent)
                if (leftParsed !== null && typeof leftParsed === 'object' && !Array.isArray(leftParsed) &&
                    rightParsed !== null && typeof rightParsed === 'object' && !Array.isArray(rightParsed)) {
                  // When ignoreKeyOrder is false, reorder right to match left's key order
                  const reorderedRight = reorderObjectKeys(rightParsed, leftParsed)
                  leftForDiff = JSON.stringify(leftParsed, null, 2)
                  rightForDiff = JSON.stringify(reorderedRight, null, 2)
                  const ld = createLineDiff(leftForDiff, rightForDiff, { ignoreWhitespace: !!options.ignoreWhitespace, caseSensitive: options.caseSensitive !== false })
                  comparisonResult = { ...comparisonResult, leftLines: ld.leftLines, rightLines: ld.rightLines } as any
                }
              } catch {}
            }
          }
        } else if (formatType === 'xml') {
          // Validate both XML inputs first
          const leftValidation = validateXML(leftContent)
          const rightValidation = validateXML(rightContent)

          if (!leftValidation.valid || !rightValidation.valid) {
            setResult({
              identical: false,
              errors: {
                left: !leftValidation.valid ? {
                  message: leftValidation.error?.message || 'Invalid XML',
                  line: leftValidation.error?.line,
                  column: leftValidation.error?.column,
                  code: leftValidation.error?.code
                } : undefined,
                right: !rightValidation.valid ? {
                  message: rightValidation.error?.message || 'Invalid XML',
                  line: rightValidation.error?.line,
                  column: rightValidation.error?.column,
                  code: rightValidation.error?.code
                } : undefined
              }
            })
            setShowResults(true)
            return
          }

          if (isLargeContent(leftContent) || isLargeContent(rightContent)) {
            let leftText = leftContent
            let rightText = rightContent
            if (options.ignoreAttributeOrder) {
              try {
                leftText = normalizeXMLAttributes(leftText)
                rightText = normalizeXMLAttributes(rightText)
              } catch {}
            }
            const d = computeDiff(leftText, rightText, { ignoreWhitespace: !!options.ignoreWhitespace, caseSensitive: options.caseSensitive !== false })
            const added = d.rightLines.filter((x) => x.type === 'added').length
            const removed = d.leftLines.filter((x) => x.type === 'removed').length
            const modified = Math.min(
              d.leftLines.filter((x) => x.type === 'changed').length,
              d.rightLines.filter((x) => x.type === 'changed').length
            )
            comparisonResult = {
              identical: added === 0 && removed === 0 && modified === 0,
              summary: { added, removed, modified },
              differences: added + removed + modified > 0 ? [{ type: 'modified', path: '$' }] as any : [],
              leftLines: d.leftLines.map((l) => ({ lineNumber: l.lineNumber, type: (l.type === 'changed' ? 'removed' : (l.type as any)), content: l.content })),
              rightLines: d.rightLines.map((r) => ({ lineNumber: r.lineNumber, type: (r.type === 'changed' ? 'added' : (r.type as any)), content: r.content })),
            } as any
          } else {
            comparisonResult = compareXML(leftContent, rightContent, {
              ignoreAttributeOrder: options.ignoreAttributeOrder,
              ignoreWhitespace: options.ignoreWhitespace,
              caseSensitive: options.caseSensitive,
            })
          }
        } else {
            comparisonResult = compareTextEnhanced(leftContent, rightContent, {
            caseSensitive: options.caseSensitive,
            ignoreWhitespace: options.ignoreWhitespace,
          })
        }

        setResult(comparisonResult)
        setShowResults(true)
      } catch (error) {
        setResult({
          identical: false,
          summary: { added: 0, removed: 0, modified: 0 },
        })
        setShowResults(true)
        console.error('Comparison error:', error)
      } finally {
        setLoading(false)
        // Hide overlay if it was shown for large content
        if ((isLargeContent(leftContent) || isLargeContent(rightContent))) {
          try {
            // @ts-ignore
            window.globalOverlay?.hide?.()
          } catch {}
        }
      }
    }, 0)
  }, [leftContent, rightContent, formatType, options, isLargeContent])

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
        open={Boolean(anchorEl)}
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
              <CodeEditor
                value={leftContent}
                onChange={handleLeftChange}
                formatType={formatType}
                label=""
                placeholder={`Paste first ${formatType.toUpperCase()} here...`}
              />
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
              <CodeEditor
                value={rightContent}
                onChange={handleRightChange}
                formatType={formatType}
                label=""
                placeholder={`Paste second ${formatType.toUpperCase()} here...`}
              />
            </FileDropZone>
          </Paper>
        </Grid>
      </Grid>

      <Box className="mt-4 flex justify-center items-center gap-2">
        <Button
          variant="contained"
          size="large"
          onClick={() => startTransition(() => handleCompare())}
          disabled={loading || !leftContent.trim() || !rightContent.trim()}
          className="w-full sm:w-auto min-w-[200px] smooth-transition"
          startIcon={loading ? null : <CompareArrowsIcon />}
          sx={{
            background: loading ? '#8a4baf' : '#7c3aed',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
            fontWeight: 700,
            textTransform: 'none',
            py: 1.5,
            px: 4,
            mt: 1,
            borderRadius: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
              filter: 'brightness(110%)',
              boxShadow: '0 6px 20px rgba(236, 72, 153, 0.5)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)',
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
              boxShadow: 'none',
            },
          }}
          disableRipple
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
              {(leftFileInfo || rightFileInfo) && (
                <Paper
                  elevation={0}
                  className="glass-card dark:glass-card-dark p-4 mb-4 smooth-transition"
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                  }}
                >
                  {leftFileInfo && (
                    <Box
                      className="flex-1"
                      sx={{
                        borderRadius: 2,
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        p: 2,
                        backgroundColor: 'rgba(124, 58, 237, 0.04)',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Left File
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {leftFileInfo.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Size: {leftFileInfo.size} • Type: {leftFileInfo.type}
                      </Typography>
                    </Box>
                  )}
                  {rightFileInfo && (
                    <Box
                      className="flex-1"
                      sx={{
                        borderRadius: 2,
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        p: 2,
                        backgroundColor: 'rgba(124, 58, 237, 0.04)',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Right File
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {rightFileInfo.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Size: {rightFileInfo.size} • Type: {rightFileInfo.type}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
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
