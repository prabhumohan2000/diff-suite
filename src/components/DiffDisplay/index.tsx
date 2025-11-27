'use client'

import { Box, Paper, Typography, Grid, useTheme } from '@mui/material'
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
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{line.content}</span>
  }

  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {line.changes.map((change: any, idx: number) => {
        const isChanged = change.type === 'added' || change.type === 'removed'
        return (
          <span
            key={idx}
            style={{
              backgroundColor: isChanged
                ? (change.type === 'added' ? colors.added : colors.removed)
                : 'transparent',
              padding: isChanged ? 0 : undefined,
              borderRadius: isChanged ? 2 : undefined,
              textDecoration: 'none',
              whiteSpace: 'pre-wrap',
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
    // Use distinct hues so Added/Removed/Modified stand out clearly.
    // Added = green, Removed = red, Modified = soft purple.
    // Slightly higher alpha for better contrast.
    added: isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(22, 163, 74, 0.22)',
    removed: isDark ? 'rgba(239, 68, 68, 0.34)' : 'rgba(248, 113, 113, 0.24)',
    modified: isDark ? 'rgba(168, 85, 247, 0.32)' : 'rgba(168, 85, 247, 0.22)',
    addedBorder: isDark ? '#22c55e' : '#16a34a',
    removedBorder: isDark ? '#ef4444' : '#dc2626',
    modifiedBorder: isDark ? '#a855f7' : '#a855f7',
    addedText: isDark ? '#6ee7b7' : '#166534',
    removedText: isDark ? '#fecaca' : '#7f1d1d',
    modifiedText: isDark ? '#ede9fe' : '#6d28d9',
  }

  // For JSON and XML, virtualized side-by-side view (unchanged)
  if ((formatType === 'json' || formatType === 'xml') && result.differences && result.differences.length > 0) {
    const hasPrecomputed = (result as any).leftLines && (result as any).rightLines
    const lineDiff = hasPrecomputed
      ? { leftLines: (result as any).leftLines as any[], rightLines: (result as any).rightLines as any[] }
      : createLineDiff(leftContent, rightContent)

    return (
      <Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <VirtualPaper title="Original text">
              <VirtualList lines={lineDiff.leftLines} colors={colors} inlineChanges={false} />
            </VirtualPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <VirtualPaper title="Changed text">
              <VirtualList lines={lineDiff.rightLines} colors={colors} inlineChanges={false} />
            </VirtualPaper>
          </Grid>
        </Grid>
      </Box>
    )
  }

  // ✅ TEXT compare – only this block has been updated
  if (formatType === 'text' && result.leftLines && result.rightLines) {
    return (
      <Box>
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
              <Box sx={{ overflowX: 'hidden' }}>
                {result.leftLines.map((line, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 0.5,
                      backgroundColor:
                        line.type === 'removed'
                          ? colors.removed
                          : line.type === 'added'
                          ? colors.added
                          : line.type === 'modified'
                          // For text compare, treat modified lines on the
                          // left like a soft removal background so the two
                          // sides feel distinct.
                          ? colors.removed
                          : 'transparent',
                      borderLeft:
                        line.type === 'removed'
                          ? `3px solid ${colors.removedBorder}`
                          : line.type === 'added'
                          ? `3px solid ${colors.addedBorder}`
                          : line.type === 'modified'
                          ? `3px solid ${colors.modifiedBorder}`
                          : 'none',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
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
                        userSelect: 'none',
                      }}
                    >
                      {line.lineNumber}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
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
              <Box sx={{ overflowX: 'hidden' }}>
                {result.rightLines.map((line, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 0.5,
                      backgroundColor:
                        line.type === 'added'
                          ? colors.added
                          : line.type === 'removed'
                          ? colors.removed
                          : line.type === 'modified'
                          // On the right, modified lines get the added
                          // background to contrast with the left side.
                          ? colors.added
                          : 'transparent',
                      borderLeft:
                        line.type === 'added'
                          ? `3px solid ${colors.addedBorder}`
                          : line.type === 'removed'
                          ? `3px solid ${colors.removedBorder}`
                          : line.type === 'modified'
                          ? `3px solid ${colors.modifiedBorder}`
                          : 'none',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
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
                        userSelect: 'none',
                      }}
                    >
                      {line.lineNumber}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
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

  // Fallback: show differences in a list if line diff not available (unchanged)
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
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', mb: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  <strong>Old:</strong> {String(diff.oldValue)}
                </Typography>
              )}
              {diff.newValue !== undefined && (
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
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

// Virtualized paper wrapper and list; tuned to match editor font sizing (unchanged)
function VirtualPaper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper elevation={0} className="glass-card dark:glass-card-dark" sx={{ p: 1.5 }}>
      {title ? (
        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
          {title}
        </Typography>
      ) : null}
      <Box
        sx={{
          height: 460,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}
      >
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
    const bg = inlineChanges
      ? 'transparent'
      : (line.type === 'added' ? colors.added : line.type === 'removed' ? colors.removed : 'transparent')
    const borderLeft = inlineChanges
      ? 'none'
      : (line.type === 'added'
          ? `2px solid ${colors.addedBorder}`
          : line.type === 'removed'
          ? `2px solid ${colors.removedBorder}`
          : 'none')

    const contentNode = inlineChanges
      ? renderLineWithChanges(line as any, colors)
      : (
        <span
          style={{
            backgroundColor: bg,
            whiteSpace: 'pre',
          }}
        >
          {line.content}
        </span>
      )

    return (
      <Box
        style={style}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{
            px: 0.5,
            borderLeft,
            display: 'flex',
            alignItems: 'flex-start',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            whiteSpace: 'pre',
            minWidth: '100%',
            width: 'max-content',
          }}
        >
          <Box
            component="span"
            sx={{
              color: 'text.secondary',
              pr: 1,
              width: 36,
              textAlign: 'right',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {line.lineNumber}
          </Box>
          <Box
            component="span"
            sx={{
              whiteSpace: 'pre',
              flex: 1,
            }}
          >
            {contentNode}
          </Box>
        </Box>
      </Box>
    )
  }

  const InnerElement = ({ style, ...rest }: any) => (
    <div
      style={{
        ...style,
        width: 'max-content',
        minWidth: '100%',
      }}
      {...rest}
    />
  )

  return (
    <AutoSizer>
      {({ height, width }) => {
        return (
          <List
            height={height}
            width={width}
            itemCount={lines.length}
            itemSize={ROW_HEIGHT}
            overscanCount={10}
            innerElementType={InnerElement}
            style={{ overflowX: 'auto', overflowY: 'auto' }}
          >
            {Row}
          </List>
        )
      }}
    </AutoSizer>
  )
}
