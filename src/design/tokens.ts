/**
 * JS mirror of the CSS design tokens in `src/styles/index.css`.
 * Use only where CSS variables are not practical (inline gradients, canvas, meta tags).
 */
export const palette = {
  canvas: '#090611',
  surface: '#1A1129',
  surfaceRaised: '#231738',
  primary: '#8538F5',
  secondary: '#B44CFF',
  magenta: '#E04BD6',
  lilac: '#D9C2FF',
  fg: '#FFFFFF',
  muted: '#A7A0B5',
  success: '#5EE3A1',
  warning: '#FFC061',
  danger: '#FF5C7A',
} as const;

export const motion = {
  spring: { type: 'spring', stiffness: 420, damping: 32 } as const,
  softSpring: { type: 'spring', stiffness: 220, damping: 26 } as const,
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
};
