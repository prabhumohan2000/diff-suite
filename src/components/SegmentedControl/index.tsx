'use client'

import React, { memo, useCallback, startTransition } from 'react'
import { Box } from '@mui/material'

export interface SegmentedOption<V extends string> {
  value: V
  label: string
  disabled?: boolean
}

interface SegmentedControlProps<V extends string> {
  value: V
  options: SegmentedOption<V>[]
  onChange: (value: V) => void
}

function SegmentedControlInner<V extends string>({ value, options, onChange }: SegmentedControlProps<V>) {
  const handleClick = useCallback((next: V) => {
    if (next === value) return
    startTransition(() => onChange(next))
  }, [onChange, value])

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        borderRadius: '8px',
        border: '1px solid rgba(124,58,237,0.25)',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          disabled={!!opt.disabled}
          onClick={() => handleClick(opt.value)}
          style={{
            cursor: opt.disabled ? 'not-allowed' : 'pointer',
            padding: '12px 14px',
            border: 'none',
            outline: 'none',
            background: value === opt.value ? '#7c3aed' : 'transparent',
            color: value === opt.value ? '#fff' : '#6b7280',
            fontWeight: 700,
            fontSize: '0.875rem',
            transition: 'background 150ms ease, color 150ms ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </Box>
  )
}

const SegmentedControl = memo(SegmentedControlInner) as typeof SegmentedControlInner
export default SegmentedControl

