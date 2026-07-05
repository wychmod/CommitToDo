export const typography = {
  displayXl: { size: '48px', weight: 600, lineHeight: 1.05, letterSpacing: '-2.0px' },
  displayLg: { size: '40px', weight: 600, lineHeight: 1.1, letterSpacing: '-1.5px' },
  displayMd: { size: '32px', weight: 600, lineHeight: 1.15, letterSpacing: '-1.0px' },
  headline: { size: '24px', weight: 600, lineHeight: 1.2, letterSpacing: '-0.6px' },
  subhead: { size: '20px', weight: 400, lineHeight: 1.4, letterSpacing: '-0.2px' },
  cardTitle: { size: '17px', weight: 500, lineHeight: 1.25, letterSpacing: '-0.4px' },
  bodyLg: { size: '17px', weight: 400, lineHeight: 1.5, letterSpacing: '-0.1px' },
  body: { size: '15px', weight: 400, lineHeight: 1.5, letterSpacing: '-0.05px' },
  bodySm: { size: '13px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
  button: { size: '14px', weight: 500, lineHeight: 1.2, letterSpacing: '0' },
  caption: { size: '11px', weight: 400, lineHeight: 1.4, letterSpacing: '0' },
  eyebrow: { size: '12px', weight: 500, lineHeight: 1.3, letterSpacing: '0.4px' },
  mono: { size: '13px', weight: 500, lineHeight: 1.5, letterSpacing: '0' },
  monoSm: { size: '11px', weight: 500, lineHeight: 1.4, letterSpacing: '0' },
} as const;

export type TypographyToken = keyof typeof typography;
