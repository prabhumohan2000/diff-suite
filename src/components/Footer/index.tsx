'use client'

import { Box, Container, Typography, Stack, Link } from '@mui/material'

export default function Footer() {
  return (
    <Box
      component="footer"
      className="mt-auto py-6"
      sx={{
        background: 'linear-gradient(90deg, #6b21a8, #a855f7, #ec4899)',
        color: 'white',
        boxShadow: '0 -4px 20px rgba(168, 85, 247, 0.3)',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
          className="flex-col sm:flex-row"
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'white',
              opacity: 0.9,
            }}
          >
            © {new Date().getFullYear()} Diff Suite v1.0.0
          </Typography>
          <Stack direction="row" spacing={3} className="flex-row gap-6">
            <Link
              href="#"
              sx={{
                color: 'white',
                opacity: 0.9,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                  color: 'white',
                },
              }}
            >
              GitHub
            </Link>
            <Link
              href="#"
              sx={{
                color: 'white',
                opacity: 0.9,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                  color: 'white',
                },
              }}
            >
              Documentation
            </Link>
            <Link
              href="#"
              sx={{
                color: 'white',
                opacity: 0.9,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                  color: 'white',
                },
              }}
            >
              About
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}

