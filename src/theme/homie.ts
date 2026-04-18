/**
 * Design tokens from the Homie Stitch project (projects/12687770522109049257).
 * Light palette matches Stitch `designTheme.namedColors`; dark is a warm inverse derived from the same system (inverse_* roles).
 */

export type HomieScheme = "light" | "dark";

/** Stitch spacing scale base 8px; `spacingScale: 3` implies a 12–24px rhythm. */
export const homieSpacing = {
  page: 20,
  section: 16,
  inner: 14,
  chip: 8,
} as const;

/** ROUND_EIGHT + editorial cards: lg = 1rem, xl ~ 1.5rem (Stitch designMd). */
export const homieRadii = {
  control: 16,
  card: 24,
  sheet: 28,
  full: 9999,
} as const;

/** Ambient shadow from Stitch design system (diffused, warm). */
export const homieAmbientShadow = {
  light: "0 12px 32px rgba(38, 24, 23, 0.06)",
  dark: "0 12px 32px rgba(0, 0, 0, 0.35)",
} as const;

export type HomieColors = {
  isDark: boolean;
  background: string;
  card: string;
  cardSecondary: string;
  /** Stitch `surface-container-high` — inactive filter pills. */
  surfaceHigh: string;
  title: string;
  body: string;
  border: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  secondary: string;
  secondarySoft: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
  tabBarBorder: string;
};

export function getHomieColors(scheme: HomieScheme): HomieColors {
  if (scheme === "light") {
    return {
      isDark: false,
      background: "#FFF8F7",
      card: "#FFFFFF",
      cardSecondary: "#FFF0EF",
      surfaceHigh: "#FDE2E0",
      title: "#261817",
      body: "#5A403F",
      border: "rgba(226, 190, 188, 0.35)",
      accent: "#FF5A5F",
      accentPressed: "#B52330",
      accentSoft: "rgba(181, 35, 48, 0.14)",
      onAccent: "#FFFFFF",
      secondary: "#00696D",
      secondarySoft: "rgba(0, 105, 109, 0.12)",
      success: "#00696D",
      warning: "#B7791F",
      danger: "#BA1A1A",
      tabBar: "rgba(247, 220, 219, 0.94)",
      tabBarBorder: "rgba(142, 112, 111, 0.12)",
    };
  }

  return {
    isDark: true,
    background: "#261817",
    card: "#3D2C2C",
    cardSecondary: "#4A3A3A",
    surfaceHigh: "#524545",
    title: "#FFEDEB",
    body: "#C9B5B3",
    border: "rgba(255, 237, 235, 0.14)",
    accent: "#FF5A5F",
    accentPressed: "#FF8A8E",
    accentSoft: "rgba(255, 90, 95, 0.22)",
    onAccent: "#FFFFFF",
    secondary: "#8EEFF4",
    secondarySoft: "rgba(142, 239, 244, 0.14)",
    success: "#74D6DB",
    warning: "#FFD60A",
    danger: "#FFB4AB",
    tabBar: "rgba(61, 44, 44, 0.94)",
    tabBarBorder: "rgba(255, 237, 235, 0.1)",
  };
}
