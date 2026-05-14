// verification email
export const iconSection = {
  textAlign: "center" as const,
  margin: "20px 0",
};

export const emailIcon = {
  fontSize: "64px",
  margin: "0",
};

export const otpContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

export const otpLabel = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 16px 0",
};

export const otpBox = {
  backgroundColor: "#f9fafb",
  border: "2px dashed #4F46E5",
  borderRadius: "12px",
  padding: "24px",
  margin: "16px auto",
  maxWidth: "280px",
};

export const otpCode = {
  fontSize: "42px",
  fontWeight: "bold",
  color: "#4F46E5",
  letterSpacing: "8px",
  fontFamily: "monospace",
  margin: "0",
  textAlign: "center" as const,
};

export const otpHelper = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "16px 0 0 0",
};

// forgot and reset password
export const colors = {
  primary: "#4F46E5", // Indigo
  success: "#10B981", // Green
  danger: "#DC2626", // Red
  warning: "#F59E0B", // Amber
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  blue: {
    50: "#f0f7ff",
    100: "#e0efff",
    500: "#3b82f6",
    700: "#1e40af",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    700: "#991b1b",
    800: "#7f1d1d",
  },
  green: {
    50: "#f0fdf4",
    100: "#dcfce7",
    700: "#15803d",
    800: "#166534",
  },
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
};

export const fontSize = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "28px",
};

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

export const borderRadius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  full: "9999px",
};

// Base styles
export const baseStyles = {
  main: {
    backgroundColor: "#f6f9fc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    maxWidth: "600px",
  },
  content: {
    padding: `0 ${spacing["2xl"]}`,
  },
};

// Typography styles
export const typography = {
  heading: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    textAlign: "center" as const,
    margin: `${spacing.xl} 0`,
  },
  subheading: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
    margin: `${spacing.lg} 0 ${spacing.md} 0`,
  },
  paragraph: {
    fontSize: fontSize.base,
    lineHeight: "26px",
    color: colors.gray[700],
    margin: `${spacing.md} 0`,
  },
  small: {
    fontSize: fontSize.sm,
    lineHeight: "22px",
    color: colors.gray[600],
    margin: `${spacing.sm} 0`,
  },
};

// Component styles
export const components = {
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "14px 40px",
  },
  buttonDanger: {
    backgroundColor: colors.danger,
    borderRadius: borderRadius.md,
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "14px 40px",
  },
  link: {
    color: colors.primary,
    textDecoration: "underline",
  },
  hr: {
    borderColor: colors.gray[200],
    margin: `${spacing.xl} 0`,
  },
};

// Box styles
export const boxes = {
  info: {
    backgroundColor: colors.blue[50],
    border: `1px solid ${colors.blue[100]}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    margin: `${spacing.lg} 0`,
  },
  success: {
    backgroundColor: colors.green[50],
    border: `1px solid ${colors.green[100]}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    margin: `${spacing.lg} 0`,
  },
  warning: {
    backgroundColor: colors.red[50],
    border: `1px solid ${colors.red[100]}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    margin: `${spacing.lg} 0`,
  },
  neutral: {
    backgroundColor: colors.gray[50],
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    margin: `${spacing.lg} 0`,
  },
};

// Details box styles
export const detailsBox = {
  container: {
    backgroundColor: colors.gray[50],
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    margin: `${spacing.lg} 0`,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    margin: `0 0 ${spacing.md} 0`,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    padding: `${spacing.sm} 0`,
    width: "120px",
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    fontWeight: fontWeight.medium,
    padding: `${spacing.sm} 0`,
  },
};

// Icon styles
export const icons = {
  section: {
    textAlign: "center" as const,
    margin: `${spacing.lg} 0`,
  },
  success: {
    fontSize: "64px",
    margin: "0",
  },
  warning: {
    fontSize: "48px",
    margin: "0",
  },
};

// Warning/Alert box styles
export const alerts = {
  warning: {
    container: {
      backgroundColor: colors.red[50],
      border: `1px solid ${colors.red[100]}`,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      margin: `${spacing.lg} 0`,
    },
    title: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.bold,
      color: colors.red[700],
      margin: `0 0 ${spacing.sm} 0`,
    },
    text: {
      fontSize: fontSize.sm,
      lineHeight: "22px",
      color: colors.red[800],
      margin: `0 0 ${spacing.md} 0`,
    },
  },
  info: {
    container: {
      backgroundColor: colors.blue[50],
      border: `1px solid ${colors.blue[100]}`,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      margin: `${spacing.lg} 0`,
    },
    title: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.bold,
      color: colors.blue[700],
      margin: `0 0 ${spacing.sm} 0`,
    },
    text: {
      fontSize: fontSize.sm,
      lineHeight: "22px",
      color: colors.blue[700],
      margin: `${spacing.sm} 0`,
    },
  },
};

// Tips/List styles
export const lists = {
  container: {
    backgroundColor: colors.green[50],
    border: `1px solid ${colors.green[100]}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    margin: `${spacing.lg} 0`,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.green[700],
    margin: `0 0 ${spacing.sm} 0`,
  },
  ul: {
    margin: "0",
    paddingLeft: "20px",
  },
  li: {
    fontSize: fontSize.sm,
    lineHeight: "24px",
    color: colors.green[800],
    margin: "4px 0",
  },
};

// Layout styles
export const layout = {
  section: {
    margin: `${spacing.lg} 0`,
  },
  centered: {
    textAlign: "center" as const,
    margin: `${spacing.xl} 0`,
  },
  footer: {
    padding: `${spacing.xl} ${spacing["2xl"]} 0`,
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: fontSize.xs,
    lineHeight: "20px",
    color: colors.gray[400],
    margin: "4px 0",
  },
};
