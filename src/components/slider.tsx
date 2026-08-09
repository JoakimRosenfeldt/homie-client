import React from "react";
import { type LayoutChangeEvent, PanResponder, View } from "react-native";

import { useTheme } from "@/theme/tokens";

/**
 * Minimal range input. React Native has no bundled slider and the design only
 * needs a single stepped handle, so this stays a PanResponder rather than
 * pulling in a native module that would also need a web shim.
 */
export function Slider({
  min,
  max,
  step,
  value,
  onChange,
  accessibilityLabel,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const [width, setWidth] = React.useState(0);

  const widthRef = React.useRef(0);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    widthRef.current = next;
    setWidth(next);
  };

  const emit = React.useCallback(
    (x: number) => {
      const track = widthRef.current;
      if (track <= 0) {
        return;
      }

      const ratio = Math.min(1, Math.max(0, x / track));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChangeRef.current(Math.min(max, Math.max(min, stepped)));
    },
    [max, min, step],
  );

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => emit(event.nativeEvent.locationX),
        onPanResponderMove: (event) => emit(event.nativeEvent.locationX),
      }),
    [emit],
  );

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const thumbSize = 22;
  const filled = Math.min(1, Math.max(0, ratio)) * width;

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      onLayout={handleLayout}
      style={{ height: 34, justifyContent: "center" }}
      {...responder.panHandlers}>
      <View style={{ height: 5, borderRadius: 999, backgroundColor: theme.borderStrong, overflow: "hidden" }}>
        <View style={{ width: filled, height: 5, borderRadius: 999, backgroundColor: theme.accent }} />
      </View>

      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: Math.max(0, Math.min(width - thumbSize, filled - thumbSize / 2)),
          width: thumbSize,
          height: thumbSize,
          borderRadius: 999,
          backgroundColor: theme.accent,
          borderWidth: 3,
          borderColor: theme.card,
        }}
      />
    </View>
  );
}
