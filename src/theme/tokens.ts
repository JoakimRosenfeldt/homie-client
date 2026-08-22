const light = {
  isDark: false,

  background: "#EDF1F6",
  card: "#FFFFFF",
  sunken: "#EDF1F6",
  hover: "#E5EBF2",

  ink: "#16202B",
  body: "#33404C",
  muted: "#6B7785",
  faint: "#93A0AE",

  accent: "#C2492E",
  accentPressed: "#A33A22",
  accentSoft: "#FBE8E2",
  accentSoftBorder: "rgba(194,73,46,0.18)",
  accentText: "#C2492E",
  onAccent: "#FFFFFF",

  badge: "#2F5D8C",
  onBadge: "#FFFFFF",

  border: "rgba(22,32,43,0.08)",
  borderSoft: "rgba(22,32,43,0.10)",
  borderStrong: "rgba(22,32,43,0.16)",
  controlBorder: "rgba(22,32,43,0.12)",
  borderDashed: "rgba(22,32,43,0.18)",
  divider: "rgba(22,32,43,0.07)",
  accentTrack: "rgba(194,73,46,0.20)",

  tabBar: "#EDF1F6",
  tabInactive: "#9BA8B5",

  focus: "#285A78",
  success: "#2F684A",
  successSoft: "#E7F1EB",
  warning: "#754D10",
  warningSoft: "#F8EED9",
  danger: "#8F2F2A",
  dangerPressed: "#74231F",
  dangerSoft: "#F9E7E5",
  info: "#285A78",
  infoSoft: "#E8F0F5",

  placeholderA: "#DCE4EE",
  placeholderB: "#E8EDF4",

  deckBack: "#DDE4EC",
  deckMid: "#E6EBF2",

  mapGround: "#DFE7F0",
  mapGrid: "rgba(22,32,43,0.05)",
  mapPark: "#D9E6DA",
  mapWater: "#C9DDEF",

  scrim: "rgba(22,32,43,0.35)",
  matchScrim: "rgba(22,32,43,0.86)",
  photoOverlay: "rgba(22,32,43,0.82)",
  onPhotoOverlay: "#FFFFFF",
  glass: "rgba(255,255,255,0.92)",

  /** Solid high-contrast CTA ("Show 128 rooms"). */
  inverse: "#16202B",
  onInverse: "#FFFFFF",

  /**
   * The match celebration sits on a dark scrim in both schemes, so its own
   * surface and text stay fixed rather than following the active palette.
   */
  matchSurface: "#EDF1F6",
  onMatchSurface: "#16202B",
  matchText: "#EDF1F6",
  matchTextMuted: "rgba(237,241,246,0.72)",
};

export const dark: typeof light = {
  isDark: true,

  background: "#111820",
  card: "#1A222C",
  sunken: "#151C24",
  hover: "#232C37",

  ink: "#EDF1F6",
  body: "#C6D0DB",
  muted: "#AAB6C2",
  faint: "#91A0AE",

  accent: "#E2694B",
  accentPressed: "#C2492E",
  accentSoft: "#38201A",
  accentSoftBorder: "#754333",
  accentText: "#F39A80",
  onAccent: "#111820",

  badge: "#5C8CC0",
  onBadge: "#0B1219",

  border: "rgba(237,241,246,0.10)",
  borderSoft: "rgba(237,241,246,0.13)",
  borderStrong: "rgba(237,241,246,0.20)",
  controlBorder: "#718191",
  borderDashed: "rgba(237,241,246,0.22)",
  divider: "rgba(237,241,246,0.09)",
  accentTrack: "rgba(226,105,75,0.28)",

  tabBar: "#111820",
  tabInactive: "#91A0AE",

  focus: "#8EC4E4",
  success: "#8FD0AA",
  successSoft: "#1D3227",
  warning: "#E6BE72",
  warningSoft: "#382E1C",
  danger: "#F1A09A",
  dangerPressed: "#D98179",
  dangerSoft: "#3B2222",
  info: "#8EC4E4",
  infoSoft: "#1B2D39",

  placeholderA: "#242E39",
  placeholderB: "#1C242E",

  deckBack: "#1F2831",
  deckMid: "#242E39",

  mapGround: "#18202A",
  mapGrid: "rgba(237,241,246,0.06)",
  mapPark: "#1F2C24",
  mapWater: "#1B2A38",

  scrim: "rgba(0,0,0,0.55)",
  matchScrim: "rgba(6,10,14,0.90)",
  photoOverlay: "rgba(6,10,14,0.82)",
  onPhotoOverlay: "#EDF1F6",
  glass: "rgba(26,34,44,0.92)",

  inverse: "#EDF1F6",
  onInverse: "#16202B",

  matchSurface: "#EDF1F6",
  onMatchSurface: "#16202B",
  matchText: "#EDF1F6",
  matchTextMuted: "rgba(237,241,246,0.72)",
};

export type Palette = typeof light;

export function useTheme(): Palette {
  return light;
}

/**
 * Elevation presets. React Native cannot express a CSS box-shadow directly, so
 * each entry approximates one of the design's shadows and adds the Android
 * `elevation` equivalent.
 *
 * iOS drops the shadow when `overflow: "hidden"` is set on the same view
 * (it maps to `masksToBounds`), so apply these to a wrapper around the clipped
 * card rather than to the card itself.
 */
export const shadow = {
  /** Listing cards — 0 1px 2px rgba(22,32,43,.04) */
  card: {
    shadowColor: "#16202B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  /** Swipe deck and onboarding preview — 0 10px 30px rgba(22,32,43,.10) */
  raised: {
    shadowColor: "#16202B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
  /** Floating map preview — 0 8px 26px rgba(22,32,43,.14) */
  floating: {
    shadowColor: "#16202B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  /** Map pins — 0 3px 10px rgba(22,32,43,.18) */
  pin: {
    shadowColor: "#16202B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

/** Corner radii used across the design. */
export const radius = {
  tag: 7,
  tagLg: 8,
  field: 16,
  button: 18,
  bubble: 18,
  card: 24,
  cardLg: 28,
  sheet: 26,
  pill: 999,
} as const;
