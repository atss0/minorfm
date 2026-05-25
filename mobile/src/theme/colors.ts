export const colors = {
  primary: '#BC022D',
  bg: '#0B1114',
  surface: '#131C21',
  border: '#1E2C33',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A9BA8',

  // Semantic
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  online: '#34C759',

  // Transparent overlays
  overlay: 'rgba(0,0,0,0.5)',
  surfaceHover: 'rgba(255,255,255,0.05)',
} as const;

export type ColorKey = keyof typeof colors;
