'use client'

import React, { memo, useCallback, startTransition } from 'react'
import { Box, ToggleButtonGroup, ToggleButton, Typography, Paper, Stack } from '@mui/material'
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
      className="glass-card dark:glass-card-dark p-4 mb-6 smooth-transition"
      sx={{
        '&:hover': {
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 3 }} sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
        <Box className="w-full sm:flex-1 min-w-0 sm:min-w-[200px]">
          <Typography
            variant="caption"
            className="mb-2 font-semibold text-xs uppercase tracking-wide"
            sx={{ color: 'text.secondary', lineHeight: 1.6 }}
          >
            Format Type
          </Typography>
          <SegmentedControl
            value={formatType}
            onChange={(v: any) => handleFormat(null, v)}
            options={[
              { value: 'json', label: 'JSON' },
              { value: 'xml', label: 'XML' },
              { value: 'text', label: 'Text' },
            ]}
          />
        </Box>

      <Box className="w-full sm:flex-1 min-w-0 sm:min-w-[200px] mt-0 sm:mt-0">
          <Typography
            variant="caption"
            className="mb-2 font-semibold text-xs uppercase tracking-wide"
            sx={{ color: 'text.secondary', lineHeight: 1.6 }}
          >
            Action Type
          </Typography>
          <SegmentedControl
            value={actionType}
            onChange={(v: any) => handleAction(null, v)}
            options={[
              { value: 'validate', label: 'Validate', disabled: formatType === 'text' },
              { value: 'compare', label: 'Compare' },
            ]}
          />
        </Box>
      </Stack>
    </Paper>
  )
}

export default memo(ModeSelector)
