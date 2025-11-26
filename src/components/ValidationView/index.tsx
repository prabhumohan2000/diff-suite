'use client'

import { useState, useCallback, useEffect, useRef, startTransition } from 'react'
import { Box, Button, Paper, Alert, AlertTitle, Accordion, AccordionSummary, AccordionDetails, Typography, Stack, Chip } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import CodeEditor from '@/components/CodeEditor'
import FileDropZone, { UploadedFileInfo } from '@/components/FileDropZone'
import { FormatType, ValidationResult } from '@/types'
import { validateJSON } from '@/utils/validators/jsonValidator'
import { validateXML } from '@/utils/validators/xmlValidator'

interface ValidationViewProps {
  formatType: FormatType
  content: string
  onContentChange: (content: string) => void
}

export default function ValidationView({
  formatType,
  content,
  onContentChange,
}: ValidationViewProps) {
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const [fileInfo, setFileInfo] = useState<UploadedFileInfo | null>(null)

  // Clear existing result on any edit so user must Validate again
  const handleContentEdit = useCallback((value: string) => {
    setResult(null)
    setLoading(false)
    onContentChange(value)
  }, [onContentChange])

  // Clear validation result when content is cleared
  useEffect(() => {
    if (!content.trim()) {
      setResult(null)
      setLoading(false)
      setFileInfo(null)
    }
  }, [content])

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [result])

  // Expose a reset to parent (used by page reset button)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore - exposed for parent usage
      window.validationViewResetRef = {
        current: () => {
          setResult(null)
          setLoading(false)
        }
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.validationViewResetRef = null
      }
    }
  }, [])

  const handleValidate = useCallback(() => {
    setLoading(true)
    try {
      let validationResult: ValidationResult

      if (formatType === 'json') {
        validationResult = validateJSON(content)
      } else if (formatType === 'xml') {
        validationResult = validateXML(content)
      } else {
        return
      }

      setResult(validationResult)
    } catch (error) {
      setResult({
        valid: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      })
    } finally {
      setLoading(false)
    }
  }, [content, formatType])

  return (
    <Box className="w-full">
      <Box className="mb-3 flex w-full justify-center gap-4 flex-wrap">
        <Button
          variant="contained"
          size="large"
          onClick={() => startTransition(() => handleValidate())}
          disabled={loading || !content.trim()}
          className="smooth-transition"
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
            py: 1.25,
            px: 4,
            borderRadius: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%)',
              boxShadow: '0 6px 24px rgba(124, 58, 237, 0.5)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 12px rgba(124, 58, 237, 0.4)',
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
              boxShadow: 'none',
            },
          }}
          disableElevation
        >
          {loading ? 'Validating...' : 'Validate'}
        </Button>
      </Box>
      <Paper
        elevation={0}
        className="glass-card dark:glass-card-dark p-4 smooth-transition"
      >
        <FileDropZone
          onFileDrop={(file) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const fileContent = e.target?.result as string
              handleContentEdit(fileContent)
            }
            reader.readAsText(file)
          }}
          side="left"
          formatType={formatType}
          onFileInfoChange={(info) => setFileInfo(info)}
        >
          <CodeEditor
            value={content}
            onChange={handleContentEdit}
            formatType={formatType}
            label={formatType.toUpperCase()}
            placeholder={`Paste your ${formatType.toUpperCase()} here...`}
          />
        </FileDropZone>
      </Paper>

      {result && content.trim() && (
        <Box ref={resultsRef} className="mt-6 smooth-transition">
          {result.valid ? (
            <Alert
              severity="success"
              icon={<CheckCircleIcon />}
              className="glass-card dark:glass-card-dark smooth-transition"
              sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(168, 85, 247, 0.2)',
                '&:hover': {
                  boxShadow: '0 6px 24px rgba(168, 85, 247, 0.3)',
                },
              }}
            >
              <AlertTitle className="font-bold">Valid {formatType.toUpperCase()}</AlertTitle>
              Your {formatType.toUpperCase()} is well-formed and valid.
            </Alert>
          ) : (
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              className="glass-card dark:glass-card-dark smooth-transition"
              sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(244, 67, 54, 0.2)',
                '&:hover': {
                  boxShadow: '0 6px 24px rgba(244, 67, 54, 0.3)',
                },
              }}
            >
              <AlertTitle className="font-bold">Invalid {formatType.toUpperCase()}</AlertTitle>
              {result.error?.message || 'Validation failed'}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  )
}
