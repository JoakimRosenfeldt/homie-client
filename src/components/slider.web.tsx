import React from "react";

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
  const [focused, setFocused] = React.useState(false);

  return (
    <input
      aria-label={accessibilityLabel}
      aria-valuetext={formatValue?.(value)}
      disabled={disabled}
      max={max}
      min={min}
      onBlur={() => setFocused(false)}
      onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      onFocus={() => setFocused(true)}
      step={step}
      style={{
        accentColor: theme.accent,
        cursor: disabled ? "not-allowed" : "pointer",
        height: 44,
        margin: 0,
        outline: focused ? `3px solid ${theme.focus}` : undefined,
        outlineOffset: focused ? 2 : undefined,
        width: "100%",
      }}
      type="range"
      value={value}
    />
  );
}

export type { SliderProps } from "@/components/slider.types";
