'use client'

import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Paper,
  Stack,
} from '@mui/material'
import { FormatType, ActionType } from '@/types'

interface ModeSelectorProps {
  formatType: FormatType
  actionType: ActionType
  onFormatChange: (format: FormatType) => void
  onActionChange: (action: ActionType) => void
}

export default function ModeSelector({
  formatType,
  actionType,
  onFormatChange,
  onActionChange,
}: ModeSelectorProps) {
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
          <ToggleButtonGroup
            value={formatType}
            exclusive
            onChange={(_, value) => value && onFormatChange(value)}
            aria-label="format type"
            fullWidth
            size="small"
            className="w-full"
            sx={{
              '& .MuiToggleButton-root': {
                flex: 1,
                py: 1,
                px: 2,
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#6b7280',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(124, 58, 237, 0.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)',
                },
                '&.Mui-selected': {
                  background: '#7c3aed',
                  color: 'white',
                  borderColor: 'transparent',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                  '&:hover': {
                    background: '#8b5cf6',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(124, 58, 237, 0.4)',
                  },
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            <ToggleButton value="json" aria-label="json" className="flex-1">
              JSON
            </ToggleButton>
            <ToggleButton value="xml" aria-label="xml" className="flex-1">
              XML
            </ToggleButton>
            <ToggleButton value="text" aria-label="text" className="flex-1">
              Text
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

      <Box className="w-full sm:flex-1 min-w-0 sm:min-w-[200px] mt-0 sm:mt-0">
          <Typography
            variant="caption"
            className="mb-2 font-semibold text-xs uppercase tracking-wide"
            sx={{ color: 'text.secondary', lineHeight: 1.6 }}
          >
            Action Type
          </Typography>
          <ToggleButtonGroup
            value={actionType}
            exclusive
            onChange={(_, value) => value && onActionChange(value)}
            aria-label="action type"
            fullWidth
            size="small"
            className="w-full"
            sx={{
              '& .MuiToggleButton-root': {
                flex: 1,
                py: 1,
                px: 2,
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                color: '#48494dff',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(124, 58, 237, 0.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)',
                },
                '&.Mui-selected': {
                  background: '#7c3aed',
                  color: 'white',
                  borderColor: 'transparent',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                  '&:hover': {
                    background: '#8b5cf6',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(124, 58, 237, 0.4)',
                  },
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&.Mui-disabled': {
                  opacity: 0.8,
                },
              },
            }}
          >
            <ToggleButton
              value="validate"
              aria-label="validate"
              className="flex-1"
              disabled={formatType === 'text'}
            >
              Validate
            </ToggleButton>
            <ToggleButton value="compare" aria-label="compare" className="flex-1">
              Compare
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </Paper>
  )
}
