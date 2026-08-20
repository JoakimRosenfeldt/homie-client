import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { Photo } from "@/components/photo";
import { SystemState } from "@/components/system-state";
import { Text } from "@/components/text";
import { DataRow, FlowCard, FlowScreen, LabeledInput } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import { profileRows } from "@/features/profile/model";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export default function ApplyScreen() {
  const theme = useTheme();
  const flow = useProductFlow();
  const i18n = useI18n();
  const params = useLocalSearchParams<{ roomId: Id<"listings"> | Id<"listings">[] }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const room = useQuery(api.listings.getDetail, roomId ? { listingId: roomId } : "skip");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  if (!roomId) {
    return (
      <FlowScreen title={i18n.t("apply.notFoundTitle")} intro={i18n.t("apply.incompleteLink")}>
        <Button label={i18n.t("apply.backExplore")} href="/" replace />
      </FlowScreen>
    );
  }

  if (
    flow.profileUnavailableOffline ||
    flow.applicationsUnavailableOffline ||
    (room === undefined && flow.connection === "offline")
  ) {
    return (
      <FlowScreen title={i18n.t("apply.reviewTitle")}>
        <SystemState kind="offline" message={i18n.t("apply.offlineLoad")} />
      </FlowScreen>
    );
  }

  if (room === undefined || flow.loading) {
    return (
      <FlowScreen title={i18n.t("apply.reviewTitle")}>
        <SystemState kind="loading" message={i18n.t("apply.loading")} />
      </FlowScreen>
    );
  }

  if (!room) {
    return (
      <FlowScreen title={i18n.t("apply.notFoundTitle")} intro={i18n.t("apply.closed")}>
        <Button label={i18n.t("apply.backExplore")} href="/" replace />
      </FlowScreen>
    );
  }

  const existing = flow.applications.find((application) => application.listingId === room._id);
  if (existing) {
    return (
      <FlowScreen title={i18n.t("apply.alreadyTitle")} intro={i18n.t("apply.alreadyBody")}>
        <FlowCard>
          <Text selectable style={{ fontSize: 17, fontWeight: "800", color: theme.ink }}>
            {room.title}
          </Text>
          <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
            {i18n.t("apply.existingBody")}
          </Text>
          <Button
            label={i18n.t("apply.view")}
            href={{
              pathname: "/applications/[applicationId]",
              params: { applicationId: existing.id },
            }}
            replace
          />
        </FlowCard>
      </FlowScreen>
    );
  }

  if (!flow.profile) {
    return (
      <FlowScreen
        title={i18n.t("apply.createProfileTitle")}
        intro={i18n.t("apply.createProfileIntro")}>
        <FlowCard>
          <Text selectable style={{ fontSize: 17, fontWeight: "800", color: theme.ink }}>
            {i18n.t("apply.hostReceives")}
          </Text>
          <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
            {i18n.t("apply.snapshotBody")}
          </Text>
          <Button
            label={i18n.t("apply.createProfile")}
            href={{ pathname: "/profile", params: { roomId: room._id } }}
          />
        </FlowCard>
      </FlowScreen>
    );
  }

  const submit = async () => {
    if (submitting) return;
    if (flow.connection === "offline") {
      setError(i18n.t("apply.offlineError"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await flow.submitApplication({
        listingId: room._id,
        listingTitle: room.title,
        note,
      });
      switch (result.kind) {
        case "created":
        case "duplicate":
          router.replace(`/applications/${result.applicationId}`);
          break;
        case "missingProfile":
          setError(i18n.t("apply.profileMissing"));
          break;
        default: {
          const _exhaustive: never = result;
          void _exhaustive;
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : i18n.t("apply.sendError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlowScreen title={i18n.t("apply.reviewTitle")} intro={i18n.t("apply.reviewIntro")}>
      {flow.connection === "offline" ? (
        <SystemState kind="offline" message={i18n.t("apply.offline")} />
      ) : null}

      <FlowCard>
        <DataRow label={i18n.t("apply.listing")} value={room.title} />
        <DataRow
          label={i18n.t("apply.profileType")}
          value={
            flow.profile.kind === "sharedHome"
              ? i18n.t("profile.sharedHome")
              : i18n.t("profile.privateRental")
          }
        />
        {flow.profile.kind === "sharedHome" ? (
          <>
            <DataRow label={i18n.t("apply.name")} value={flow.profile.name} />
            {flow.profile.photos.map((photo, index) => (
              <Photo
                key={photo.storageId}
                uri={photo.url ?? undefined}
                accessibilityLabel={i18n.t("profile.photoLabel", {
                  index: i18n.formatNumber(index + 1),
                  count: i18n.formatNumber(flow.profile?.kind === "sharedHome" ? flow.profile.photos.length : 0),
                })}
                style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 14 }}
              />
            ))}
          </>
        ) : null}
        {profileRows(flow.profile, i18n.t, i18n.formatCurrency).map((row) => (
          <DataRow key={row.label} label={row.label} value={row.value} />
        ))}
      </FlowCard>

      <LabeledInput
        label={i18n.t("apply.note")}
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
        placeholder={i18n.t("apply.notePlaceholder")}
        hint={i18n.t("apply.noteHint", { count: i18n.formatNumber(note.length) })}
      />

      {error ? <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>{error}</Text> : null}
      <Button
        disabled={submitting || flow.connection === "offline"}
        label={submitting ? i18n.t("apply.sending") : i18n.t("apply.send")}
        onPress={() => void submit()}
      />
    </FlowScreen>
  );
}
