import React from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, View } from "react-native";

import { Text } from "@/components/text";
import { ApplicantCard } from "@/features/applicants/applicant-card";
import type { Applicant } from "@/features/applicants/data";
import { radius, shadow, useTheme } from "@/theme/tokens";

/** Horizontal travel that commits the card, matching the design's threshold. */
const COMMIT_DISTANCE = 90;
const FLING_DISTANCE = 500;

export type SwipeDeckHandle = {
  shortlist: () => void;
  pass: () => void;
};

export const SwipeDeck = React.forwardRef<
  SwipeDeckHandle,
  { applicant: Applicant; onReview: (shortlisted: boolean) => void; onOpenDetails: () => void }
>(
  function SwipeDeck({ applicant, onReview, onOpenDetails }, ref) {
    const theme = useTheme();
    const dx = React.useRef(new Animated.Value(0)).current;
    const [reduceMotion, setReduceMotion] = React.useState(false);
    const reviewRef = React.useRef(onReview);
    reviewRef.current = onReview;

    React.useEffect(() => {
      let active = true;
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        if (active) setReduceMotion(enabled);
      });
      const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
      return () => {
        active = false;
        subscription.remove();
      };
    }, []);

    // A touch during the fling would call `dx.setValue`, which cancels the
    // in-flight animation and would otherwise drop the review on the floor.
    // The deck ignores gestures until the commit has been handed upwards.
    const committingRef = React.useRef(false);

    const commit = React.useCallback(
      (shortlisted: boolean) => {
        if (committingRef.current) {
          return;
        }

        committingRef.current = true;
        let finishTimer: ReturnType<typeof setTimeout> | null = null;

        const review = () => {
          if (!committingRef.current) return;
          if (finishTimer) clearTimeout(finishTimer);
          committingRef.current = false;
          reviewRef.current(shortlisted);
        };

        if (reduceMotion) {
          review();
          return;
        }

        Animated.timing(dx, {
          toValue: shortlisted ? FLING_DISTANCE : -FLING_DISTANCE,
          duration: 220,
          easing: Easing.bezier(0.2, 0.8, 0.3, 1),
          // PanResponder feeds this value from JS, so the native driver is
          // unavailable for the programmatic fling too.
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) review();
        });
        finishTimer = setTimeout(review, 280);
      },
      [dx, reduceMotion],
    );

    // Recentre for the incoming applicant before paint, so the outgoing card is
    // never shown back at centre. Resetting before the review would do exactly
    // that, since `setValue` hits the view synchronously but state does not.
    React.useLayoutEffect(() => {
      dx.setValue(0);
    }, [applicant.id, dx]);

    React.useImperativeHandle(ref, () => ({ shortlist: () => commit(true), pass: () => commit(false) }), [commit]);

    const responder = React.useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (_event, gesture) =>
            !committingRef.current && Math.abs(gesture.dx) > 6,
          onPanResponderMove: (_event, gesture) => dx.setValue(gesture.dx),
          onPanResponderRelease: (_event, gesture) => {
            if (Math.abs(gesture.dx) > COMMIT_DISTANCE) {
              commit(gesture.dx > 0);
              return;
            }

            Animated.spring(dx, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
          },
          onPanResponderTerminate: () => {
            Animated.spring(dx, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
          },
        }),
      [commit, dx],
    );

    const rotate = dx.interpolate({
      inputRange: [-FLING_DISTANCE, 0, FLING_DISTANCE],
      // The design rotates by dx / 18 degrees.
      outputRange: [`${-FLING_DISTANCE / 18}deg`, "0deg", `${FLING_DISTANCE / 18}deg`],
    });

    const shortlistOpacity = dx.interpolate({
      inputRange: [0, COMMIT_DISTANCE],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    const passOpacity = dx.interpolate({
      inputRange: [-COMMIT_DISTANCE, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={{ flex: 1, marginHorizontal: 16, marginTop: 16 }}>
        <View
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 14,
            bottom: 8,
            borderRadius: radius.cardLg,
            borderCurve: "continuous",
            backgroundColor: theme.deckBack,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 7,
            right: 7,
            top: 7,
            bottom: 4,
            borderRadius: radius.cardLg,
            borderCurve: "continuous",
            backgroundColor: theme.deckMid,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        />

        <Animated.View
          {...responder.panHandlers}
          accessibilityLabel={`${applicant.name}, ${applicant.age}. ${applicant.role}. Swipe right to shortlist, left to pass.`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.card,
            borderRadius: radius.cardLg,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: theme.border,
            // Deliberately not clipped: iOS would drop the card's shadow. The
            // photo rounds its own top corners instead.
            transform: [{ translateX: dx }, { rotate }],
            ...shadow.raised,
          }}>
          <ApplicantCard applicant={applicant} onPress={onOpenDetails} />

          <Stamp label="PASS" color={theme.badge} opacity={passOpacity} side="right" />
          <Stamp label="SHORTLIST" color={theme.accent} opacity={shortlistOpacity} side="left" />
        </Animated.View>
      </View>
    );
  },
);

function Stamp({
  label,
  color,
  opacity,
  side,
}: {
  label: string;
  color: string;
  opacity: Animated.AnimatedInterpolation<number>;
  side: "left" | "right";
}) {
  return (
    <Animated.View
      style={{
        pointerEvents: "none",
        position: "absolute",
        top: 22,
        left: side === "left" ? 20 : undefined,
        right: side === "right" ? 20 : undefined,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radius.tagLg,
        borderWidth: 2,
        borderColor: color,
        opacity,
        transform: [{ rotate: side === "right" ? "12deg" : "-12deg" }],
      }}>
      <Text style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.04, color }}>{label}</Text>
    </Animated.View>
  );
}
