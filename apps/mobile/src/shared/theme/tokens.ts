export const tokens = {
  colors: {
    background: "#F7F3EA",
    surface: "#FFFDF8",
    border: "#D9CFBC",
    text: "#1F1B16",
    textMuted: "#6E6254",
    primary: "#8C3B2A",
    primarySoft: "#E7C8B8",
    success: "#2F6B3A",
    warning: "#A36B00",
    danger: "#A12828",
    skeletonBase: "#E8DECF",
    skeletonHighlight: "#F5EEE4"
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22
  },
  typography: {
    display: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: "700" as const
    },
    heading: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700" as const
    },
    body: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "400" as const
    },
    label: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "600" as const
    }
  }
};

export type AppTheme = typeof tokens;
