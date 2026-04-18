/**
 * Typography aligned with Stitch Homie (Plus Jakarta Sans headlines, Manrope body).
 * Font files are loaded in root layout; families match @expo-google-fonts/* names.
 */

export const homieFontFamily = {
  headlineBold: "PlusJakartaSans_700Bold",
  headlineExtraBold: "PlusJakartaSans_800ExtraBold",
  headlineSemiBold: "PlusJakartaSans_600SemiBold",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemiBold: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
} as const;

/** Branded top bar title (Stitch: text-xl font-black tracking-tighter text-primary). */
export const homieBrandTitle = {
  fontFamily: homieFontFamily.headlineExtraBold,
  fontSize: 22,
  letterSpacing: -0.8,
  fontWeight: "800" as const,
};

export const homieType = {
  /** Section titles e.g. "Available in …" */
  headlineSection: {
    fontFamily: homieFontFamily.headlineBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  /** Listing card titles */
  headlineCard: {
    fontFamily: homieFontFamily.headlineBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  body: {
    fontFamily: homieFontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: homieFontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: homieFontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: homieFontFamily.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
  },
  searchInput: {
    fontFamily: homieFontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
} as const;
