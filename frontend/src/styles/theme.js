// Theme configuration for ULT FPEB
export const theme = {
  colors: {
    primary: '#fd591c',
    primaryHover: '#e04d16',
    primaryLight: '#fe7040',
    primaryDark: '#d9460f',
    secondary: '#df2128',
    secondaryHover: '#c41e23',
    secondaryLight: '#e6393f',
    secondaryDark: '#b71c21',
    
    // Additional colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Neutral colors
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    
    white: '#ffffff',
    black: '#000000'
  },
  
  gradients: {
    primary: 'linear-gradient(135deg, #fd591c 0%, #d9460f 100%)',
    secondary: 'linear-gradient(135deg, #df2128 0%, #b71c21 100%)',
    mixed: 'linear-gradient(135deg, #fd591c 0%, #df2128 100%)',
    sunset: 'linear-gradient(135deg, #fe7040 0%, #e6393f 100%)'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    
    // Theme-specific shadows
    primarySm: '0 4px 6px -1px rgba(253, 89, 28, 0.3)',
    primaryMd: '0 10px 25px -3px rgba(253, 89, 28, 0.4), 0 4px 6px -2px rgba(253, 89, 28, 0.3)',
    secondarySm: '0 4px 6px -1px rgba(223, 33, 40, 0.3)',
    secondaryMd: '0 10px 25px -3px rgba(223, 33, 40, 0.4), 0 4px 6px -2px rgba(223, 33, 40, 0.3)'
  },
  
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },
  
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem'
  },
  
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem'
  },
  
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto'
  },
  
  animation: {
    duration: {
      fast: '0.15s',
      normal: '0.25s',
      slow: '0.35s'
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
};

// Helper functions for theme usage
export const getThemeColor = (colorPath) => {
  const keys = colorPath.split('.');
  let value = theme;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) return null;
  }
  
  return value;
};

export const createButtonStyle = (variant = 'primary', size = 'medium') => {
  const baseStyle = {
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.semibold,
    transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.default}`,
    transform: 'translateY(0)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2]
  };
  
  const variants = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.white,
      boxShadow: theme.shadows.primarySm
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      color: theme.colors.white,
      boxShadow: theme.shadows.secondarySm
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: `2px solid ${theme.colors.primary}`
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: 'none'
    }
  };
  
  const sizes = {
    small: {
      padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
      fontSize: theme.fontSize.sm,
      minHeight: '36px'
    },
    medium: {
      padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
      fontSize: theme.fontSize.base,
      minHeight: '44px'
    },
    large: {
      padding: `${theme.spacing[4]} ${theme.spacing[8]}`,
      fontSize: theme.fontSize.lg,
      minHeight: '52px'
    }
  };
  
  return {
    ...baseStyle,
    ...variants[variant],
    ...sizes[size]
  };
};

export const createCardStyle = (shadow = true, padding = 'medium') => {
  const paddingMap = {
    small: theme.spacing[4],
    medium: theme.spacing[6],
    large: theme.spacing[8]
  };
  
  return {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    border: `1px solid ${theme.colors.gray200}`,
    padding: paddingMap[padding] || theme.spacing[6],
    boxShadow: shadow ? theme.shadows.base : 'none',
    transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.default}`
  };
};

export default theme;
