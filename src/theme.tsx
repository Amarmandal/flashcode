import { createTheme, MantineColorsTuple, rem } from '@mantine/core';

// Custom color palettes based on the design requirements
const slate: MantineColorsTuple = [
  '#f8fafc', // 50
  '#f1f5f9', // 100
  '#e2e8f0', // 200
  '#cbd5e1', // 300
  '#94a3b8', // 400
  '#64748b', // 500
  '#475569', // 600
  '#334155', // 700
  '#1e293b', // 800
  '#0f172a', // 900
];

const success: MantineColorsTuple = [
  '#d1fae5',
  '#a7f3d0',
  '#6ee7b7',
  '#34d399',
  '#10b981',
  '#059669',
  '#047857',
  '#065f46',
  '#064e3b',
  '#022c22',
];

const warning: MantineColorsTuple = [
  '#fef3c7',
  '#fde68a',
  '#fcd34d',
  '#fbbf24',
  '#f59e0b',
  '#d97706',
  '#b45309',
  '#92400e',
  '#78350f',
  '#451a03',
];

const danger: MantineColorsTuple = [
  '#fee2e2',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444',
  '#dc2626',
  '#b91c1c',
  '#991b1b',
  '#7f1d1d',
  '#450a0a',
];

export const theme = createTheme({
  colors: {
    slate,
    success,
    warning,
    danger,
  },
  primaryColor: 'slate',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSizes: {
    xs: rem(11),
    sm: rem(13),
    md: rem(14),
    lg: rem(16),
    xl: rem(18),
  },
  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },
  shadows: {
    xs: 'none',
    sm: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'sm',
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Input: {
      defaultProps: {
        radius: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Select: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'xs',
      },
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: rem(10),
          padding: '2px 8px',
        },
      },
    },
    NavLink: {
      defaultProps: {
        variant: 'subtle',
      },
    },
  },
});
