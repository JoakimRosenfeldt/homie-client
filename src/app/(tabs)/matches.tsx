import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { Avatar } from "@/components/photo";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { APPLICANTS } from "@/features/applicants/data";
import { findThreadByName, THREADS, type Thread } from "@/features/matches/data";
import { useSession } from "@/features/nabo/store";
import { useTheme } from "@/theme/tokens";

export default function MatchesScreen() {
  const theme = useTheme();
  const session = useSession();

  const openThread = (threadId: string) => router.push(`/chat/${threadId}`);

  const newMatches = APPLICANTS.filter((applicant) => applicant.match);

  return (
    <Screen contentStyle={{ gap: 0 }}>
      <Text style={{ paddingHorizontal: 20, paddingTop: 10, fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
        Matches
      </Text>
      <Text style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, fontSize: 12.5, fontWeight: "500", color: theme.faint }}>
        You shortlisted them, they want the room.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 18 }}>
        {newMatches.map((applicant) => (
          <Pressable
            key={applicant.id}
            accessibilityRole="button"
            accessibilityLabel={`Open chat with ${applicant.name}`}
            onPress={() => openThread(findThreadByName(applicant.name)?.id ?? THREADS[0].id)}
            style={({ pressed }) => ({ width: 74, alignItems: "center", gap: 7, opacity: pressed ? 0.8 : 1 })}>
            <Avatar uri={applicant.photoUri} size={66} ring />
            <Text style={{ fontSize: 11.5, fontWeight: "600", color: theme.ink }}>{applicant.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
        {THREADS.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            unread={session.isThreadUnread(thread.id)}
            onPress={() => openThread(thread.id)}
          />
        ))}
      </View>
    </Screen>
  );
}

function ThreadRow({ thread, unread, onPress }: { thread: Thread; unread: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${thread.name}. ${thread.last}${unread ? ". Unread" : ""}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.divider,
        backgroundColor: pressed ? theme.hover : "transparent",
      })}>
      <Avatar uri={thread.photoUri} size={52} />

      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontSize: 14.5, fontWeight: "600", color: theme.ink }}>{thread.name}</Text>
          <Text style={{ fontSize: 11, fontWeight: "500", color: theme.faint }}>{thread.time}</Text>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "500", color: theme.muted }}>
          {thread.last}
        </Text>
      </View>

      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: unread ? theme.accent : "transparent",
        }}
      />
    </Pressable>
  );
}
