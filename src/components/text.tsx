import { StyleSheet, Text as RNText, type TextProps } from "react-native";

import { fontFamilyForWeight } from "@/theme/fonts";
import { useTheme } from "@/theme/tokens";

const nonSelectableStyle = { userSelect: "none" as const };
const selectableStyle = { userSelect: "text" as const };

export function Text({ style, selectable = false, ...props }: TextProps) {
  const { fontWeight, fontFamily } = StyleSheet.flatten(style) ?? {};

  // An explicit family (the design's monospace eyebrows) wins, and keeps its
  // own fontWeight since those faces do synthesise weights.
  if (fontFamily) {
    return <RNText selectable={selectable} {...props} style={[selectable ? selectableStyle : nonSelectableStyle, style]} />;
  }

  return (
    <RNText
      selectable={selectable}
      {...props}
      // Figtree ships one file per weight, so the weight lives in the family
      // name. Clear `fontWeight` to stop a second layer of synthesised bold.
      style={[
        selectable ? selectableStyle : nonSelectableStyle,
        style,
        { fontFamily: fontFamilyForWeight(fontWeight), fontWeight: undefined },
      ]}
    />
  );
}

export function Heading({ level = 2, style, ...props }: TextProps & { level?: 1 | 2 | 3 }) {
  const theme = useTheme();
  const size = { 1: 30, 2: 24, 3: 18 }[level];
  const ramp: TextProps["dynamicTypeRamp"] = level === 1 ? "title1" : level === 2 ? "title2" : "headline";
  const headingLevel = { "aria-level": level };

  return (
    <Text
      {...headingLevel}
      accessibilityRole="header"
      dynamicTypeRamp={ramp}
      role="heading"
      selectable
      {...props}
      style={[{ color: theme.ink, fontSize: size, fontWeight: "700", lineHeight: size * 1.2 }, style]}
    />
  );
}

export function SelectableText(props: TextProps) {
  return <Text selectable {...props} />;
}
