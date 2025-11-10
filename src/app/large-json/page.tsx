"use client"

import React from 'react'
import { Container, Box } from '@mui/material'
import LargeJsonLoader from '@/components/LargeJsonLoader'

export default function LargeJsonPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <LargeJsonLoader />
      </Container>
    </Box>
  )
}

