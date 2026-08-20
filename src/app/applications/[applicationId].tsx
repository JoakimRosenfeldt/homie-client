import { useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";

import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { Photo } from "@/components/photo";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { applicationStatusCopy } from "@/features/applications/model";
import { DataRow, FlowCard, FlowScreen, StatusBadge } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import { profileRows } from "@/features/profile/model";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export default function ApplicationDetailScreen() {
  const theme = useTheme();
  const flow = useProductFlow();
  const i18n = useI18n();
  const params = useLocalSearchParams<{
    applicationId: Id<"applications"> | Id<"applications">[];
  }>();
  const applicationId = Array.isArray(params.applicationId) ? params.applicationId[0] : params.applicationId;
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (flow.applicationsUnavailableOffline) {
    return (
      <FlowScreen title={i18n.t("application.title")}>
        <SystemState kind="offline" message={i18n.t("application.offlineLoad")} />
      </FlowScreen>
    );
  }

  if (flow.loading) {
    return (
      <FlowScreen title={i18n.t("application.title")}>
        <SystemState kind="loading" message={i18n.t("application.loading")} />
      </FlowScreen>
    );
  }

  const application = flow.applications.find((item) => item.id === applicationId);
  if (!application) {
    return (
      <FlowScreen
        title={i18n.t("application.notFoundTitle")}
        intro={i18n.t("application.notFoundBody")}>
        <Button label={i18n.t("application.back")} href="/applications" replace />
      </FlowScreen>
    );
  }

  const status = applicationStatusCopy(application.status, i18n.t);
  const conversation = flow.conversations.find((item) => item.applicationId === application.id);

  const withdraw = async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    setError(null);
    try {
      const withdrawn = await flow.withdrawApplication(application.id);
      if (!withdrawn) setError(i18n.t("application.withdrawUnavailable"));
      else setConfirmWithdraw(false);
    } catch (withdrawError) {
      setError(
        withdrawError instanceof Error
          ? withdrawError.message
          : i18n.t("application.withdrawError"),
      );
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <FlowScreen title={application.listingTitle} intro={i18n.t("application.snapshotIntro")}>
      {flow.connection === "offline" ? (
        <SystemState kind="offline" message={i18n.t("application.offline")} />
      ) : null}

      <FlowCard>
        <StatusBadge label={status.label} accent={status.tone === "accent"} />
        <Heading level={2} style={{ fontSize: 18, lineHeight: 23, fontWeight: "800", color: theme.ink }}>
          {status.detail}
        </Heading>
        <DataRow
          label={i18n.t("application.submitted")}
          value={i18n.formatDate(application.submittedAt, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        />
        {application.listingLocation ? (
          <DataRow label={i18n.t("application.location")} value={application.listingLocation} />
        ) : null}
        {application.profileSnapshot.kind === "sharedHome" ? (
          <>
            <DataRow label={i18n.t("application.name")} value={application.profileSnapshot.name} />
            {application.profileSnapshot.photos.map((photo, index) => (
              <Photo
                key={photo.storageId}
                uri={photo.url ?? undefined}
                accessibilityLabel={i18n.t("profile.photoLabel", {
                  index: i18n.formatNumber(index + 1),
                  count: i18n.formatNumber(
                    application.profileSnapshot.kind === "sharedHome"
                      ? application.profileSnapshot.photos.length
                      : 0,
                  ),
                })}
                style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 14 }}
              />
            ))}
          </>
        ) : null}
        {profileRows(application.profileSnapshot, i18n.t, i18n.formatCurrency).map((row) => (
          <DataRow key={row.label} label={row.label} value={row.value} />
        ))}
        <DataRow
          label={i18n.t("application.note")}
          value={application.note || i18n.t("application.noNote")}
        />
      </FlowCard>

      {application.status === "shortlisted" && conversation ? (
        <Button
          label={i18n.t("application.openConversation")}
          href={{ pathname: "/inbox/[threadId]", params: { threadId: conversation.id } }}
        />
      ) : null}

      {application.status === "pending" && !confirmWithdraw ? (
        <Button
          label={i18n.t("application.withdraw")}
          variant="surface"
          onPress={() => setConfirmWithdraw(true)}
        />
      ) : null}

      {application.status === "pending" && confirmWithdraw ? (
        <FlowCard>
          <Heading level={2} style={{ fontSize: 18, fontWeight: "800", color: theme.ink }}>
            {i18n.t("application.withdrawTitle")}
          </Heading>
          <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
            {i18n.t("application.withdrawBody")}
          </Text>
          <View style={{ gap: 8 }}>
            <Button
              label={i18n.t("application.keep")}
              variant="surface"
              onPress={() => setConfirmWithdraw(false)}
            />
            <Button
              disabled={withdrawing || flow.connection === "offline"}
              label={
                withdrawing
                  ? i18n.t("application.withdrawing")
                  : i18n.t("application.confirmWithdraw")
              }
              onPress={() => void withdraw()}
            />
          </View>
        </FlowCard>
      ) : null}

      {error ? <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>{error}</Text> : null}
    </FlowScreen>
  );
}
