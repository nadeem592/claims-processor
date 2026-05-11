import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4F8EF7',
      light: '#7AABFF',
      dark: '#2563EB',
    },
    secondary: {
      main: '#10D9A0',
      light: '#34EDB8',
      dark: '#059669',
    },
    error: { main: '#FF5A6A' },
    warning: { main: '#FFB547' },
    success: { main: '#10D9A0' },
    background: {
      default: '#070E1C',
      paper: '#0D1829',
    },
    divider: 'rgba(79,142,247,0.12)',
    text: {
      primary: '#E8EEFF',
      secondary: '#8899BB',
    },
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#1E2D4A #070E1C',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#070E1C' },
          '&::-webkit-scrollbar-thumb': { background: '#1E2D4A', borderRadius: 3 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(79,142,247,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          padding: '8px 20px',
        },
        contained: {
          boxShadow: '0 4px 14px rgba(79,142,247,0.25)',
          '&:hover': { boxShadow: '0 6px 20px rgba(79,142,247,0.35)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: '#0D1829',
          fontWeight: 600,
          color: '#8899BB',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(79,142,247,0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(79,142,247,0.4)' },
          },
        },
      },
    },
  },
});

export default theme;
