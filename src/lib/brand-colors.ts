/**
 * The ONE non-CSS file allowed to hold colour literals. Meta tags, the web
 * manifest and Satori (OG images) cannot read CSS custom properties, so these
 * mirror --paper and --dark from src/styles/tokens.css. Keep them in sync.
 */
export const brandColors = {
  light: "#ffffff",
  dark: "#0a0a0a",
  onDark: "#fafafa",
  onDarkMuted: "#a3a3a3",
  brand: "#4f46e5",
} as const;
