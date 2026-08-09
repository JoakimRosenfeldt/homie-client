import React from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";

import { Text } from "@/components/text";
import { radius, useTheme } from "@/theme/tokens";

type Variant = "accent" | "inverse" | "surface";

export function Button({
  label,
  onPress,
  variant = "accent",
  height = 52,
  style,
  disabled = false,
  dimWhenDisabled = true,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  height?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /**
   * Set false for a completed action ("Application sent ✓") that should keep
   * its full colour rather than reading as unavailable.
   */
  dimWhenDisabled?: boolean;
}) {
  const theme = useTheme();

  const background = {
    accent: theme.accent,
    inverse: theme.inverse,
    surface: theme.card,
  }[variant];

  const foreground = {
    accent: theme.onAccent,
    inverse: theme.onInverse,
    surface: theme.ink,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.button,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed && variant === "accent" ? theme.accentPressed : background,
          borderWidth: variant === "surface" ? 1 : 0,
          borderColor: theme.borderStrong,
          opacity: disabled && dimWhenDisabled ? 0.55 : pressed && variant !== "accent" ? 0.9 : 1,
        },
        style,
      ]}>
      <Text style={{ fontSize: 14.5, fontWeight: "700", color: foreground }}>{label}</Text>
    </Pressable>
  );
}

/** Rounded pill button — "Map" / "List" toggles, sheet header actions. */
export function PillButton({
  label,
  onPress,
  icon,
  tone = "surface",
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  tone?: "surface" | "accent";
}) {
  const theme = useTheme();
  const accent = tone === "accent";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        borderCurve: "continuous",
        borderWidth: accent ? 0 : 1,
        borderColor: theme.borderStrong,
        backgroundColor: accent ? (pressed ? theme.accentPressed : theme.accent) : pressed ? theme.hover : theme.card,
      })}>
      {icon}
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: accent ? theme.onAccent : theme.ink }}>{label}</Text>
    </Pressable>
  );
}

/** Circular icon button — swipe deck actions, chat send, detail back. */
export function CircleButton({
  onPress,
  size,
  tone = "surface",
  children,
  accessibilityLabel,
  style,
}: React.PropsWithChildren<{
  onPress: () => void;
  size: number;
  tone?: "surface" | "accent" | "glass";
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}>) {
  const theme = useTheme();

  const background =
    tone === "accent" ? theme.accent : tone === "glass" ? theme.glass : theme.card;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed && tone === "accent" ? theme.accentPressed : background,
          borderWidth: tone === "surface" ? 1 : 0,
          borderColor: theme.borderStrong,
          opacity: pressed && tone !== "accent" ? 0.85 : 1,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/** Card-shaped pressable used for listing cards and thread rows. */
export function CardPressable({
  children,
  onPress,
  style,
}: React.PropsWithChildren<{ onPress?: () => void; style?: StyleProp<ViewStyle> }>) {
  if (!onPress) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.93 : 1 }]}>
      {children}
    </Pressable>
  );
}
