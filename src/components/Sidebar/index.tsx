'use client'

import React from 'react'
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material'
import DataObjectIcon from '@mui/icons-material/DataObject'
import CodeIcon from '@mui/icons-material/Code'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import CloseIcon from '@mui/icons-material/Close'
import DifferenceIcon from '@mui/icons-material/Difference'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { useThemeMode } from '@/components/ThemeProvider'
import { FormatType, ActionType } from '@/types'

const DRAWER_WIDTH = 280

interface SidebarProps {
    mobileOpen: boolean
    onDrawerToggle: () => void
    formatType: FormatType
    actionType: ActionType
    onFormatChange: (format: FormatType) => void
    onActionChange: (action: ActionType) => void
    sidebarVisible?: boolean
    enableStorage?: boolean
    onStorageToggle?: (enabled: boolean) => void
}

export default function Sidebar({
    mobileOpen,
    onDrawerToggle,
    formatType,
    actionType,
    onFormatChange,
    onActionChange,
    sidebarVisible = true,
    enableStorage = true,
    onStorageToggle,
}: SidebarProps) {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const { mode, toggleMode } = useThemeMode()

    const formatOptions = [
        { value: 'json', label: 'JSON', icon: <DataObjectIcon /> },
        { value: 'xml', label: 'XML', icon: <CodeIcon /> },
        { value: 'text', label: 'Text', icon: <DescriptionIcon /> },
    ]

    const actionOptions = [
        { value: 'validate', label: 'Validate', icon: <CheckCircleOutlineIcon />, disabled: formatType === 'text' },
        { value: 'compare', label: 'Compare', icon: <CompareArrowsIcon /> },
    ]

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {isMobile ? (
                <Box
                    sx={{
                        px: 2.5,
                        pt: 2,
                        pb: 1.75,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid',
                        borderColor: theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(15,23,42,0.06)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                                borderRadius: '12px',
                                p: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.35)',
                            }}
                        >
                            <CodeIcon sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                Diff Suite
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.7rem',
                                }}
                            >
                                Choose format and action
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            ) : (
                // Desktop spacer to align with fixed header height
                <Box sx={{ minHeight: { xs: '70px', sm: '88px' } }} />
            )}

            <Box sx={{ p: 3, flex: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: 'text.secondary',
                        mb: 2,
                        display: 'block',
                        pl: 2,
                    }}
                >
                    Format
                </Typography>
                <List sx={{ mb: 4 }}>
                    {formatOptions.map((option) => (
                        <ListItem key={option.value} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                selected={formatType === option.value}
                                onClick={() => onFormatChange(option.value as FormatType)}
                                sx={{
                                    borderRadius: '12px',
                                    py: 1.5,
                                    px: 2,
                                    transition: 'all 0.2s ease',
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                                        borderLeft: '4px solid #7c3aed',
                                        '&:hover': {
                                            background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.08) 100%)',
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: '#7c3aed',
                                        },
                                        '& .MuiListItemText-primary': {
                                            color: '#7c3aed',
                                            fontWeight: 700,
                                        },
                                    },
                                    '&:not(.Mui-selected):hover': {
                                        background: 'rgba(0, 0, 0, 0.04)',
                                        transform: 'translateX(4px)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary', transition: 'color 0.2s' }}>
                                    {option.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={option.label}
                                    primaryTypographyProps={{
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        sx: { transition: 'color 0.2s' }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>

                <Divider sx={{ mb: 4, borderColor: 'rgba(0,0,0,0.06)' }} />

                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: 'text.secondary',
                        mb: 2,
                        display: 'block',
                        pl: 2,
                    }}
                >
                    Action
                </Typography>
                <List>
                    {actionOptions.map((option) => (
                        <ListItem key={option.value} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                selected={actionType === option.value}
                                disabled={option.disabled}
                                onClick={() => onActionChange(option.value as ActionType)}
                                sx={{
                                    borderRadius: '12px',
                                    py: 1.5,
                                    px: 2,
                                    transition: 'all 0.2s ease',
                                    opacity: option.disabled ? 0.5 : 1,
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)',
                                        borderLeft: '4px solid #ec4899',
                                        '&:hover': {
                                            background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.08) 100%)',
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: '#ec4899',
                                        },
                                        '& .MuiListItemText-primary': {
                                            color: '#ec4899',
                                            fontWeight: 700,
                                        },
                                    },
                                    '&:not(.Mui-selected):not(.Mui-disabled):hover': {
                                        background: 'rgba(0, 0, 0, 0.04)',
                                        transform: 'translateX(4px)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                                    {option.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={option.label}
                                    primaryTypographyProps={{
                                        fontSize: '0.95rem',
                                        fontWeight: 600
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Box>
    )

    return (
        <Box
            component="nav"
            sx={{
                width: { xs: 0, md: sidebarVisible ? DRAWER_WIDTH : 0 },
                flexShrink: { md: 0 },
            }}
        >
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: DRAWER_WIDTH,
                        background: (theme) => theme.palette.mode === 'dark'
                            ? theme.palette.background.default
                            : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(12px)',
                        borderRight: '1px solid',
                        borderColor: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0,0,0,0.05)',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: sidebarVisible ? 'block' : 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: DRAWER_WIDTH,
                        background: 'transparent',
                        borderRight: '1px solid rgba(0,0,0,0.05)',
                        top: 0,
                        height: '100vh',
                        zIndex: 10, // Below header (z-index 1100)
                    },
                }}
                open={sidebarVisible}
            >
                {drawerContent}
            </Drawer>
        </Box>
    )
}
