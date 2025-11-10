/*
 * LargeJsonLoader
 * ----------------
 * High-level component that demonstrates loading, parsing and diffing very
 * large JSON files smoothly. It keeps only canonical JSON instances in refs
 * and renders visible lines via react-window for performance.
 */

'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Grid, Paper, Stack, Typography, Chip, Alert } from '@mui/material'
import PrettyJsonView from '@/components/PrettyJsonView'
import { useJsonWorker } from '@/hooks/useJsonWorker'

type Side = 'left' | 'right'

export default function LargeJsonLoader() {
  // Canonical parsed objects live in refs to avoid React state cloning
  const leftJsonRef = useRef<any | null>(null)
  const rightJsonRef = useRef<any | null>(null)

  // Small state for filenames + parse errors only
  const [leftFileName, setLeftFileName] = useState<string>('')
  const [rightFileName, setRightFileName] = useState<string>('')
  const [leftError, setLeftError] = useState<string | null>(null)
  const [rightError, setRightError] = useState<string | null>(null)

  const [diffSummary, setDiffSummary] = useState<null | { added: number; removed: number; modified: number }>(null)
  const [differences, setDifferences] = useState<Array<{ type: string; path: string }> | null>(null)

  const { parseJson, diffJson, isBusy, progressText } = useJsonWorker()

  // Debounced progress text is managed inside the hook already; we only expose it.

  const readFileStreaming = useCallback(async (file: File, onProgress?: (done: number, total: number) => void): Promise<string> => {
    // Use Web Streams API if available for progressive read; fall back to FileReader
    const total = file.size
    if ((file as any).stream && 'TextDecoder' in self) {
      const decoder = new TextDecoder('utf-8')
      let result = ''
      let loaded = 0
      // @ts-ignore
      for await (const chunk of (file as any).stream()) {
        let textChunk = ''
        if (typeof chunk === 'string') {
          textChunk = chunk
          loaded += textChunk.length
        } else {
          // Ensure we pass a proper BufferSource (Uint8Array) to TextDecoder
          const uint8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer)
          textChunk = decoder.decode(uint8, { stream: true })
          loaded += (uint8 as any).byteLength ?? textChunk.length
        }
        result += textChunk
        onProgress?.(loaded, total)
      }
      return result
    }
    // Fallback
    const reader = new FileReader()
    const text: string = await new Promise((resolve, reject) => {
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsText(file)
    })
    onProgress?.(total, total)
    return text
  }, [])

  const handleFile = useCallback(async (side: Side, file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      const msg = 'Please select a .json file'
      side === 'left' ? setLeftError(msg) : setRightError(msg)
      return
    }

    side === 'left' ? setLeftFileName(file.name) : setRightFileName(file.name)
    side === 'left' ? setLeftError(null) : setRightError(null)

    const text = await readFileStreaming(file)
    const res = await parseJson(text)
    // Drop raw text to free memory ASAP
    ;(text as any) = null

    if (!res.ok) {
      const errStr = `${res.error.message}${res.error.line ? ` (line ${res.error.line}, col ${res.error.column})` : ''}`
      side === 'left' ? setLeftError(errStr) : setRightError(errStr)
      side === 'left' ? (leftJsonRef.current = null) : (rightJsonRef.current = null)
      return
    }
    if (side === 'left') leftJsonRef.current = res.json
    else rightJsonRef.current = res.json
  }, [parseJson, readFileStreaming])

  const onInputChange = useCallback((side: Side, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(side, file)
    e.currentTarget.value = ''
  }, [handleFile])

  const onDrop = useCallback((side: Side, e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(side, file)
  }, [handleFile])

  const onDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleCompare = useCallback(async () => {
    if (!leftJsonRef.current || !rightJsonRef.current) return
    const res = await diffJson(leftJsonRef.current, rightJsonRef.current, { maxDiffs: 2000 })
    setDiffSummary(res.summary)
    setDifferences(res.differences)
  }, [diffJson])

  const reset = useCallback(() => {
    leftJsonRef.current = null
    rightJsonRef.current = null
    setLeftFileName('')
    setRightFileName('')
    setLeftError(null)
    setRightError(null)
    setDiffSummary(null)
    setDifferences(null)
  }, [])

  const DropZone = ({ side }: { side: Side }) => (
    <Paper
      elevation={0}
      onDrop={(e) => onDrop(side, e)}
      onDragOver={onDragOver}
      className="glass-card dark:glass-card-dark p-4 text-center cursor-pointer"
    >
      <input type="file" accept=".json" onChange={(e) => onInputChange(side, e)} />
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.75 }}>
        Drag & drop or click to choose a JSON file
      </Typography>
    </Paper>
  )

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        Large JSON Loader (Worker + Virtualized)
      </Typography>

      {isBusy && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">{progressText || 'Working…'}</Typography>
        </Stack>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <DropZone side="left" />
          {leftFileName && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>{leftFileName}</Typography>
          )}
          {leftError && (
            <Alert severity="error" sx={{ mt: 1 }}>{leftError}</Alert>
          )}
          {leftJsonRef.current && (
            <PrettyJsonView json={leftJsonRef.current} className="mt-2" />
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <DropZone side="right" />
          {rightFileName && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>{rightFileName}</Typography>
          )}
          {rightError && (
            <Alert severity="error" sx={{ mt: 1 }}>{rightError}</Alert>
          )}
          {rightJsonRef.current && (
            <PrettyJsonView json={rightJsonRef.current} className="mt-2" />
          )}
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="contained" disabled={!leftJsonRef.current || !rightJsonRef.current || isBusy} onClick={handleCompare}>
          Compare
        </Button>
        <Button variant="outlined" onClick={reset}>Reset</Button>
      </Stack>

      {diffSummary && (
        <Paper elevation={0} className="glass-card dark:glass-card-dark p-3 mt-3">
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip color="success" variant="outlined" label={`Added: ${diffSummary.added}`} />
            <Chip color="error" variant="outlined" label={`Removed: ${diffSummary.removed}`} />
            <Chip color="warning" variant="outlined" label={`Modified: ${diffSummary.modified}`} />
          </Stack>
        </Paper>
      )}

      {differences && differences.length > 0 && (
        <Paper elevation={0} className="glass-card dark:glass-card-dark p-3 mt-2">
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Sample Differences (capped)</Typography>
          {differences.slice(0, 200).map((d, i) => (
            <Typography key={i} variant="body2">{d.type.toUpperCase()}: {d.path}</Typography>
          ))}
        </Paper>
      )}
    </Box>
  )
}
