import NativeSlider from "@react-native-community/slider";
import { View } from "react-native";

import { MINIMUM_TARGET_SIZE, useFocusRing } from "@/components/interaction";
import type { SliderProps } from "@/components/slider.types";
import { useTheme } from "@/theme/tokens";

export function Slider({
  min,
  max,
  step,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  formatValue,
}: SliderProps) {
  const theme = useTheme();
  const focus = useFocusRing(theme);

  return (
    <View style={[{ minHeight: MINIMUM_TARGET_SIZE, justifyContent: "center" }, focus.focusStyle]}>
      <NativeSlider
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: value, text: formatValue?.(value) }}
        disabled={disabled}
        maximumTrackTintColor={theme.controlBorder}
        maximumValue={max}
        minimumTrackTintColor={theme.accent}
        minimumValue={min}
        onBlur={focus.onBlur}
        onFocus={focus.onFocus}
        onValueChange={onChange}
        step={step}
        style={{ width: "100%", height: MINIMUM_TARGET_SIZE }}
        thumbTintColor={theme.accent}
        tapToSeek
        value={value}
      />
    </View>
  );
}

export type { SliderProps } from "@/components/slider.types";
