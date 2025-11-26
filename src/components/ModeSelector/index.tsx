'use client'

import React, { memo, useCallback, startTransition } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'
import DataObjectIcon from '@mui/icons-material/DataObject'
import CodeIcon from '@mui/icons-material/Code'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import SegmentedControl from '@/components/SegmentedControl'
import { FormatType, ActionType } from '@/types'

interface ModeSelectorProps {
  formatType: FormatType
  actionType: ActionType
  onFormatChange: (format: FormatType) => void
  onActionChange: (action: ActionType) => void
}

function ModeSelector({
  formatType,
  actionType,
  onFormatChange,
  onActionChange,
}: ModeSelectorProps) {
  const handleFormat = useCallback((_: unknown, value: FormatType | null) => {
    if (!value || value === formatType) return
    startTransition(() => onFormatChange(value))
  }, [onFormatChange, formatType])

  const handleAction = useCallback((_: unknown, value: ActionType | null) => {
    if (!value || value === actionType) return
    startTransition(() => onActionChange(value))
  }, [onActionChange, actionType])

  return (
    <Paper
      elevation={0}
      className="glass-card dark:glass-card-dark smooth-transition"
      sx={{
        p: { xs: 2, sm: 3 },
        mb: 4,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(249, 250, 251, 0.8) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        borderRadius: '20px',
        '.dark &': {
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.8) 0%, rgba(20, 20, 20, 0.8) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 6 }} alignItems="center">
        <Box className="w-full md:flex-1">
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1.5,
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'text.secondary',
              opacity: 0.8,
              ml: 1
            }}
          >
            Format
          </Typography>
          <SegmentedControl
            value={formatType}
            onChange={(v: any) => handleFormat(null, v)}
            options={[
              { value: 'json', label: 'JSON', icon: <DataObjectIcon fontSize="inherit" /> },
              { value: 'xml', label: 'XML', icon: <CodeIcon fontSize="inherit" /> },
              { value: 'text', label: 'Text', icon: <DescriptionIcon fontSize="inherit" /> },
            ]}
          />
        </Box>

        {/* Divider for desktop */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: '1px',
            height: '40px',
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.1), transparent)',
            '.dark &': {
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)',
            }
          }}
        />

        <Box className="w-full md:flex-1">
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1.5,
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'text.secondary',
              opacity: 0.8,
              ml: 1
            }}
          >
            Action
          </Typography>
          <SegmentedControl
            value={actionType}
            onChange={(v: any) => handleAction(null, v)}
            options={[
              {
                value: 'validate',
                label: 'Validate',
                icon: <CheckCircleOutlineIcon fontSize="inherit" />,
                disabled: formatType === 'text'
              },
              {
                value: 'compare',
                label: 'Compare',
                icon: <CompareArrowsIcon fontSize="inherit" />
              },
            ]}
          />
        </Box>
      </Stack>
    </Paper>
  )
}

export default memo(ModeSelector)
