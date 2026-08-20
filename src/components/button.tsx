import { Link, type Href } from "expo-router";
import React from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";

import { MINIMUM_TARGET_SIZE, useFocusRing } from "@/components/interaction";
import { Text } from "@/components/text";
import { radius, useTheme } from "@/theme/tokens";

type Variant = "accent" | "destructive" | "inverse" | "surface";

type ButtonAction =
  | { href: Href; onPress?: never; replace?: boolean }
  | { href?: never; onPress: () => void; replace?: never };

type ButtonProps = ButtonAction & {
  label: string;
  variant?: Variant;
  height?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  dimWhenDisabled?: boolean;
};

export function Button({
  label,
  href,
  onPress,
  replace,
  variant = "accent",
  height = 52,
  style,
  disabled = false,
  dimWhenDisabled = true,
}: ButtonProps) {
  const theme = useTheme();
  const focus = useFocusRing(theme);

  const background = {
    accent: theme.accent,
    destructive: theme.danger,
    inverse: theme.inverse,
    surface: theme.card,
  }[variant];

  const foreground = {
    accent: theme.onAccent,
    destructive: theme.card,
    inverse: theme.onInverse,
    surface: theme.ink,
  }[variant];

  const button = (
    <Pressable
      aria-disabled={disabled}
      accessibilityRole={href ? "link" : "button"}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: Math.max(height, MINIMUM_TARGET_SIZE),
          borderRadius: radius.button,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            pressed && variant === "accent"
              ? theme.accentPressed
              : pressed && variant === "destructive"
                ? theme.dangerPressed
                : background,
          borderWidth: variant === "surface" ? 1 : 0,
          borderColor: theme.controlBorder,
          opacity:
            disabled && dimWhenDisabled
              ? 0.55
              : pressed && variant !== "accent" && variant !== "destructive"
                ? 0.9
                : 1,
        },
        focus.focusStyle,
        style,
      ]}>
      <Text style={{ fontSize: 14.5, fontWeight: "700", color: foreground }}>{label}</Text>
    </Pressable>
  );

  return href && !disabled ? (
    <Link href={href} replace={replace} asChild>
      {button}
    </Link>
  ) : button;
}

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
  const focus = useFocusRing(theme);
  const accent = tone === "accent";

  return (
    <Pressable
      accessibilityRole="button"
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: MINIMUM_TARGET_SIZE,
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: radius.pill,
          borderCurve: "continuous",
          borderWidth: accent ? 0 : 1,
          borderColor: theme.controlBorder,
          backgroundColor: accent
            ? pressed
              ? theme.accentPressed
              : theme.accent
            : pressed
              ? theme.hover
              : theme.card,
        },
        focus.focusStyle,
      ]}>
      {icon}
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: accent ? theme.onAccent : theme.ink }}>{label}</Text>
    </Pressable>
  );
}

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
  const focus = useFocusRing(theme);
  const targetSize = Math.max(size, MINIMUM_TARGET_SIZE);
  const background = tone === "accent" ? theme.accent : tone === "glass" ? theme.glass : theme.card;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: targetSize,
          height: targetSize,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed && tone === "accent" ? theme.accentPressed : background,
          borderWidth: tone === "surface" ? 1 : 0,
          borderColor: theme.controlBorder,
          opacity: pressed && tone !== "accent" ? 0.85 : 1,
        },
        focus.focusStyle,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function CardPressable({
  children,
  onPress,
  style,
  accessibilityLabel,
}: React.PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>) {
  const theme = useTheme();
  const focus = useFocusRing(theme);

  if (!onPress) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.93 : 1 }, focus.focusStyle]}>
      {children}
    </Pressable>
  );
}
