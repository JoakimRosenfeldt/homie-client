import { Text as RNText, type TextProps } from "react-native";

const nonSelectableStyle = { userSelect: "none" as const };

export function Text({ style, selectable = false, ...props }: TextProps) {
  return <RNText selectable={selectable} style={[nonSelectableStyle, style]} {...props} />;
}
