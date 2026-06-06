export const Theme = {
  colors: {
    bgSky: "#DDF5FF",
    bgCream: "#FFF8E8",
    bgMint: "#EAF8E9",
    bgPurple: "#F3EAFE",
    panel: "#FFFFFF",
    panelSoft: "#FFFDF6",
    primaryGreen: "#6FD28C",
    primaryRed: "#FF7D7D",
    primaryBlue: "#72B8FF",
    primaryPurple: "#A98BFF",
    primaryYellow: "#FFD76A",
    textDark: "#2F2A25",
    textSub: "#7B756E",
    danger: "#FF5A5F",
    success: "#38B26B",
    warning: "#FFB02E",
    softBorder: "#E7DCC8"
  },
  fontSize: {
    title: 42,
    subtitle: 28,
    body: 22,
    small: 18,
    tiny: 14
  },
  radius: {
    card: 22,
    button: 18,
    pill: 999
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 36
  }
} as const;

export type ThemeColorName = keyof typeof Theme.colors;

