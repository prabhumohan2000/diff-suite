'use client'

import React from 'react'
import { IconButton, Tooltip, IconButtonProps, alpha } from '@mui/material'

interface ActionButtonProps extends IconButtonProps {
  title: string
  active?: boolean
}

export default function ActionButton({ title, active, sx, children, ...props }: ActionButtonProps) {
  return (
    <Tooltip title={title} arrow>
      <IconButton
        {...props}
        sx={[
          (theme) => ({
            borderRadius: '12px',
            border: '1px solid',
            borderColor: active ? '#7c3aed' : 'rgba(124, 58, 237, 0.15)',
            background: active
              ? 'rgba(124, 58, 237, 0.1)'
              : 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px)',
            color: active ? '#7c3aed' : 'text.secondary',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            p: 1.25,
            boxShadow: active
              ? '0 4px 12px rgba(124, 58, 237, 0.25)'
              : '0 2px 8px rgba(124, 58, 237, 0.08)',
            '&:hover': {
              background: active
                ? 'rgba(124, 58, 237, 0.15)'
                : 'rgba(255, 255, 255, 0.9)',
              borderColor: active ? '#7c3aed' : 'rgba(124, 58, 237, 0.3)',
              transform: 'translateY(-2px)',
              boxShadow: active
                ? '0 6px 20px rgba(124, 58, 237, 0.35)'
                : '0 4px 16px rgba(124, 58, 237, 0.2)',
              color: active ? '#7c3aed' : 'text.primary',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: active
                ? '0 2px 8px rgba(124, 58, 237, 0.25)'
                : '0 1px 4px rgba(124, 58, 237, 0.15)',
            },
            ...(theme.palette.mode === 'dark' && {
              borderColor: active ? '#7c3aed' : 'rgba(124, 58, 237, 0.2)',
              background: active
                ? 'rgba(124, 58, 237, 0.2)'
                : 'rgba(163, 161, 161, 0.6)',
              color: active ? '#a78bfa' : '#000000',
              boxShadow: active
                ? '0 4px 12px rgba(124, 58, 237, 0.3)'
                : '0 2px 8px rgba(124, 58, 237, 0.12)',
              '&:hover': {
                background: active
                  ? 'rgba(124, 58, 237, 0.25)'
                  : 'rgba(196, 191, 191, 0.7)',
                borderColor: active ? '#a78bfa' : 'rgba(124, 58, 237, 0.35)',
                color: active ? '#c4b5fd' : '#000000',
                boxShadow: active
                  ? '0 6px 20px rgba(124, 58, 237, 0.4)'
                  : '0 4px 16px rgba(124, 58, 237, 0.25)',
              },
            }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}
