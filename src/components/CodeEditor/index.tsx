'use client'

import React from 'react'
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
      <TextField
        fullWidth
        multiline
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
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
      />
    </Box>
  )
}

