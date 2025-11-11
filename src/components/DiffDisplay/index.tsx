'use client'

import { Box, Paper, Typography, Grid, Stack, Chip, useTheme } from '@mui/material'
import { FixedSizeList as List, VariableSizeList as VList, ListChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FormatType, ComparisonResult } from '@/types'
import { createLineDiff } from '@/utils/diffUtils/lineDiff'

interface DiffDisplayProps {
  formatType: FormatType
  result: ComparisonResult
  leftContent: string
  rightContent: string
}

function renderLineWithChanges(line: any, colors: any) {
  if (!line.changes || line.changes.length === 0) {
    return <span>{line.content}</span>
  }

  return (
    <span>
      {line.changes.map((change: any, idx: number) => {
        const isChanged = change.type === 'added' || change.type === 'removed'
        return (
          <span
            key={idx}
            style={{
              backgroundColor: isChanged
                ? (change.type === 'added' ? colors.added : colors.removed)
                : 'transparent',
              // No extra padding to avoid artificial spacing between characters
              padding: isChanged ? 0 : undefined,
              borderRadius: isChanged ? 2 : undefined,
              textDecoration: 'none',
            }}
          >
            {change.value}
          </span>
        )
      })}
    </span>
  )
}

export default function DiffDisplay({
  formatType,
  result,
  leftContent,
  rightContent,
}: DiffDisplayProps) {
  // Call hooks unconditionally at top-level to satisfy React rules of hooks
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Early return when inputs are empty - after hooks have been called
  if (!leftContent.trim() || !rightContent.trim()) {
    return null
  }

  // Color scheme based on theme
  const colors = {
    added: isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.15)',
    removed: isDark ? 'rgba(236, 72, 153, 0.25)' : 'rgba(236, 72, 153, 0.15)',
    modified: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)',
    addedBorder: isDark ? '#a855f7' : '#a855f7',
    removedBorder: isDark ? '#ec4899' : '#ec4899',
    modifiedBorder: isDark ? '#8b5cf6' : '#8b5cf6',
    addedText: isDark ? '#c084fc' : '#7c3aed',
    removedText: isDark ? '#f472b6' : '#db2777',
  }

  // For JSON and XML, virtualized side-by-side view
  if ((formatType === 'json' || formatType === 'xml') && result.differences && result.differences.length > 0) {
    const hasPrecomputed = (result as any).leftLines && (result as any).rightLines
    const lineDiff = hasPrecomputed
      ? { leftLines: (result as any).leftLines as any[], rightLines: (result as any).rightLines as any[] }
      : createLineDiff(leftContent, rightContent)
    
    return (
      <Box>
        <Paper 
          elevation={0}
          className="glass-card dark:glass-card-dark p-3 mb-4 smooth-transition"
        >
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label="Added"
              size="small"
              sx={{ 
                backgroundColor: colors.added, 
                border: `1px solid ${colors.addedBorder}`,
                color: colors.addedText,
                fontWeight: 600,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            />
            <Chip
              label="Removed"
              size="small"
              sx={{ 
                backgroundColor: colors.removed, 
                border: `1px solid ${colors.removedBorder}`,
                color: colors.removedText,
                fontWeight: 600,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            />
            <Chip
              label="Modified"
              size="small"
              sx={{ 
                backgroundColor: colors.modified, 
                border: `1px solid ${colors.modifiedBorder}`,
                fontWeight: 600,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            />
          </Stack>
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <VirtualPaper title="">
              <VirtualList lines={lineDiff.leftLines} colors={colors} inlineChanges={false} />
            </VirtualPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <VirtualPaper title="">
              <VirtualList lines={lineDiff.rightLines} colors={colors} inlineChanges={false} />
            </VirtualPaper>
          </Grid>
        </Grid>
      </Box>
    )
  }

if (formatType === 'text' && result.leftLines && result.rightLines) {
    return (
      <Box>
        <Paper elevation={1} sx={{ p: 1, mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label="Added"
              size="small"
              sx={{ 
                backgroundColor: colors.added, 
                border: `1px solid ${colors.addedBorder}`,
                color: colors.addedText,
              }}
            />
            <Chip
              label="Removed"
              size="small"
              sx={{ 
                backgroundColor: colors.removed, 
                border: `1px solid ${colors.removedBorder}`,
                color: colors.removedText,
              }}
            />
            <Chip
              label="Modified"
              size="small"
              sx={{ 
                backgroundColor: colors.modified, 
                border: `1px solid ${colors.modifiedBorder}`,
              }}
            />
          </Stack>
        </Paper>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              className="glass-card dark:glass-card-dark smooth-transition"
              sx={{
                p: 3,
                maxHeight: '500px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                '&:hover': {
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Left (Original)
              </Typography>
              <Box>
                {result.leftLines.map((line, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 0.5,
                      backgroundColor:
                        line.type === 'removed'
                          ? colors.removed
                          : line.type === 'unchanged'
                          ? 'transparent'
                          : colors.modified,
                      borderLeft:
                        line.type === 'removed' ? `3px solid ${colors.removedBorder}` : 'none',
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color: 'text.secondary',
                        mr: 1,
                        fontFamily: 'monospace',
                        minWidth: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {line.lineNumber}
                    </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {renderLineWithChanges(line, colors)}
                      </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              className="glass-card dark:glass-card-dark smooth-transition"
              sx={{
                p: 3,
                maxHeight: '500px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                '&:hover': {
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Right (Modified)
              </Typography>
              <Box>
                {result.rightLines.map((line, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 0.5,
                      backgroundColor:
                        line.type === 'added'
                          ? colors.added
                          : line.type === 'unchanged'
                          ? 'transparent'
                          : colors.modified,
                      borderLeft:
                        line.type === 'added' ? `3px solid ${colors.addedBorder}` : 'none',
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color: 'text.secondary',
                        mr: 1,
                        fontFamily: 'monospace',
                        minWidth: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {line.lineNumber}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {renderLineWithChanges(line, colors)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    )
  }

  // Fallback: show differences in a list if line diff not available
  if (result.differences && result.differences.length > 0) {
    return (
      <Paper 
        elevation={0}
        className="glass-card dark:glass-card-dark smooth-transition"
        sx={{ 
          p: 3, 
          maxHeight: '500px', 
          overflow: 'auto',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Differences
        </Typography>
        <Box>
          {result.differences.map((diff, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                mb: 1,
                borderRadius: 1,
                backgroundColor:
                  diff.type === 'added'
                    ? colors.added
                    : diff.type === 'removed'
                    ? colors.removed
                    : colors.modified,
                borderLeft: `3px solid ${
                  diff.type === 'added'
                    ? colors.addedBorder
                    : diff.type === 'removed'
                    ? colors.removedBorder
                    : colors.modifiedBorder
                }`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {diff.type.toUpperCase()}: {diff.path || diff.element}
              </Typography>
              {diff.oldValue !== undefined && (
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                  <strong>Old:</strong> {String(diff.oldValue)}
                </Typography>
              )}
              {diff.newValue !== undefined && (
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  <strong>New:</strong> {String(diff.newValue)}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Paper>
    )
  }

  return null
}

// Virtualized paper wrapper and list; tuned to match editor font sizing
function VirtualPaper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper elevation={0} className="glass-card dark:glass-card-dark" sx={{ p: 1.5 }}>
      {title ? (
        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{title}</Typography>
      ) : null}
      <Box sx={{ height: 460, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '0.875rem', lineHeight: 1.5 }}>
        {children}
      </Box>
    </Paper>
  )
}

function VirtualList({
  lines,
  colors,
  inlineChanges,
}: {
  lines: Array<{ lineNumber: number; type: 'added' | 'removed' | 'unchanged'; content: string; changes?: any[] }>
  colors: any
  inlineChanges: boolean
}) {
  const ROW_HEIGHT = 20
  const Row = ({ index, style }: ListChildComponentProps) => {
    const line = lines[index]
    const bg = inlineChanges ? 'transparent' : (line.type === 'added' ? colors.added : line.type === 'removed' ? colors.removed : 'transparent')
    const borderLeft = inlineChanges ? 'none' : (line.type === 'added' ? `2px solid ${colors.addedBorder}` : line.type === 'removed' ? `2px solid ${colors.removedBorder}` : 'none')
    return (
      <Box style={style as React.CSSProperties} sx={{ px: 0.5, backgroundColor: bg, borderLeft, display: 'flex', alignItems: 'flex-start' }}>
        <Box component="span" sx={{ color: 'text.secondary', pr: 1, width: 36, textAlign: 'right', userSelect: 'none' }}>
          {line.lineNumber}
        </Box>
        <Box component="span" sx={{ whiteSpace: inlineChanges ? 'pre-wrap' : 'pre', wordBreak: inlineChanges ? 'break-word' : 'normal', overflow: inlineChanges ? 'visible' : 'hidden', textOverflow: inlineChanges ? 'unset' : 'clip', flex: 1 }}>
          {inlineChanges ? renderLineWithChanges(line as any, colors) : line.content}
        </Box>
      </Box>
    )
  }

  return (
    <AutoSizer>
      {({ height, width }) => {
        if (!inlineChanges) {
          return (
            <List height={height} width={width} itemCount={lines.length} itemSize={ROW_HEIGHT} overscanCount={6}>
              {Row}
            </List>
          )
        }
        // Variable-size list for wrapped text lines
        const gutter = 44
        const avail = Math.max(80, width - gutter)
        // Match editor metrics (monospace, 0.875rem ~ 14px). Typical char width ≈ 8px
        const approxCharWidth = 7
        const lineHeight = 20 // slightly larger to respect 1.5 line-height and padding
        const getItemSize = (index: number) => {
          const l: any = lines[index]
          const len = l?.changes
            ? l.changes.reduce((a: number, c: any) => a + String(c?.value ?? '').length, 0)
            : String(l?.content ?? '').length
          const charsPerRow = Math.max(10, Math.floor(avail / approxCharWidth))
          const rows = Math.max(1, Math.ceil(len / charsPerRow))
          // Clamp extremely long wrapped rows to avoid huge whitespace
          return Math.min(rows, 20) * lineHeight + 6
        }
        return (
          <VList height={height} width={width} itemCount={lines.length} itemSize={getItemSize as any} overscanCount={4} estimatedItemSize={lineHeight + 6}>
            {Row}
          </VList>
        )
      }}
    </AutoSizer>
  )
}


