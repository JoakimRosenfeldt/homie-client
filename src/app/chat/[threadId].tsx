import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, CircleButton } from "@/components/button";
import { ArrowUpIcon, ChevronLeftIcon } from "@/components/icons";
import { Avatar } from "@/components/photo";
import { Overlay } from "@/components/screen";
import { Text } from "@/components/text";
import { getThread, MATCHED_ON_LABEL, type ChatMessage } from "@/features/matches/data";
import { useSession } from "@/features/nabo/store";
import { fontFamilyForWeight } from "@/theme/fonts";
import { radius, useTheme } from "@/theme/tokens";

export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<ScrollView>(null);

  const thread = getThread(threadId);
  const messages = thread ? session.messages[thread.id] ?? [] : [];

  const { markThreadRead } = session;
  React.useEffect(() => {
    if (thread) {
      markThreadRead(thread.id);
    }
  }, [markThreadRead, thread]);

  if (!thread) {
    return (
      <Overlay style={{ alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.ink }}>Conversation not found</Text>
        <Button label="Back to Matches" onPress={() => router.back()} style={{ paddingHorizontal: 24 }} />
      </Overlay>
    );
  }

  const send = () => {
    session.sendMessage(thread.id, draft);
    setDraft("");
  };

  return (
    <Overlay>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 11,
            paddingHorizontal: 16,
            paddingTop: insets.top + 12,
            paddingBottom: 12,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10}>
            <ChevronLeftIcon color={theme.ink} size={20} />
          </Pressable>

          <Avatar uri={thread.photoUri} size={38} />

          <View>
            <Text style={{ fontSize: 14.5, fontWeight: "600", color: theme.ink }}>{thread.name}</Text>
            <Text style={{ fontSize: 11, fontWeight: "500", color: theme.accent }}>{thread.status}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 18, gap: 10 }}>
          <View
            style={{
              alignSelf: "center",
              marginBottom: 6,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: theme.accentSoft,
            }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: theme.accent }}>{MATCHED_ON_LABEL}</Text>
          </View>

          {messages.map((message, index) => (
            <Bubble key={index} message={message} />
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 12,
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            placeholder="Message"
            placeholderTextColor={theme.faint}
            accessibilityLabel={`Message ${thread.name}`}
            style={{
              flex: 1,
              height: 44,
              paddingHorizontal: 16,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: theme.borderStrong,
              backgroundColor: theme.sunken,
              color: theme.ink,
              fontFamily: fontFamilyForWeight("500"),
              fontSize: 13.5,
            }}
          />

          <CircleButton accessibilityLabel="Send" size={44} tone="accent" onPress={send}>
            <ArrowUpIcon color={theme.onAccent} />
          </CircleButton>
        </View>
      </KeyboardAvoidingView>
    </Overlay>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const mine = message.from === "me";

  return (
    <View
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "78%",
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: radius.bubble,
        borderCurve: "continuous",
        backgroundColor: mine ? theme.accent : theme.card,
        borderWidth: mine ? 0 : 1,
        borderColor: theme.border,
      }}>
      <Text style={{ fontSize: 13.5, lineHeight: 20, fontWeight: "500", color: mine ? theme.onAccent : theme.ink }}>
        {message.text}
      </Text>
    </View>
  );
}
