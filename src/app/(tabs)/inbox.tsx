import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { useFocusRing } from "@/components/interaction";
import { Screen } from "@/components/screen";
import { SystemState } from "@/components/system-state";
import { Text } from "@/components/text";
import { EmptyState, FlowCard, StatusBadge } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import type { Conversation } from "@/features/inbox/model";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export default function InboxScreen() {
  const theme = useTheme();
  const flow = useProductFlow();
  const { t } = useI18n();

  if (flow.conversationsUnavailableOffline) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="offline" message={t("inbox.offlineLoad")} />
      </Screen>
    );
  }

  if (flow.loading) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="loading" message={t("inbox.loading")} />
      </Screen>
    );
  }

  if (flow.identityError) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="denied" title={t("inbox.unavailable")} message={flow.identityError} />
      </Screen>
    );
  }

  return (
    <Screen paddingHorizontal={20} contentStyle={{ gap: 16 }}>
      <View style={{ gap: 6, paddingTop: 10 }}>
        <Text accessibilityRole="header" selectable style={{ fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
          {t("inbox.title")}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
          {t("inbox.intro")}
        </Text>
      </View>

      {flow.connection === "offline" ? (
        <SystemState kind="offline" message={t("inbox.offline")} />
      ) : null}

      {flow.conversations.length === 0 ? (
        <EmptyState
          title={t("inbox.emptyTitle")}
          body={t("inbox.emptyBody")}
          action={{ label: t("inbox.reviewApplicants"), href: "/host/applications" }}
        />
      ) : flow.conversations.map((conversation) => (
        <ConversationCard key={conversation.id} conversation={conversation} />
      ))}
    </Screen>
  );
}

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const { t } = useI18n();

  return (
    <Link
      href={{ pathname: "/inbox/[threadId]", params: { threadId: conversation.id } }}
      asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t("inbox.openLabel", {
          name: conversation.participantName,
          unread: conversation.unread ? t("inbox.unreadSuffix") : "",
        })}
        onBlur={focus.onBlur}
        onFocus={focus.onFocus}
        style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }, focus.focusStyle]}>
        <FlowCard>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text selectable numberOfLines={1} style={{ fontSize: 18, fontWeight: "800", color: theme.ink }}>
                {conversation.participantName}
              </Text>
              <Text selectable numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>
                {[conversation.listingTitle, conversation.listingLocation].filter(Boolean).join(" · ")}
              </Text>
            </View>
            {conversation.participantDeleted ? (
              <StatusBadge label={t("inbox.deletedParticipant")} />
            ) : conversation.blockState === "blockedByMe" || conversation.blockState === "mutual" ? (
              <StatusBadge label={t("inbox.blockedByMe")} />
            ) : conversation.blockState === "blockedByThem" ? (
              <StatusBadge label={t("inbox.blockedByThem")} />
            ) : conversation.unread ? (
              <StatusBadge label={t("inbox.new")} accent />
            ) : null}
          </View>
          <Text selectable numberOfLines={2} style={{ fontSize: 14, lineHeight: 20, color: theme.body }}>
            {conversation.lastMessagePreview ?? t("inbox.noMessage")}
          </Text>
        </FlowCard>
      </Pressable>
    </Link>
  );
}
