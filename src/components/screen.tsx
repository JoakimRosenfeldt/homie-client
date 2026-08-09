import React from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/tokens";

/** Tab bar chrome above the home indicator (9px top pad + icon/label stack). */
export const TAB_BAR_CONTENT_HEIGHT = 56;

export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 14);
}

/**
 * Full-bleed screen background plus the design's 62px top inset, expressed as
 * the real safe-area inset so it lands correctly on notched and flat devices.
 */
export function Screen({
  children,
  scroll = true,
  clearsTabBar = true,
  contentStyle,
  paddingHorizontal = 0,
}: React.PropsWithChildren<{
  scroll?: boolean;
  clearsTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  paddingHorizontal?: number;
}>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  const padding = {
    paddingTop: insets.top + 14,
    paddingBottom: clearsTabBar ? tabBarHeight + 24 : 24,
    paddingHorizontal,
  };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: theme.background }, padding, contentStyle]}>{children}</View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[padding, contentStyle]}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Screen-sized overlay used for detail, chat, filters and onboarding. */
export function Overlay({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();

  return <View style={[{ flex: 1, backgroundColor: theme.background }, style]}>{children}</View>;
}
