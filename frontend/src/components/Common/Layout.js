import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Avatar, Divider, IconButton, Tooltip,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 72;

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardRoundedIcon /> },
  { label: 'Upload Claim', path: '/upload', icon: <UploadFileRoundedIcon /> },
  { label: 'All Claims', path: '/claims', icon: <AssignmentRoundedIcon /> },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const drawerW = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerW,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerW,
            boxSizing: 'border-box',
            bgcolor: '#0D1829',
            border: 'none',
            borderRight: '1px solid rgba(79,142,247,0.08)',
            transition: 'width 0.25s ease',
            overflow: 'hidden',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 72 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #4F8EF7, #10D9A0)',
              flexShrink: 0,
            }}
          >
            <AutoFixHighRoundedIcon sx={{ fontSize: 20 }} />
          </Avatar>
          {!collapsed && (
            <Box>
              <Typography variant="h6" sx={{ fontSize: '0.95rem', lineHeight: 1.2, color: 'text.primary' }}>
                ClaimsAI
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                Intelligent Processing
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'divider' }} />

        {/* Navigation */}
        <List sx={{ px: 1, py: 2, flex: 1 }}>
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: 2,
                      px: collapsed ? 1.5 : 2,
                      py: 1.2,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      bgcolor: active ? 'rgba(79,142,247,0.12)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(79,142,247,0.08)' },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 36,
                        color: active ? 'primary.main' : 'text.secondary',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: active ? 600 : 400,
                          color: active ? 'primary.main' : 'text.primary',
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ borderColor: 'divider' }} />

        {/* Collapse toggle */}
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
          <IconButton size="small" onClick={() => setCollapsed(p => !p)} sx={{ color: 'text.secondary' }}>
            {collapsed ? <MenuRoundedIcon fontSize="small" /> : <MenuOpenRoundedIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
