import { StyleSheet, Text as RNText, type TextProps } from "react-native";

import { fontFamilyForWeight } from "@/theme/fonts";

const nonSelectableStyle = { userSelect: "none" as const };

export function Text({ style, selectable = false, ...props }: TextProps) {
  const { fontWeight, fontFamily } = StyleSheet.flatten(style) ?? {};

  // An explicit family (the design's monospace eyebrows) wins, and keeps its
  // own fontWeight since those faces do synthesise weights.
  if (fontFamily) {
    return <RNText selectable={selectable} {...props} style={[nonSelectableStyle, style]} />;
  }

  return (
    <RNText
      selectable={selectable}
      {...props}
      // Figtree ships one file per weight, so the weight lives in the family
      // name. Clear `fontWeight` to stop a second layer of synthesised bold.
      style={[nonSelectableStyle, style, { fontFamily: fontFamilyForWeight(fontWeight), fontWeight: undefined }]}
    />
  );
}
