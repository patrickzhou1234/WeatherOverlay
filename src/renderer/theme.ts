// ─────────────────────────────────────────────────────────
// MUI Theme — Dark glassmorphism theme for the overlay
// ─────────────────────────────────────────────────────────

import { createTheme, alpha } from '@mui/material/styles';

const PRIMARY = '#667eea';
const SECONDARY = '#764ba2';

export const overlayTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: PRIMARY,
      light: '#8da0ff',
      dark: '#4a5fc7',
    },
    secondary: {
      main: SECONDARY,
      light: '#9c6fc4',
      dark: '#5a3580',
    },
    background: {
      default: 'transparent',
      paper: alpha('#13132a', 0.82),
    },
    text: {
      primary: 'rgba(255,255,255,0.92)',
      secondary: 'rgba(255,255,255,0.6)',
      disabled: 'rgba(255,255,255,0.38)',
    },
    error: {
      main: '#ef5350',
    },
    divider: 'rgba(255,255,255,0.06)',
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Segoe UI', system-ui, sans-serif",
    h6: { fontWeight: 600, letterSpacing: -0.2 },
    subtitle2: { fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' as const, fontSize: '0.685rem' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.6875rem', letterSpacing: 0.2 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
          '& .MuiSlider-thumb': {
            width: 18,
            height: 18,
            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
            border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: `0 2px 6px ${alpha(PRIMARY, 0.4)}`,
            '&:hover, &.Mui-focusVisible': {
              boxShadow: `0 3px 10px ${alpha(PRIMARY, 0.55)}`,
            },
          },
          '& .MuiSlider-track': {
            background: `linear-gradient(90deg, ${PRIMARY}, ${SECONDARY})`,
            border: 'none',
          },
          '& .MuiSlider-rail': {
            opacity: 0.12,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 44,
          height: 26,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 3,
            '&.Mui-checked': {
              transform: 'translateX(18px)',
              '& + .MuiSwitch-track': {
                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
                opacity: 1,
              },
              '& .MuiSwitch-thumb': {
                backgroundColor: '#fff',
              },
            },
          },
          '& .MuiSwitch-thumb': {
            width: 20,
            height: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          },
          '& .MuiSwitch-track': {
            borderRadius: 13,
            backgroundColor: 'rgba(255,255,255,0.12)',
            opacity: 1,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
          boxShadow: `0 10px 20px rgba(0,0,0,0.35), 0 6px 6px rgba(0,0,0,0.23)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
            boxShadow: `0 12px 24px ${alpha(PRIMARY, 0.35)}, 0 6px 8px rgba(0,0,0,0.25)`,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.8125rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.08)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.14)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(PRIMARY, 0.5),
          },
        },
        input: {
          padding: '10px 12px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          letterSpacing: 0.3,
          borderRadius: 12,
          padding: '10px 20px',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
          boxShadow: `0 2px 8px ${alpha(PRIMARY, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
            boxShadow: `0 4px 14px ${alpha(PRIMARY, 0.45)}`,
            transform: 'translateY(-1px)',
          },
        },
        outlinedSecondary: {
          borderColor: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.6)',
          '&:hover': {
            background: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.12)',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backdropFilter: 'blur(12px)',
          background: alpha('#13132a', 0.9),
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.75rem',
        },
      },
    },
  },
});
