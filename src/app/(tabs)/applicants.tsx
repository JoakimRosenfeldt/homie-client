import { router } from "expo-router";
import React from "react";
import { View } from "react-native";

import { CircleButton } from "@/components/button";
import { CloseIcon, HeartIcon, PencilIcon } from "@/components/icons";
import { Screen, useTabBarHeight } from "@/components/screen";
import { Text } from "@/components/text";
import { MatchOverlay } from "@/features/applicants/match-overlay";
import { SwipeDeck, type SwipeDeckHandle } from "@/features/applicants/swipe-deck";
import { findThreadByName, THREADS } from "@/features/matches/data";
import { useSession } from "@/features/nabo/store";
import { OWN_LISTING_LABEL } from "@/features/rooms/data";
import { MONO_FONT } from "@/theme/fonts";
import { useTheme } from "@/theme/tokens";

export default function ApplicantsScreen() {
  const theme = useTheme();
  const session = useSession();
  const tabBarHeight = useTabBarHeight();
  const deckRef = React.useRef<SwipeDeckHandle>(null);

  const openMatchThread = () => {
    const thread = session.matchWith ? findThreadByName(session.matchWith) : undefined;
    session.dismissMatch();
    router.push(`/chat/${thread?.id ?? THREADS[0].id}`);
  };

  return (
    <Screen scroll={false} clearsTabBar={false} contentStyle={{ paddingBottom: 0 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 10, fontWeight: "600", letterSpacing: 1.4, color: theme.faint }}>
          {OWN_LISTING_LABEL.toUpperCase()}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 30, lineHeight: 33, fontWeight: "800", color: theme.ink }}>
          {session.remainingApplicants} people applied
        </Text>
      </View>

      <SwipeDeck ref={deckRef} applicant={session.topApplicant} onReview={session.reviewApplicant} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          paddingTop: 16,
          paddingBottom: tabBarHeight + 8,
        }}>
        <CircleButton accessibilityLabel="Pass" size={60} onPress={() => deckRef.current?.pass()}>
          <CloseIcon color={theme.muted} size={20} />
        </CircleButton>

        {/* The design reserves this for a private note; no behaviour defined yet. */}
        <CircleButton accessibilityLabel="Add a private note" size={48} onPress={() => {}}>
          <PencilIcon color={theme.muted} />
        </CircleButton>

        <CircleButton accessibilityLabel="Shortlist" size={60} tone="accent" onPress={() => deckRef.current?.shortlist()}>
          <HeartIcon color={theme.onAccent} size={22} filled />
        </CircleButton>
      </View>

      <MatchOverlay matchName={session.matchWith} onOpenChat={openMatchThread} onKeepSwiping={session.dismissMatch} />
    </Screen>
  );
}
