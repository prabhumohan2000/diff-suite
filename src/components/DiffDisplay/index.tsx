'use client'

import { Box, Paper, Typography, Grid, Stack, Chip, useTheme } from '@mui/material'
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
      {line.changes.map((change: any, idx: number) => (
        <span
          key={idx}
          style={{
            backgroundColor:
              change.type === 'added'
                ? colors.added
                : change.type === 'removed'
                ? colors.removed
                : 'transparent',
            textDecoration: change.type === 'removed' ? 'line-through' : 'none',
            padding: '0 2px',
            borderRadius: 2,
          }}
        >
          {change.value}
        </span>
      ))}
    </span>
  )
}

export default function DiffDisplay({
  formatType,
  result,
  leftContent,
  rightContent,
}: DiffDisplayProps) {
  if (!leftContent.trim() || !rightContent.trim()) {
    return null
  }
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

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

  // For JSON and XML, create line-by-line diff for inline highlighting
  if ((formatType === 'json' || formatType === 'xml') && result.differences && result.differences.length > 0) {
    const lineDiff = createLineDiff(leftContent, rightContent)
    
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
                {lineDiff.leftLines.map((line, index) => {
                  const isDiffLine = result.differences?.some(diff => {
                    const diffPath = diff.path || diff.element || ''
                    return line.content.includes(diffPath) || 
                           (diff.type === 'removed' && line.type === 'removed')
                  })
                  
                  return (
                    <Box
                      key={index}
                      sx={{
                        p: 0.5,
                        backgroundColor:
                          line.type === 'removed'
                            ? colors.removed
                            : isDiffLine && line.type === 'unchanged'
                            ? colors.modified
                            : 'transparent',
                        borderLeft:
                          line.type === 'removed' 
                            ? `3px solid ${colors.removedBorder}` 
                            : isDiffLine && line.type === 'unchanged'
                            ? `3px solid ${colors.modifiedBorder}`
                            : 'none',
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
                        {line.content}
                      </Typography>
                    </Box>
                  )
                })}
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
                {lineDiff.rightLines.map((line, index) => {
                  const isDiffLine = result.differences?.some(diff => {
                    const diffPath = diff.path || diff.element || ''
                    return line.content.includes(diffPath) || 
                           (diff.type === 'added' && line.type === 'added')
                  })
                  
                  return (
                    <Box
                      key={index}
                      sx={{
                        p: 0.5,
                        backgroundColor:
                          line.type === 'added'
                            ? colors.added
                            : isDiffLine && line.type === 'unchanged'
                            ? colors.modified
                            : 'transparent',
                        borderLeft:
                          line.type === 'added' 
                            ? `3px solid ${colors.addedBorder}` 
                            : isDiffLine && line.type === 'unchanged'
                            ? `3px solid ${colors.modifiedBorder}`
                            : 'none',
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
                        {line.content}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            </Paper>
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

