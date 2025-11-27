'use client'

import React, { memo, useCallback, startTransition, useMemo } from 'react'
import { Box, Typography } from '@mui/material'

export interface SegmentedOption<V extends string> {
  value: V
  label: string
  icon?: React.ReactNode
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

  const selectedIndex = useMemo(() => options.findIndex(o => o.value === value), [options, value])

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        background: 'rgba(0, 0, 0, 0.04)',
        borderRadius: '12px',
        padding: '4px',
        gap: '4px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        '.dark &': {
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }
      }}
      role="tablist"
    >
      {/* Sliding Pill Background */}
      <Box
        sx={{
          position: 'absolute',
          top: '4px',
          bottom: '4px',
          left: '4px',
          width: `calc((100% - 8px - ${(options.length - 1) * 4}px) / ${options.length})`,
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transform: `translateX(calc(${selectedIndex} * 100% + ${selectedIndex * 4}px))`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
          zIndex: 1,
          '.dark &': {
            background: '#7c3aed',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
          }
        }}
      />

      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          disabled={!!opt.disabled}
          onClick={() => handleClick(opt.value)}
          style={{
            position: 'relative',
            zIndex: 2,
            cursor: opt.disabled ? 'not-allowed' : 'pointer',
            padding: '8px 12px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: value === opt.value ? '#7c3aed' : '#6b7280',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'color 0.2s ease',
            opacity: opt.disabled ? 0.5 : 1,
          }}
          className={value === opt.value ? 'selected-tab' : ''}
        >
          {opt.icon && (
            <span style={{
              display: 'flex',
              fontSize: '1.1rem',
              color: value === opt.value ? 'inherit' : 'currentColor'
            }}>
              {opt.icon}
            </span>
          )}
          <span className="truncate">{opt.label}</span>
        </button>
      ))}
      <style jsx global>{`
        .dark .selected-tab {
          color: #fff !important;
        }
      `}</style>
    </Box>
  )
}

const SegmentedControl = memo(SegmentedControlInner) as typeof SegmentedControlInner
export default SegmentedControl

