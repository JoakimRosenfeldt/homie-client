import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { radius, useTheme } from "@/theme/tokens";

/** Toggleable filter/tag chip — the design's `chip(on)` helper. */
export function SelectChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: radius.pill,
        borderCurve: "continuous",
        borderWidth: 1,
        backgroundColor: selected ? theme.accent : theme.card,
        borderColor: selected ? theme.accent : theme.borderStrong,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: selected ? theme.onAccent : theme.body }}>{label}</Text>
    </Pressable>
  );
}

/** Terracotta-tinted pill — active search chips and applicant traits. */
export function SoftPill({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  const theme = useTheme();
  const small = size === "sm";

  return (
    <View
      style={{
        paddingHorizontal: small ? 12 : 10,
        paddingVertical: small ? 7 : 6,
        borderRadius: radius.pill,
        borderCurve: "continuous",
        backgroundColor: theme.accentSoft,
        borderWidth: small ? 1 : 0,
        borderColor: theme.accentSoftBorder,
      }}>
      <Text style={{ fontSize: small ? 11.5 : 11, fontWeight: "600", color: theme.accent }}>{label}</Text>
    </View>
  );
}

/** Muted square tag used on listing cards. */
export function MetaTag({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: radius.tag,
        borderCurve: "continuous",
        backgroundColor: theme.sunken,
      }}>
      <Text style={{ fontSize: 10.5, fontWeight: "600", color: theme.muted }}>{label}</Text>
    </View>
  );
}

/** Bordered tag used on the listing detail sheet. */
export function OutlineTag({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: radius.tagLg,
        borderCurve: "continuous",
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: theme.body }}>{label}</Text>
    </View>
  );
}

/** Small count badge (filter button, tab bar). */
export function CountBadge({ count, style }: { count: number; style?: { top?: number; right?: number } }) {
  const theme = useTheme();

  if (count <= 0) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: style?.top ?? -4,
        right: style?.right ?? -4,
        minWidth: 17,
        height: 17,
        paddingHorizontal: 4,
        borderRadius: radius.pill,
        backgroundColor: theme.badge,
        alignItems: "center",
        justifyContent: "center",
      }}>
      <Text style={{ fontSize: 10, lineHeight: 17, fontWeight: "700", color: theme.onBadge }}>{count}</Text>
    </View>
  );
}

/** Uppercase section label — "MONTHLY RENT", "WHO YOU'D LIVE WITH". */
export function SectionLabel({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.88, color: theme.faint }}>{label}</Text>
  );
}
