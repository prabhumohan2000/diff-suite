'use client'

import { Button, ButtonProps, CircularProgress } from '@mui/material'

interface ActionButtonProps extends ButtonProps {
  loading?: boolean
}

export default function ActionButton({
  loading,
  children,
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
      {children}
    </Button>
  )
}

