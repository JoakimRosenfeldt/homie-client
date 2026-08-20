import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";

import { Button } from "@/components/button";
import { Photo } from "@/components/photo";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { applicationStatusCopy } from "@/features/applications/model";
import { DataRow, FlowCard, FlowScreen, StatusBadge } from "@/features/applications/flow-ui";
import { useBackendConnection } from "@/features/backend/convex-provider";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import {
  api,
  applicantName,
  applicantProfileRows,
  applicationStatusDetail,
  type HostApplication,
} from "@/features/host/backend-model";
import { useI18n } from "@/i18n";
import { radius, useTheme } from "@/theme/tokens";

export default function HostApplicantDetailScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
  const params = useLocalSearchParams<{ applicantId?: string | string[] }>();
  const applicantId = Array.isArray(params.applicantId) ? params.applicantId[0] : params.applicantId;
  const decide = useMutation(api.applications.decide);
  const undoDecision = useMutation(api.applications.undoDecision);
  const applications = useQuery(
    api.applications.listForHost,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const listings = useQuery(
    api.listings.listMine,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const conversations = useQuery(
    api.conversations.listMine,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const [busyAction, setBusyAction] = React.useState<"decline" | "shortlist" | "undo" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const mutationInFlight = React.useRef(false);

  const application = applications?.find((item) => String(item._id) === applicantId);

  const review = async (target: HostApplication, decision: "shortlisted" | "declined") => {
    if (identity.kind !== "ready" || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusyAction(decision === "shortlisted" ? "shortlist" : "decline");
    setError(null);
    try {
      await decide({ applicationId: target._id, ownerKey: identity.ownerKey, decision });
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
    } finally {
      mutationInFlight.current = false;
      setBusyAction(null);
    }
  };

  const undo = async (target: HostApplication) => {
    if (identity.kind !== "ready" || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusyAction("undo");
    setError(null);
    try {
      await undoDecision({ applicationId: target._id, ownerKey: identity.ownerKey });
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
    } finally {
      mutationInFlight.current = false;
      setBusyAction(null);
    }
  };

  if (identity.kind === "loading") {
    return (
      <FlowScreen title={i18n.t("hostApplicant.title")}>
        <SystemState kind="loading" title={i18n.t("hostApplications.deviceLoading")} />
      </FlowScreen>
    );
  }

  if (identity.kind === "error") {
    return (
      <FlowScreen title={i18n.t("hostApplicant.title")}>
        <SystemState kind="error" title={i18n.t("hostApplications.deviceUnavailable")} message={identity.error} action={{ label: i18n.t("common.tryAgain"), onPress: identity.retry }} />
      </FlowScreen>
    );
  }

  if (connection === "offline" && (applications === undefined || listings === undefined || conversations === undefined)) {
    return (
      <FlowScreen title={i18n.t("hostApplicant.title")}>
        <SystemState kind="offline" message={i18n.t("hostApplicant.reconnect")} />
      </FlowScreen>
    );
  }

  if (applications === undefined || listings === undefined || conversations === undefined) {
    return (
      <FlowScreen title={i18n.t("hostApplicant.title")}>
        <SystemState kind="loading" title={i18n.t("hostApplicant.loading")} />
      </FlowScreen>
    );
  }

  if (!application) {
    return (
      <FlowScreen title={i18n.t("hostApplicant.notFound")} intro={i18n.t("hostApplicant.notFoundBody")}>
        <Button label={i18n.t("hostApplicant.back")} href="/host/applications" replace />
      </FlowScreen>
    );
  }

  const status = applicationStatusCopy(application.status, i18n.t);
  const listingTitle = listings.find((listing) => listing._id === application.listingId)?.title || i18n.t("hostApplications.listingFallback");
  const conversation = conversations.find((item) => item.applicationId === application._id);
  const name = applicantName(application, i18n.t, i18n.formatNumber);

  return (
    <FlowScreen title={name} intro={i18n.t("hostApplicant.submittedFor", { listing: listingTitle })}>
      {connection === "offline" ? <SystemState kind="offline" title={i18n.t("hostApplications.offlineTitle")} message={i18n.t("hostApplicant.offlineBody")} /> : null}
      {error ? <SystemState kind="error" title={i18n.t("hostApplicant.saveError")} message={error} /> : null}

      <FlowCard>
        <StatusBadge label={status.label} accent={application.status === "pending" || application.status === "shortlisted"} />
        {application.profileSnapshot.kind === "sharedHome"
          ? application.profilePhotoUrls.map((photoUrl, index) => (
              <Photo
                key={photoUrl}
                uri={photoUrl}
                accessibilityLabel={i18n.t("hostApplications.photoIndexLabel", {
                  name,
                  index: i18n.formatNumber(index + 1),
                  count: i18n.formatNumber(application.profilePhotoUrls.length),
                })}
                style={{ width: "100%", height: 260, borderRadius: radius.card }}
              />
            ))
          : null}
        {applicantProfileRows(
          application,
          i18n.t,
          i18n.formatCurrency,
          i18n.formatDate,
          i18n.formatNumber,
        ).map((row) => <DataRow key={row.label} label={row.label} value={row.value} />)}
        <DataRow label={i18n.t("hostApplicant.applicationNote")} value={application.note ?? i18n.t("hostApplicant.noNote")} />
      </FlowCard>

      <FlowCard>
        <Heading level={2} style={{ fontSize: 17, fontWeight: "800" }}>{i18n.t("hostApplicant.statusTitle")}</Heading>
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>{applicationStatusDetail(application.status, i18n.t)}</Text>
      </FlowCard>

      {application.status === "pending" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button disabled={Boolean(busyAction) || connection === "offline"} label={busyAction === "decline" ? i18n.t("hostApplications.saving") : i18n.t("hostApplications.pass")} variant="surface" onPress={() => { void review(application, "declined"); }} style={{ flexGrow: 1 }} />
          <Button disabled={Boolean(busyAction) || connection === "offline"} label={busyAction === "shortlist" ? i18n.t("hostApplications.saving") : i18n.t("hostApplications.shortlist")} onPress={() => { void review(application, "shortlisted"); }} style={{ flexGrow: 1 }} />
        </View>
      ) : null}

      {conversation ? <Button label={i18n.t("hostApplicant.openConversation")} href={{ pathname: "/inbox/[threadId]", params: { threadId: conversation._id } }} /> : null}

      {application.status === "shortlisted" || application.status === "declined" ? (
        <Button disabled={Boolean(busyAction) || connection === "offline"} label={busyAction === "undo" ? i18n.t("hostApplications.undoing") : i18n.t("hostApplicant.undoDecision")} variant="surface" onPress={() => { void undo(application); }} />
      ) : null}
    </FlowScreen>
  );
}
