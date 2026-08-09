import { Image } from "expo-image";
import React from "react";
import { type LayoutChangeEvent, StyleSheet, type StyleProp, View, type ViewStyle } from "react-native";

import { Text } from "@/components/text";
import { MONO_FONT } from "@/theme/fonts";
import { useTheme } from "@/theme/tokens";

/**
 * The design renders every image as a labelled diagonal-stripe placeholder.
 * That stays the fallback, and a real photo renders whenever `uri` is set, so
 * the same component covers both prototype and production data.
 */
export function Photo({
  uri,
  label,
  stripe = 10,
  style,
  children,
  contentFit = "cover",
}: React.PropsWithChildren<{
  uri?: string;
  label?: string;
  stripe?: number;
  style?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
}>) {
  const theme = useTheme();

  return (
    <View style={[{ backgroundColor: theme.placeholderB, overflow: "hidden" }, style]}>
      {uri ? <Image source={uri} contentFit={contentFit} transition={180} style={{ flex: 1 }} /> : <Stripes stripe={stripe} />}

      {!uri && label ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", pointerEvents: "none" }]}>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 10, fontWeight: "500", letterSpacing: 0.6, color: theme.faint }}>
            {label}
          </Text>
        </View>
      ) : null}

      {children}
    </View>
  );
}

/**
 * `repeating-linear-gradient(135deg, a 0 Npx, b Npx 2Npx)` has no React Native
 * equivalent, so the bands are drawn as rotated views. Rotating by 45° shrinks
 * a band's perpendicular width by cos(45°), hence the √2 compensation.
 */
function Stripes({ stripe }: { stripe: number }) {
  const theme = useTheme();
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      Math.round(current.width) === Math.round(width) && Math.round(current.height) === Math.round(height)
        ? current
        : { width, height },
    );
  };

  const band = stripe * Math.SQRT2;
  const spacing = band * 2;
  const span = size.width + size.height;
  const count = span > 0 ? Math.ceil(span / spacing) + 2 : 0;
  const length = span * 1.5;

  return (
    <View onLayout={handleLayout} style={[StyleSheet.absoluteFill, { backgroundColor: theme.placeholderB, overflow: "hidden" }]}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            width: band,
            height: length,
            left: index * spacing - size.height,
            top: (size.height - length) / 2,
            backgroundColor: theme.placeholderA,
            transform: [{ rotate: "45deg" }],
          }}
        />
      ))}
    </View>
  );
}

export function Avatar({ uri, size, ring = false, stripe = 7 }: { uri?: string; size: number; ring?: boolean; stripe?: number }) {
  const theme = useTheme();

  return (
    <Photo
      uri={uri}
      stripe={stripe}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        borderWidth: ring ? 2 : 0,
        borderColor: ring ? theme.accent : "transparent",
      }}
    />
  );
}
