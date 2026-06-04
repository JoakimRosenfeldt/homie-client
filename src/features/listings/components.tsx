import React from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useListingColors() {
  const isDark = useColorScheme() === "dark";

  return {
    isDark,
    background: isDark ? "#000000" : "#F2F2F7",
    card: isDark ? "#1C1C1E" : "#FFFFFF",
    cardSecondary: isDark ? "#2C2C2E" : "#F7F7FB",
    title: isDark ? "#FFFFFF" : "#111111",
    body: isDark ? "#A1A1A6" : "#5F5F66",
    border: isDark ? "#2C2C2E" : "#E5E5EA",
    accent: isDark ? "#0A84FF" : "#007AFF",
    accentSoft: isDark ? "rgba(10, 132, 255, 0.16)" : "rgba(0, 122, 255, 0.12)",
    success: isDark ? "#32D74B" : "#2F9E44",
    warning: isDark ? "#FFD60A" : "#B7791F",
    danger: isDark ? "#FF453A" : "#C62828",
  };
}

export function ListingScreen({
  children,
  footer,
  footerVisible = true,
  onFooterExited,
  onScroll,
  scrollEventThrottle,
}: React.PropsWithChildren<{
  footer?: React.ReactNode;
  footerVisible?: boolean;
  onFooterExited?: () => void;
  onScroll?: React.ComponentProps<typeof ScrollView>["onScroll"];
  scrollEventThrottle?: number;
}>) {
  const colors = useListingColors();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= 900;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        style={{ flex: 1 }}
        contentContainerStyle={{
          alignSelf: "center",
          width: "100%",
          maxWidth: 980,
          paddingHorizontal: isWide ? 28 : 20,
          paddingTop: insets.top + 20,
          paddingBottom: footer ? 124 : 40,
          gap: 16,
        }}>
        {children}
      </ScrollView>

      {footer ? (
        <ListingFooterBackground isVisible={footerVisible} isWide={isWide} onExited={onFooterExited}>
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>{footer}</View>
        </ListingFooterBackground>
      ) : null}
    </View>
  );
}

function ListingFooterBackground({
  children,
  isVisible,
  isWide,
  onExited,
}: React.PropsWithChildren<{ isVisible: boolean; isWide: boolean; onExited?: () => void }>) {
  const colors = useListingColors();
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((isReduceMotionEnabled) => {
      if (!isMounted) {
        return;
      }

      if (isReduceMotionEnabled) {
        progress.setValue(isVisible ? 1 : 0);
        if (!isVisible) {
          onExited?.();
        }
        return;
      }

      Animated.timing(progress, {
        toValue: isVisible ? 1 : 0,
        duration: isVisible ? 320 : 220,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isMounted && !isVisible) {
          onExited?.();
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [isVisible, onExited, progress]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: isWide ? 28 : 20,
        paddingTop: 12,
        paddingBottom: 20,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      }}>
      {children}
    </Animated.View>
  );
}

export function MessageCard({
  title,
  description,
  tone = "default",
  actionLabel,
  onActionPress,
}: {
  title: string;
  description: string;
  tone?: "default" | "warning" | "danger" | "success";
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  const colors = useListingColors();
  const accent =
    tone === "danger" ? colors.danger : tone === "warning" ? colors.warning : tone === "success" ? colors.success : colors.accent;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 22,
        borderCurve: "continuous",
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: accent,
      }}>
      <Text
        selectable
        style={{
          fontSize: 17,
          lineHeight: 22,
          fontWeight: "700",
          color: colors.title,
        }}>
        {title}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 14,
          lineHeight: 20,
          color: colors.body,
        }}>
        {description}
      </Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress}>
          <Text
            selectable
            style={{
              fontSize: 14,
              lineHeight: 18,
              fontWeight: "700",
              color: accent,
            }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
