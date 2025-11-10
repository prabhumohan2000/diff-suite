'use client'

import React, { useMemo, useRef, useEffect } from 'react'
import { useTheme } from '@mui/material/styles'
import styles from './CodeEditor.module.css'
import { TextField, Box, Typography } from '@mui/material'
import { FormatType } from '@/types'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  formatType?: FormatType
  readOnly?: boolean
  showLineNumbers?: boolean
  error?: boolean
  helperText?: string
}

export default function CodeEditor({
  value,
  onChange,
  placeholder,
  label,
  formatType = 'text',
  readOnly = false,
  showLineNumbers = true,
  error = false,
  helperText,
}: CodeEditorProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLarge = useMemo(() => value.length > 300_000, [value])

  const largeTextRef = useRef<HTMLTextAreaElement | null>(null)
  const theme = useTheme()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    if (isLarge) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => onChange(next), 120)
    } else {
      onChange(next)
    }
  }

  const handleLargeInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const next = (e.target as HTMLTextAreaElement).value
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    // Debounce larger inputs slightly longer to reduce pressure
    debounceTimer.current = setTimeout(() => onChange(next), 200)
  }

  // Keep uncontrolled textarea in sync if parent value changes (e.g., reset)
  useEffect(() => {
    if (!isLarge && largeTextRef.current) {
      // parent switched to small mode; nothing to do
      return
    }
    if (isLarge && largeTextRef.current) {
      if (largeTextRef.current.value !== value) {
        largeTextRef.current.value = value
      }
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [isLarge, value])
  const getPlaceholder = () => {
    if (placeholder) return placeholder
    if (formatType === 'json') return 'Paste your JSON here...'
    if (formatType === 'xml') return 'Paste your XML here...'
    return 'Paste your text here...'
  }

  return (
    <Box className="w-full">
      {label && (
        <Typography 
          variant="subtitle2" 
          className="mb-3 font-bold text-sm uppercase tracking-wide"
          sx={{ color: 'text.secondary' }}
        >
          {label}
        </Typography>
      )}

      {isLarge ? (
        <textarea
          ref={largeTextRef}
          defaultValue={value}
          onInput={handleLargeInput}
          placeholder={getPlaceholder()}
          disabled={readOnly}
          aria-label={label || 'Code editor'}
          className={styles.largeTextarea}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxSizing: 'border-box',
            resize: 'none',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'auto',
          }}
          data-gramm="false"
          data-enable-grammarly="false"
          data-gramm_editor="false"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      ) : (
        <TextField
          fullWidth
          multiline
          value={value}
          onChange={handleChange}
          placeholder={getPlaceholder()}
          error={error}
          helperText={helperText}
          disabled={readOnly}
          variant="outlined"
          className="font-mono smooth-transition"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'divider',
              },
              '&.Mui-focused': {
                borderColor: 'primary.main',
                '& fieldset': {
                  borderColor: 'primary.main !important',
                  borderWidth: '1px !important',
                },
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
              },
              '& input::placeholder': {
                color: 'text.secondary',
                opacity: 1,
              },
            },
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              height: { xs: '300px', md: '400px' },
              maxHeight: { xs: '300px', md: '400px' },
              alignItems: 'flex-start',
              overflow: 'hidden',
            },
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              lineHeight: 1.5,
              padding: 2,
              height: '100%',
              overflow: 'auto !important',
              overflowY: 'auto',
              overflowX: 'auto',
              whiteSpace: 'pre',
              wordBreak: 'normal',
              overflowWrap: 'normal',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: (theme) => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: (theme) => 
                    theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.3)',
                },
              },
            },
            '& textarea': {
              resize: 'none',
              height: '100% !important',
              overflow: 'auto !important',
            },
          }}
          InputProps={{
            sx: {
              height: '100%',
            },
          }}
          inputProps={{
            'data-gramm': 'false',
            'data-enable-grammarly': false,
            'data-gramm_editor': false,
            spellCheck: false,
            autoCorrect: 'off',
            autoCapitalize: 'off',
          }}
        />
      )}
    </Box>
  )
}

