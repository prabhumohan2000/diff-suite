'use client'

import React, { memo, useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FormatType } from '@/types'
import styles from './CodeEditor.module.css'

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

function CodeEditor({
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
  const theme = useTheme()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isPlainText = formatType === 'text'

  const getPlaceholder = () => {
    if (placeholder) return placeholder
    if (formatType === 'json') return 'Paste your JSON here...'
    if (formatType === 'xml') return 'Paste your XML here...'
    return 'Paste your text here...'
  }

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const next = (e.target as HTMLTextAreaElement).value
    onChange(next)
  }

  // Keep the uncontrolled textarea in sync when external value changes (e.g., reset)
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value
    }
  }, [value])

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
      <textarea
        ref={textareaRef}
        defaultValue={value}
        onInput={handleInput}
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
          whiteSpace: isPlainText ? 'pre-wrap' : 'pre',
          overflowX: isPlainText ? 'hidden' : 'auto',
          overflowY: 'auto',
          wordBreak: isPlainText ? 'break-word' : 'normal',
          overflowWrap: isPlainText ? 'break-word' : 'normal',
        }}
        data-gramm="false"
        data-enable-grammarly="false"
        data-gramm_editor="false"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {helperText && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: error ? 'error.main' : 'text.secondary' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  )
}
export default memo(CodeEditor)

