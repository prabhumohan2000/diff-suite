'use client'

import { useState, useCallback, useEffect } from 'react'
import { Box, Button, Paper, Alert, AlertTitle, Accordion, AccordionSummary, AccordionDetails, Typography, Stack, Chip } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import CodeEditor from '@/components/CodeEditor'
import FileDropZone from '@/components/FileDropZone'
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

  // Clear validation result when content is cleared
  useEffect(() => {
    if (!content.trim()) {
      setResult(null)
      setLoading(false)
    }
  }, [content])

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
      <Paper 
        elevation={0}
        className="glass-card dark:glass-card-dark p-4 smooth-transition"
      >
        <FileDropZone
          onFileDrop={(file) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const fileContent = e.target?.result as string
              onContentChange(fileContent)
            }
            reader.readAsText(file)
          }}
          side="left"
          formatType={formatType}
        >
          <CodeEditor
            value={content}
            onChange={onContentChange}
            formatType={formatType}
            label={formatType.toUpperCase()}
            placeholder={`Paste your ${formatType.toUpperCase()} here...`}
          />
        </FileDropZone>
      </Paper>

      <Box className="mt-4 flex gap-4 flex-wrap">
        <Button
          variant="contained"
          onClick={handleValidate}
          disabled={loading || !content.trim()}
          // fullWidth={{ xs: true, sm: false }}
          className="w-full sm:w-auto min-w-[200px] smooth-transition"
          sx={{
            background: '#7c3aed',
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
          {loading ? 'Validating...' : 'Validate'}
        </Button>
      </Box>

      {result && content.trim() && (
        <Box className="mt-6 smooth-transition">
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
              {result.error && (result.error.line || result.error.column) && (
                <Accordion sx={{ mt: 2, borderRadius: '8px', '&:before': { display: 'none' } }}>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      borderRadius: '8px',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      },
                    }}
                  >
                    <Typography variant="body2" className="font-semibold">Error Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1.5}>
                      {result.error.line && (
                        <Chip
                          label={`Line: ${result.error.line}`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      {result.error.column && (
                        <Chip
                          label={`Column: ${result.error.column}`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      {result.error.message && (
                        <Typography variant="body2" className="mt-2">
                          <strong>Message:</strong> {result.error.message}
                        </Typography>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  )
}
