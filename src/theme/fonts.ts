import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/figtree";
import { Platform, type TextStyle } from "react-native";

/** The design sets its eyebrow labels in `ui-monospace, Menlo, monospace`. */
export const MONO_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "ui-monospace, Menlo, monospace",
});

/**
 * Figtree ships one file per weight, so React Native cannot synthesise weights
 * from a single family the way CSS does. `<Text>` maps the `fontWeight` in a
 * style down to the matching family via `fontFamilyForWeight`.
 */
const familyByWeight = {
  400: "Figtree_400Regular",
  500: "Figtree_500Medium",
  600: "Figtree_600SemiBold",
  700: "Figtree_700Bold",
  800: "Figtree_800ExtraBold",
} as const;

const DEFAULT_WEIGHT = 400;

export function useNaboFonts() {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  // A font that fails to download should not wedge the app on the splash
  // screen — fall through to the system face instead.
  return loaded || error !== null;
}

export function fontFamilyForWeight(weight: TextStyle["fontWeight"]) {
  if (weight === "normal" || weight === undefined) {
    return familyByWeight[DEFAULT_WEIGHT];
  }

  if (weight === "bold") {
    return familyByWeight[700];
  }

  const numeric = typeof weight === "number" ? weight : Number(weight);
  if (!Number.isFinite(numeric)) {
    return familyByWeight[DEFAULT_WEIGHT];
  }

  // Round to the nearest shipped weight rather than dropping to the default.
  const available = [400, 500, 600, 700, 800] as const;
  const nearest = available.reduce((best, candidate) =>
    Math.abs(candidate - numeric) < Math.abs(best - numeric) ? candidate : best,
  );

  return familyByWeight[nearest];
}
