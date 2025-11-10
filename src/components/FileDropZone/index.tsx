'use client'

import React, { useState, useCallback, DragEvent } from 'react'
import { Box, Paper, Typography, useTheme, Snackbar, Alert, CircularProgress } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { FormatType } from '@/types'

interface FileDropZoneProps {
  onFileDrop: (file: File, side: 'left' | 'right') => void
  side: 'left' | 'right'
  formatType: FormatType
  disabled?: boolean
  children: React.ReactNode
}

export default function FileDropZone({
  onFileDrop,
  side,
  formatType,
  disabled = false,
  children,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null)
  const [snackbar, setSnackbar] = useState<{ 
    open: boolean; 
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ 
    open: false, 
    message: '',
    severity: 'error'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const isLargeFile = useCallback((file: File) => {
    return file.size > 500 * 1024 // Consider files over 500KB as large
  }, [])

  const getAcceptedExtensions = useCallback(() => {
    switch (formatType) {
      case 'json':
        return ['.json']
      case 'xml':
        return ['.xml']
      case 'text':
        return ['.txt', '.text']
      default:
        return []
    }
  }, [formatType])

  const isValidFile = useCallback((file: File): boolean => {
    const acceptedExtensions = getAcceptedExtensions()
    const fileName = file.name.toLowerCase()
    return acceptedExtensions.some(ext => fileName.endsWith(ext))
  }, [getAcceptedExtensions])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }, [])

  // Max allowed file size in bytes (2 MB)
  const MAX_FILE_SIZE = 2 * 1024 * 1024

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const processFile = useCallback((file: File) => {
    // Validate file size first
    if (file.size > MAX_FILE_SIZE) {
      setSnackbar({
        open: true,
        message: `File is too large (${formatFileSize(file.size)}). Max allowed size is ${formatFileSize(
          MAX_FILE_SIZE
        )}.`,
        severity: 'error'
      })
      return
    }
    if (isValidFile(file)) {
      setFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'Unknown',
      })

      if (isLargeFile(file)) {
        setIsProcessing(true)
        setSnackbar({
          open: true,
          message: 'Processing large file, please wait...',
          severity: 'info'
        })
      }

      const reader = new FileReader()
      reader.onload = () => {
        onFileDrop(file, side)
        if (isLargeFile(file)) {
          setIsProcessing(false)
          setSnackbar({
            open: true,
            message: 'File processed successfully',
            severity: 'success'
          })
        }
      }
      reader.onerror = () => {
        setIsProcessing(false)
        setSnackbar({
          open: true,
          message: 'Error reading file',
          severity: 'error'
        })
      }
      reader.readAsText(file)
    } else {
      // Show feedback for invalid file types using snackbar
      const typeLabel =
        formatType === 'json'
          ? 'JSON (.json)'
          : formatType === 'xml'
          ? 'XML (.xml)'
          : 'TXT (.txt or .text)'
      setSnackbar({
        open: true,
        message: `Invalid file for ${formatType.toUpperCase()}. Expected ${typeLabel}.`,
        severity: 'error'
      })
    }
  }, [formatFileSize, formatType, isLargeFile, isValidFile, onFileDrop, side, MAX_FILE_SIZE])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const files = event.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile, disabled])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [disabled, processFile])

  return (
    <Box
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full"
    >
      {fileInfo && (
        <Box
          className="mb-3 p-3 rounded-xl glass-card dark:glass-card-dark smooth-transition"
          sx={{
            border: '1px solid rgba(168, 85, 247, 0.3)',
            '&:hover': {
              boxShadow: '0 8px 24px rgba(168, 85, 247, 0.2)',
            },
          }}
        >
          <Typography variant="caption" className="block font-bold text-gray-800 dark:text-gray-200">
            📄 {fileInfo.name}
          </Typography>
          <Typography variant="caption" className="block text-gray-600 dark:text-gray-400 mt-1">
            Size: {fileInfo.size} • Type: {fileInfo.type}
          </Typography>
        </Box>
      )}
      <Box className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          accept={getAcceptedExtensions().join(',')}
          disabled={disabled}
          style={{ display: 'none' }}
          id={`file-input-${side}`}
        />
        <label htmlFor={`file-input-${side}`}>
          {children}
        </label>
        {isDragging && (
          <Paper
            elevation={0}
            className="absolute inset-0 z-[1000] flex flex-col items-center justify-center rounded-xl border-4 border-dashed pointer-events-none glass-card smooth-transition"
            sx={{
              borderColor: '#a855f7',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <CloudUploadIcon 
              className="text-6xl text-primary mb-4" 
            />
            <Typography variant="h6" className="font-semibold text-primary">
              Drop file here
            </Typography>
            <Typography variant="body2" className="mt-2 text-gray-600 dark:text-gray-400">
              {formatType.toUpperCase()} files only
            </Typography>
          </Paper>
        )}
        {isProcessing && (
          <Box
            className="absolute inset-0 z-[1000] flex items-center justify-center rounded-xl glass-card"
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Box className="flex flex-col items-center">
              <CircularProgress size={48} className="mb-3" />
              <Typography variant="body1" className="text-white">
                Processing file...
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: '', severity: 'error' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ open: false, message: '', severity: 'error' })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

