import React from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme/tokens";

const ENTER_DURATION = 300;
const EXIT_DURATION = 210;
const USE_NATIVE_DRIVER = process.env.EXPO_OS !== "web";

export function SheetModal({
  visible,
  onRequestClose,
  closeLabel,
  sheetStyle,
  children,
}: React.PropsWithChildren<{
  visible: boolean;
  onRequestClose: () => void;
  closeLabel: string;
  sheetStyle?: StyleProp<ViewStyle>;
}>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(visible);
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    progress.stopAnimation();

    if (visible && !mounted) {
      setMounted(true);
      return;
    }

    if (visible) {
      progress.setValue(0);

      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_DURATION,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: USE_NATIVE_DRIVER,
      });
      animation.start();
      return () => animation.stop();
    }

    if (!mounted) return;

    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: EXIT_DURATION,
      easing: Easing.bezier(0.7, 0, 0.84, 0),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    const unmountTimer = setTimeout(() => setMounted(false), EXIT_DURATION + 60);
    animation.start(({ finished }) => {
      if (finished) {
        clearTimeout(unmountTimer);
        setMounted(false);
      }
    });
    return () => {
      clearTimeout(unmountTimer);
      animation.stop();
    };
  }, [mounted, progress, visible]);

  return (
    <Modal
      animationType="none"
      aria-modal
      onRequestClose={onRequestClose}
      role="dialog"
      statusBarTranslucent
      transparent
      visible={mounted}>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.scrim, opacity: progress, pointerEvents: "none" },
          ]}
        />
        <Animated.View
          accessibilityViewIsModal
          importantForAccessibility="yes"
          pointerEvents={visible ? "auto" : "none"}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            opacity: reduceMotion ? progress : 1,
          }}>
          <Pressable accessibilityLabel={closeLabel} onPress={onRequestClose} style={{ flex: 1 }} />
          <Animated.View
            style={[
              sheetStyle,
              {
                transform: [
                  {
                    translateY: reduceMotion
                      ? 0
                      : progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [48, 0],
                        }),
                  },
                ],
              },
            ]}>
            {children}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useReducedMotion() {
  const [enabled, setEnabled] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setEnabled);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
