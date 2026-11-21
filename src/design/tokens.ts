/**
 * JS mirror of the CSS design tokens in `src/styles/index.css`.
 * Use only where CSS variables are not practical (inline gradients, canvas, meta tags).
 */
export const palette = {
  canvas: '#05070C',
  surface: '#0E131C',
  surfaceRaised: '#151C28',
  primary: '#1F6BFF',
  secondary: '#00C2FF',
  volt: '#2EF07A',
  fg: '#EEF3FA',
  muted: '#8F9BAE',
  success: '#2EF07A',
  warning: '#FFB020',
  danger: '#FF4D5E',
} as const;
export const motion = {
  spring: { type: 'spring', stiffness: 420, damping: 32 } as const,
  softSpring: { type: 'spring', stiffness: 220, damping: 26 } as const,
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
};
