import { router } from "expo-router";
import React from "react";
import { TextInput, View } from "react-native";

import { Button, CircleButton } from "@/components/button";
import { CloseIcon, HeartIcon, PencilIcon } from "@/components/icons";
import { Screen, useTabBarHeight } from "@/components/screen";
import { SheetModal } from "@/components/sheet-modal";
import { Text } from "@/components/text";
import { MatchOverlay } from "@/features/applicants/match-overlay";
import { SwipeDeck, type SwipeDeckHandle } from "@/features/applicants/prototype-swipe-deck";
import { findThreadByName, THREADS } from "@/features/matches/data";
import { useSession } from "@/features/nabo/store";
import { OWN_LISTING_LABEL } from "@/features/rooms/data";
import { fontFamilyForWeight, MONO_FONT } from "@/theme/fonts";
import { radius, useTheme } from "@/theme/tokens";

export default function ApplicantsScreen() {
  const theme = useTheme();
  const session = useSession();
  const tabBarHeight = useTabBarHeight();
  const deckRef = React.useRef<SwipeDeckHandle>(null);
  const [noteApplicant, setNoteApplicant] = React.useState<{ id: string; name: string } | null>(null);
  const [noteDraft, setNoteDraft] = React.useState("");

  const openNote = () => {
    const applicant = session.topApplicant;
    setNoteApplicant({ id: applicant.id, name: applicant.name });
    setNoteDraft(session.privateNotes[applicant.id] ?? "");
  };

  const saveNote = () => {
    if (!noteApplicant) return;
    session.setPrivateNote(noteApplicant.id, noteDraft);
    session.notify(noteDraft.trim() ? `Private note saved for ${noteApplicant.name}.` : "Private note removed.");
    setNoteApplicant(null);
  };

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
          {session.remainingApplicants} {session.remainingApplicants === 1 ? "person" : "people"} applied
        </Text>
      </View>

      <SwipeDeck
        ref={deckRef}
        applicant={session.topApplicant}
        onReview={session.reviewApplicant}
        onOpenDetails={() => router.push(`/applicants/${session.topApplicant.id}`)}
      />

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

        <CircleButton accessibilityLabel="Add a private note" size={48} onPress={openNote}>
          <PencilIcon color={session.privateNotes[session.topApplicant.id] ? theme.accent : theme.muted} />
        </CircleButton>

        <CircleButton accessibilityLabel="Shortlist" size={60} tone="accent" onPress={() => deckRef.current?.shortlist()}>
          <HeartIcon color={theme.onAccent} size={22} filled />
        </CircleButton>
      </View>

      <MatchOverlay matchName={session.matchWith} onOpenChat={openMatchThread} onKeepSwiping={session.dismissMatch} />

      <SheetModal
        visible={noteApplicant !== null}
        onRequestClose={() => setNoteApplicant(null)}
        closeLabel="Close private note"
        sheetStyle={{
          gap: 14,
          padding: 20,
          paddingBottom: 28,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          backgroundColor: theme.background,
        }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.ink }}>
          Note about {noteApplicant?.name}
        </Text>
        <Text style={{ fontSize: 12.5, lineHeight: 19, color: theme.muted }}>
          Only you can see this note.
        </Text>
        <TextInput
          autoFocus
          multiline
          value={noteDraft}
          onChangeText={setNoteDraft}
          placeholder="Add a reminder or question"
          placeholderTextColor={theme.faint}
          accessibilityLabel="Private note"
          style={{
            minHeight: 112,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.borderStrong,
            backgroundColor: theme.card,
            color: theme.ink,
            fontFamily: fontFamilyForWeight("500"),
            fontSize: 14,
            lineHeight: 21,
            textAlignVertical: "top",
          }}
        />
        <Button label="Save private note" onPress={saveNote} />
      </SheetModal>
    </Screen>
  );
}
