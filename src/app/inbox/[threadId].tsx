import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { useFocusRing } from "@/components/interaction";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { FlowCard, FlowScreen, StatusBadge } from "@/features/applications/flow-ui";
import { useConversationMessages, useProductFlow } from "@/features/applications/store";
import type { Message } from "@/features/inbox/model";
import { useI18n } from "@/i18n";
import { fontFamilyForWeight } from "@/theme/fonts";
import { radius, useTheme } from "@/theme/tokens";

export default function InboxThreadScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const flow = useProductFlow();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    threadId: Id<"conversations"> | Id<"conversations">[];
  }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const messageResult = useConversationMessages(threadId ?? null);
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [blocking, setBlocking] = React.useState(false);
  const [unblocking, setUnblocking] = React.useState(false);
  const markedRead = React.useRef<Id<"conversations"> | null>(null);
  const backFocus = useFocusRing(theme);
  const inputFocus = useFocusRing(theme);

  const conversation = flow.conversations.find((item) => item.id === threadId);

  React.useEffect(() => {
    if (
      !conversation?.unread ||
      flow.connection === "offline" ||
      markedRead.current === conversation.id
    ) {
      return;
    }
    markedRead.current = conversation.id;
    void flow.markConversationRead(conversation.id).catch((markError: unknown) => {
      markedRead.current = null;
      setError(markError instanceof Error ? markError.message : t("inbox.thread.readError"));
    });
  }, [conversation?.id, conversation?.unread, flow, t]);

  if (flow.conversationsUnavailableOffline || messageResult.coldOffline) {
    return (
      <FlowScreen title={t("inbox.thread.title")}>
        <SystemState kind="offline" message={t("inbox.thread.offlineLoad")} />
      </FlowScreen>
    );
  }

  if (flow.loading || messageResult.loading) {
    return (
      <FlowScreen title={t("inbox.thread.title")}>
        <SystemState kind="loading" message={t("inbox.thread.loading")} />
      </FlowScreen>
    );
  }

  if (!conversation) {
    return (
      <FlowScreen
        title={t("inbox.thread.notFoundTitle")}
        intro={t("inbox.thread.notFoundBody")}>
        <Button label={t("inbox.thread.back")} href="/inbox" replace />
      </FlowScreen>
    );
  }

  const send = async () => {
    if (sending) return;
    if (!draft.trim()) {
      setError(t("inbox.thread.emptyError"));
      return;
    }
    if (flow.connection === "offline") {
      setError(t("inbox.thread.offlineError"));
      return;
    }

    setSending(true);
    setError(null);
    try {
      const result = await flow.sendMessage(conversation.id, draft);
      switch (result.kind) {
        case "sent":
          setDraft("");
          break;
        case "empty":
          setError(t("inbox.thread.emptyError"));
          break;
        case "blocked":
          setError(t("inbox.thread.blockedError"));
          break;
        case "notFound":
          setError(t("inbox.thread.notFoundError"));
          break;
        default: {
          const _exhaustive: never = result;
          void _exhaustive;
        }
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t("inbox.thread.sendError"));
    } finally {
      setSending(false);
    }
  };

  const block = async () => {
    if (blocking) return;
    setBlocking(true);
    setError(null);
    try {
      await flow.blockConversation(conversation.id);
      setConfirmBlock(false);
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : t("inbox.thread.blockError"));
    } finally {
      setBlocking(false);
    }
  };

  const unblock = async () => {
    if (unblocking) return;
    setUnblocking(true);
    setError(null);
    try {
      const unblocked = await flow.unblockConversation(conversation.id);
      if (!unblocked) setError(t("inbox.thread.unblockError"));
    } catch (unblockError) {
      setError(
        unblockError instanceof Error ? unblockError.message : t("inbox.thread.unblockError"),
      );
    } finally {
      setUnblocking(false);
    }
  };

  const blockedByMe =
    conversation.blockState === "blockedByMe" || conversation.blockState === "mutual";
  const blockedByThem =
    conversation.blockState === "blockedByThem" || conversation.blockState === "mutual";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            width: "100%",
            maxWidth: 720,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingTop: insets.top + 10,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.card,
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("inbox.thread.back")}
            onBlur={backFocus.onBlur}
            onFocus={backFocus.onFocus}
            onPress={() => router.back()}
            style={({ pressed }) => [
              {
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              },
              backFocus.focusStyle,
            ]}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: theme.accent }}>
              ‹ {t("common.back")}
            </Text>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Heading level={1} numberOfLines={1} style={{ fontSize: 17, fontWeight: "800", color: theme.ink }}>
              {conversation.participantName}
            </Heading>
            <Text selectable numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>
              {[conversation.listingTitle, conversation.listingLocation].filter(Boolean).join(" · ")}
            </Text>
          </View>
          {conversation.participantDeleted ? (
            <StatusBadge label={t("inbox.deletedParticipant")} />
          ) : blockedByMe ? (
            <StatusBadge label={t("inbox.blockedByMe")} />
          ) : blockedByThem ? (
            <StatusBadge label={t("inbox.blockedByThem")} />
          ) : null}
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={{ width: "100%", maxWidth: 720, alignSelf: "center", gap: 10, padding: 16 }}>
          {flow.connection === "offline" ? (
            <SystemState kind="offline" message={t("inbox.thread.cached")} />
          ) : null}

          <FlowCard>
            <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
              {t("inbox.thread.available")}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                label={t("inbox.thread.report")}
                variant="surface"
                href={{
                  pathname: "/report",
                  params: {
                    conversationId: conversation.id,
                    targetLabel: conversation.participantName,
                  },
                }}
                style={{ flex: 1 }}
              />
              {!blockedByMe && !conversation.participantDeleted ? (
                <Button
                  label={t("inbox.thread.block")}
                  variant="surface"
                  onPress={() => setConfirmBlock(true)}
                  style={{ flex: 1 }}
                />
              ) : blockedByMe ? (
                <Button
                  disabled={unblocking || flow.connection === "offline"}
                  label={
                    unblocking ? t("inbox.thread.unblocking") : t("inbox.thread.unblock")
                  }
                  variant="surface"
                  onPress={() => void unblock()}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
          </FlowCard>

          {confirmBlock ? (
            <FlowCard>
              <Heading level={2} style={{ fontSize: 17, fontWeight: "800", color: theme.ink }}>
                {t("inbox.thread.blockTitle", { name: conversation.participantName })}
              </Heading>
              <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
                {t("inbox.thread.blockBody")}
              </Text>
              <Button
                disabled={blocking}
                label={t("common.cancel")}
                variant="surface"
                onPress={() => setConfirmBlock(false)}
              />
              <Button
                disabled={blocking || flow.connection === "offline"}
                label={
                  blocking ? t("inbox.thread.blocking") : t("inbox.thread.confirmBlock")
                }
                onPress={() => void block()}
              />
            </FlowCard>
          ) : null}

          {conversation.blockState !== "none" ? (
            <FlowCard>
              <Text accessibilityRole="alert" selectable style={{ fontSize: 14, lineHeight: 21, color: theme.body }}>
                {conversation.blockState === "blockedByMe"
                  ? t("inbox.thread.blockedByMe")
                  : conversation.blockState === "blockedByThem"
                    ? t("inbox.thread.blockedByThem")
                    : t("inbox.thread.mutualBlock")}
              </Text>
            </FlowCard>
          ) : null}

          {conversation.participantDeleted ? (
            <FlowCard>
              <Text accessibilityRole="alert" selectable style={{ fontSize: 14, lineHeight: 21, color: theme.body }}>
                {t("inbox.deletedMessage")}
              </Text>
            </FlowCard>
          ) : null}

          {!conversation.canSend &&
          !conversation.participantDeleted &&
          conversation.blockState === "none" ? (
            <FlowCard>
              <Text accessibilityRole="alert" selectable style={{ fontSize: 14, lineHeight: 21, color: theme.body }}>
                {t("inbox.thread.closed")}
              </Text>
            </FlowCard>
          ) : null}

          {error ? (
            <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>
              {error}
            </Text>
          ) : null}

          {messageResult.messages.length === 0 ? (
            <SystemState
              kind="empty"
              title={t("inbox.thread.noMessagesTitle")}
              message={t("inbox.thread.noMessagesBody")}
            />
          ) : (
            messageResult.messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </ScrollView>

        {conversation.canSend ? (
          <View
            style={{
              width: "100%",
              maxWidth: 720,
              alignSelf: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 12) + 10,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.card,
            }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              <TextInput
                accessibilityLabel={t("inbox.thread.messageLabel", {
                  name: conversation.participantName,
                })}
                value={draft}
                onChangeText={setDraft}
                returnKeyType="send"
                maxLength={4000}
                multiline
                placeholder={t("inbox.thread.messagePlaceholder")}
                placeholderTextColor={theme.faint}
                onBlur={inputFocus.onBlur}
                onFocus={inputFocus.onFocus}
                style={[
                  {
                    flex: 1,
                    maxHeight: 120,
                    minHeight: 48,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: radius.field,
                    borderWidth: 1,
                    borderColor: theme.borderStrong,
                    backgroundColor: theme.sunken,
                    color: theme.ink,
                    fontFamily: fontFamilyForWeight("500"),
                    fontSize: 16,
                  },
                  inputFocus.focusStyle,
                ]}
              />
              <Button
                disabled={sending || flow.connection === "offline"}
                label={sending ? t("inbox.thread.sending") : t("inbox.thread.send")}
                onPress={() => void send()}
                height={48}
                style={{ paddingHorizontal: 18 }}
              />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const theme = useTheme();
  const i18n = useI18n();
  const mine = message.from === "me";
  return (
    <View
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "82%",
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: radius.bubble,
        borderCurve: "continuous",
        borderWidth: mine ? 0 : 1,
        borderColor: theme.border,
        backgroundColor: mine ? theme.accent : theme.card,
      }}>
      <Text selectable style={{ fontSize: 14, lineHeight: 20, color: mine ? theme.onAccent : theme.ink }}>
        {message.body}
      </Text>
      <Text
        selectable
        style={{
          marginTop: 4,
          fontSize: 10,
          color: mine ? theme.onAccent : theme.muted,
          opacity: 0.82,
        }}>
        {i18n.formatDate(message.sentAt, { timeStyle: "short" })}
      </Text>
    </View>
  );
}
