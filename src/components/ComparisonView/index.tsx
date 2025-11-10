'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
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
import FileDropZone from '@/components/FileDropZone'
import { FormatType, ComparisonResult, ComparisonOptions, ValidationResult } from '@/types'
import { compareJSON } from '@/utils/comparators/jsonComparator'
import { compareXML } from '@/utils/comparators/xmlComparator'
import { compareTextEnhanced } from '@/utils/comparators/textComparator'
import { validateJSON } from '@/utils/validators/jsonValidator'
import { validateXML } from '@/utils/validators/xmlValidator'

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
  const [loading, setLoading] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const pendingRequestIdRef = useRef<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  })

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isLargeContent = useCallback((content: string) => {
    return content.length > 100000 // Consider content large if over 100KB
  }, [])

  useEffect(() => {
    // Try to create the worker; if it fails, we'll fallback to main-thread compare
    try {
      // worker file relative to this module
      workerRef.current = new Worker(new URL('../../workers/compare.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current.onmessage = (e: MessageEvent<any>) => {
        const { id, result, error } = e.data || {}
        if (pendingRequestIdRef.current && id !== pendingRequestIdRef.current) return
        pendingRequestIdRef.current = null
        if (error) {
          console.error('Worker error:', error)
          setSnackbar({ open: true, message: String(error), severity: 'error' })
          setLoading(false)
          return
        }
        setResult(result)
        setLoading(false)
        // Clear processing notification if shown
        setSnackbar({ open: false, message: '', severity: 'info' })
      }
    } catch (err) {
      // Worker not available — fine, we'll run comparisons on main thread
      workerRef.current = null
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  const handleCompare = useCallback(() => {
    setLoading(true)
    // Show immediate feedback for large content
    if (isLargeContent(leftContent) || isLargeContent(rightContent)) {
      setSnackbar?.({
        open: true,
        message: "Processing large content, this may take a moment...",
        severity: "info"
      })
    }
    // Use worker for large inputs when available
    if (workerRef.current && (isLargeContent(leftContent) || isLargeContent(rightContent))) {
      const id = `${Date.now()}-${Math.random()}`
      pendingRequestIdRef.current = id
      try {
        workerRef.current.postMessage({ id, left: leftContent, right: rightContent, formatType, options })
      } catch (err) {
        // If worker postMessage fails, fallback to main thread
        console.error('Worker postMessage failed, falling back to main-thread compare', err)
        // Fallthrough to main-thread path below
      }
      return
    }

    // Fallback: run comparison on main thread (small inputs or no worker)
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
                  column: rightValidation.error?.column
                } : undefined
              }
            })
            return
          }

          comparisonResult = compareJSON(leftContent, rightContent, {
            ignoreKeyOrder: options.ignoreKeyOrder,
            ignoreArrayOrder: options.ignoreArrayOrder,
            caseSensitive: options.caseSensitive,
            ignoreWhitespace: options.ignoreWhitespace,
          })
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
            return
          }

          comparisonResult = compareXML(leftContent, rightContent, {
            ignoreAttributeOrder: options.ignoreAttributeOrder,
            ignoreWhitespace: options.ignoreWhitespace,
            caseSensitive: options.caseSensitive,
          })
        } else {
          comparisonResult = compareTextEnhanced(leftContent, rightContent, {
            caseSensitive: options.caseSensitive,
            ignoreWhitespace: options.ignoreWhitespace,
          })
        }

        setResult(comparisonResult)
      } catch (error) {
        setResult({
          identical: false,
          summary: { added: 0, removed: 0, modified: 0 },
        })
        console.error('Comparison error:', error)
      } finally {
        setLoading(false)
        // Clear the processing message if it was shown
        if (isLargeContent(leftContent) || isLargeContent(rightContent)) {
          setSnackbar?.({
            open: false,
            message: "",
            severity: "info"
          })
        }
      }
    }, 0)
  }, [leftContent, rightContent, formatType, options, isLargeContent, setSnackbar])

  const handleOptionChange = (key: keyof ComparisonOptions) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onOptionsChange({
      ...options,
      [key]: event.target.checked,
    } as ComparisonOptions)
  }

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
                  color: '#6b21a8',
                }} />
              ) : (
                <CheckBoxOutlineBlankIcon sx={{ color: '#6b21a8' }} />
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
                color: '#6b21a8',
              }} />
            ) : (
              <CheckBoxOutlineBlankIcon sx={{ color: '#6b21a8' }} />
            )}
          </ListItemIcon>
          <ListItemText>Ignore Whitespace</ListItemText>
        </MenuItem>
        <MenuItem onClick={(e) => onOptionsChange({ ...options, caseSensitive: !options.caseSensitive })}>
          <ListItemIcon sx={{ minWidth: '36px' }}>
            {options.caseSensitive ? (
              <CheckBoxIcon sx={{ 
                '& path': {
                  fill: 'url(#gradientCheckbox)',
                },
                color: '#6b21a8',
              }} />
            ) : (
              <CheckBoxOutlineBlankIcon sx={{ color: '#6b21a8' }} />
            )}
          </ListItemIcon>
          <ListItemText>Case Sensitive</ListItemText>
        </MenuItem>
        <svg width={0} height={0}>
          <defs>
            <linearGradient id="gradientCheckbox" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b21a8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
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
                  onLeftContentChange(content)
                }
                reader.readAsText(file)
              }}
              side="left"
              formatType={formatType}
            >
              <CodeEditor
                value={leftContent}
                onChange={onLeftContentChange}
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
                  onRightContentChange(content)
                }
                reader.readAsText(file)
              }}
              side="right"
              formatType={formatType}
            >
              <CodeEditor
                value={rightContent}
                onChange={onRightContentChange}
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
          onClick={handleCompare}
          disabled={loading || !leftContent.trim() || !rightContent.trim()}
          className="w-full sm:w-auto min-w-[200px] smooth-transition"
          startIcon={loading ? null : <CompareArrowsIcon />}
          sx={{
            background: loading 
              ? 'linear-gradient(135deg, #5b21b6, #db2777)'
              : 'linear-gradient(135deg, #6b21a8, #a855f7, #ec4899)',
            boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)',
            fontWeight: 700,
            textTransform: 'none',
            py: 1.5,
            px: 4,
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
        <IconButton 
          onClick={handleMenuClick}
          size="large"
          className="smooth-transition"
          sx={{
            background: 'linear-gradient(135deg, #6b21a8, #a855f7)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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

      {result && (
        <Box className="mt-6 smooth-transition">
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

