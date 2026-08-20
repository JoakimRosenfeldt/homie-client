import React from "react";
import { Platform } from "react-native";

import type { Palette } from "@/theme/tokens";

export const MINIMUM_TARGET_SIZE = 44;

type CompositeKeyboardTarget = {
  id: string;
  onPress: () => void;
};

type WebKeyboardEvent = {
  nativeEvent: { key?: string };
  preventDefault: () => void;
};

type FocusRingStyle = {
  outlineColor: string;
  outlineOffset: number;
  outlineStyle: "solid";
  outlineWidth: number;
};

export function useFocusRing(theme: Palette) {
  const [focused, setFocused] = React.useState(false);

  const focusStyle: FocusRingStyle | undefined = focused
    ? {
        outlineColor: theme.focus,
        outlineOffset: 2,
        outlineStyle: "solid",
        outlineWidth: 3,
      }
    : undefined;

  return {
    focusStyle,
    onBlur: () => setFocused(false),
    onFocus: () => setFocused(true),
  };
}

export function useCompositeItemKeyboard({
  id,
  selected,
  onPress,
  previous,
  next,
}: {
  id: string;
  selected?: boolean;
  onPress: () => void;
  previous?: CompositeKeyboardTarget;
  next?: CompositeKeyboardTarget;
}) {
  const moveTo = React.useCallback((target: CompositeKeyboardTarget | undefined) => {
    if (!target) return;
    target.onPress();
    if (typeof document !== "undefined") document.getElementById(target.id)?.focus();
  }, []);

  const onKeyDown = React.useCallback(
    (event: WebKeyboardEvent) => {
      const key = event.nativeEvent.key;
      if (key === " " || key === "Spacebar") {
        event.preventDefault();
        onPress();
      } else if ((key === "ArrowLeft" || key === "ArrowUp") && previous) {
        event.preventDefault();
        moveTo(previous);
      } else if ((key === "ArrowRight" || key === "ArrowDown") && next) {
        event.preventDefault();
        moveTo(next);
      }
    },
    [moveTo, next, onPress, previous],
  );

  return Platform.OS === "web"
    ? {
        id,
        onKeyDown,
        tabIndex: previous || next ? (selected ? (0 as const) : (-1 as const)) : (0 as const),
      }
    : {};
}
