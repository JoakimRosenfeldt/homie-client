import React from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/text";
import { radius, shadow, useTheme } from "@/theme/tokens";

const COMMIT_DISTANCE = 90;
const FLING_DISTANCE = 500;

export type SwipeReviewDecision = "pass" | "shortlist";

export type SwipeDeckHandle = {
  shortlist: () => void;
  pass: () => void;
};

type SwipeReviewDeckProps = React.PropsWithChildren<{
  itemId: string;
  accessibilityLabel: string;
  passLabel: string;
  shortlistLabel: string;
  onReview: (decision: SwipeReviewDecision) => boolean | void | Promise<boolean | void>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
}>;

export const SwipeReviewDeck = React.forwardRef<SwipeDeckHandle, SwipeReviewDeckProps>(
  function SwipeReviewDeck(
    {
      itemId,
      accessibilityLabel,
      passLabel,
      shortlistLabel,
      onReview,
      disabled = false,
      style,
      cardStyle,
      children,
    },
    ref,
  ) {
    const theme = useTheme();
    const reduceMotion = useReducedMotion();
    const translateX = useSharedValue(0);
    const committing = useSharedValue(false);
    const reviewRef = React.useRef(onReview);
    const disabledRef = React.useRef(disabled);
    reviewRef.current = onReview;
    disabledRef.current = disabled;

    const completeReview = React.useCallback(
      async (decision: SwipeReviewDecision) => {
        let succeeded = false;
        try {
          succeeded = (await reviewRef.current(decision)) !== false;
        } catch {
          succeeded = false;
        }
        if (!succeeded) {
          translateX.value = reduceMotion ? 0 : withSpring(0, { damping: 19, stiffness: 220 });
        }
        committing.value = false;
      },
      [committing, reduceMotion, translateX],
    );

    const commit = React.useCallback(
      (decision: SwipeReviewDecision) => {
        if (disabledRef.current || committing.value) return;
        committing.value = true;

        if (reduceMotion) {
          void completeReview(decision);
          return;
        }

        translateX.value = withTiming(
          decision === "shortlist" ? FLING_DISTANCE : -FLING_DISTANCE,
          { duration: 220, easing: Easing.bezier(0.2, 0.8, 0.3, 1) },
          (finished) => {
            if (finished) runOnJS(completeReview)(decision);
          },
        );
      },
      [committing, completeReview, reduceMotion, translateX],
    );

    React.useLayoutEffect(() => {
      translateX.value = 0;
      committing.value = false;
    }, [committing, itemId, translateX]);

    React.useImperativeHandle(
      ref,
      () => ({
        shortlist: () => commit("shortlist"),
        pass: () => commit("pass"),
      }),
      [commit],
    );

    const pan = React.useMemo(
      () =>
        Gesture.Pan()
          .enabled(!disabled)
          .activeOffsetX([-8, 8])
          .failOffsetY([-24, 24])
          .onUpdate((event) => {
            if (!committing.value) translateX.value = event.translationX;
          })
          .onEnd((event) => {
            const shouldCommit =
              Math.abs(event.translationX) >= COMMIT_DISTANCE || Math.abs(event.velocityX) >= FLING_DISTANCE;
            if (shouldCommit) {
              const direction = Math.abs(event.translationX) >= COMMIT_DISTANCE ? event.translationX : event.velocityX;
              runOnJS(commit)(direction > 0 ? "shortlist" : "pass");
            } else {
              translateX.value = reduceMotion ? 0 : withSpring(0, { damping: 19, stiffness: 220 });
            }
          })
          .onFinalize(() => {
            if (!committing.value && Math.abs(translateX.value) < COMMIT_DISTANCE) {
              translateX.value = reduceMotion ? 0 : withSpring(0, { damping: 19, stiffness: 220 });
            }
          }),
      [commit, committing, disabled, reduceMotion, translateX],
    );

    const cardAnimation = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { rotate: `${interpolate(translateX.value, [-FLING_DISTANCE, FLING_DISTANCE], [-18, 18])}deg` },
      ],
    }));
    const passAnimation = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [-COMMIT_DISTANCE, 0], [1, 0], Extrapolation.CLAMP),
    }));
    const shortlistAnimation = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [0, COMMIT_DISTANCE], [0, 1], Extrapolation.CLAMP),
    }));

    return (
      <View style={[{ minHeight: 320, marginTop: 4 }, style]}>
        <View
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 14,
            bottom: 0,
            borderRadius: radius.cardLg,
            borderCurve: "continuous",
            backgroundColor: theme.deckBack,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        />
        <View
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            left: 7,
            right: 7,
            top: 7,
            bottom: 0,
            borderRadius: radius.cardLg,
            borderCurve: "continuous",
            backgroundColor: theme.deckMid,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        />

        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityLabel={accessibilityLabel}
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                minHeight: 300,
                borderRadius: radius.cardLg,
                borderCurve: "continuous",
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                ...shadow.raised,
              },
              cardStyle,
              cardAnimation,
            ]}>
            {children}
            <Stamp label={passLabel} color={theme.badge} animation={passAnimation} side="right" />
            <Stamp label={shortlistLabel} color={theme.accent} animation={shortlistAnimation} side="left" />
          </Animated.View>
        </GestureDetector>
      </View>
    );
  },
);

function Stamp({
  label,
  color,
  animation,
  side,
}: {
  label: string;
  color: string;
  animation: StyleProp<ViewStyle>;
  side: "left" | "right";
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 22,
          left: side === "left" ? 20 : undefined,
          right: side === "right" ? 20 : undefined,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.tagLg,
          borderWidth: 2,
          borderColor: color,
          transform: [{ rotate: side === "right" ? "12deg" : "-12deg" }],
        },
        animation,
      ]}>
      <Text style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.04, color }}>{label}</Text>
    </Animated.View>
  );
}
