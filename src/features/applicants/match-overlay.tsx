import { Modal, Pressable, View } from "react-native";

import { Photo } from "@/components/photo";
import { Text } from "@/components/text";
import { APPLICANTS } from "@/features/applicants/data";
import { radius, useTheme } from "@/theme/tokens";

export function MatchOverlay({
  matchName,
  onOpenChat,
  onKeepSwiping,
}: {
  matchName: string | null;
  onOpenChat: () => void;
  onKeepSwiping: () => void;
}) {
  const theme = useTheme();
  const matched = APPLICANTS.find((applicant) => applicant.name === matchName);

  if (!matchName) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onKeepSwiping}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          paddingHorizontal: 34,
          backgroundColor: theme.matchScrim,
        }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Photo
            stripe={8}
            style={{ width: 88, height: 88, borderRadius: 999, borderWidth: 3, borderColor: theme.matchSurface }}
          />
          <Photo
            uri={matched?.photoUri}
            stripe={8}
            style={{
              width: 88,
              height: 88,
              marginLeft: -22,
              borderRadius: 999,
              borderWidth: 3,
              borderColor: theme.matchSurface,
            }}
          />
        </View>

        <Text style={{ fontSize: 36, lineHeight: 40, fontWeight: "800", color: theme.matchText }}>It&apos;s a match</Text>

        <Text style={{ textAlign: "center", fontSize: 14, lineHeight: 22, fontWeight: "500", color: theme.matchTextMuted }}>
          {matchName} also wants the room. Say hej before someone else does.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenChat}
          style={({ pressed }) => ({
            alignSelf: "stretch",
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.button,
            borderCurve: "continuous",
            backgroundColor: theme.matchSurface,
            opacity: pressed ? 0.88 : 1,
          })}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: theme.onMatchSurface }}>Send a message</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onKeepSwiping}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(237,241,246,0.6)" }}>Keep swiping</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
