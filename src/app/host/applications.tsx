import { useMutation, useQuery } from "convex/react";
import React from "react";
import { View } from "react-native";

import { Button } from "@/components/button";
import { Avatar } from "@/components/photo";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import {
  SwipeReviewDeck,
  type SwipeDeckHandle,
  type SwipeReviewDecision,
} from "@/features/applicants/swipe-deck";
import { applicationStatusCopy } from "@/features/applications/model";
import { ChoiceRow, EmptyState, FlowCard, FlowScreen, StatusBadge } from "@/features/applications/flow-ui";
import { useBackendConnection } from "@/features/backend/convex-provider";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import { api, applicantSummary, type HostApplication } from "@/features/host/backend-model";
import { type TranslationKey, useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

type BusyReview = { applicationId: string; action: "decline" | "shortlist" | "undo" } | null;
type ReviewMode = "list" | "swipe";

const HOST_STATUS_KEYS = {
  pending: "hostApplications.status.pending",
  shortlisted: "hostApplications.status.shortlisted",
  declined: "hostApplications.status.declined",
  withdrawn: "hostApplications.status.withdrawn",
  closed: "hostApplications.status.closed",
} satisfies Record<HostApplication["status"], TranslationKey>;

export default function HostApplicationsScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
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
  const [busyReview, setBusyReview] = React.useState<BusyReview>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewMode, setReviewMode] = React.useState<ReviewMode>("list");
  const [lastReviewed, setLastReviewed] = React.useState<HostApplication | null>(null);
  const mutationInFlight = React.useRef(false);
  const swipeDeck = React.useRef<SwipeDeckHandle>(null);

  const review = async (application: HostApplication, decision: "shortlisted" | "declined") => {
    if (identity.kind !== "ready" || mutationInFlight.current) return false;
    mutationInFlight.current = true;
    setBusyReview({
      applicationId: String(application._id),
      action: decision === "shortlisted" ? "shortlist" : "decline",
    });
    setError(null);
    try {
      await decide({ applicationId: application._id, ownerKey: identity.ownerKey, decision });
      setLastReviewed(application);
      return true;
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
      return false;
    } finally {
      mutationInFlight.current = false;
      setBusyReview(null);
    }
  };

  const undo = async (application: HostApplication) => {
    if (identity.kind !== "ready" || mutationInFlight.current) return false;
    mutationInFlight.current = true;
    setBusyReview({ applicationId: String(application._id), action: "undo" });
    setError(null);
    try {
      await undoDecision({ applicationId: application._id, ownerKey: identity.ownerKey });
      setLastReviewed(null);
      return true;
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
      return false;
    } finally {
      mutationInFlight.current = false;
      setBusyReview(null);
    }
  };

  const reviewSwipe = (application: HostApplication, decision: SwipeReviewDecision) =>
    review(application, decision === "shortlist" ? "shortlisted" : "declined");

  if (identity.kind === "loading") {
    return (
      <FlowScreen title={i18n.t("hostApplications.title")}>
        <SystemState kind="loading" title={i18n.t("hostApplications.deviceLoading")} />
      </FlowScreen>
    );
  }

  if (identity.kind === "error") {
    return (
      <FlowScreen title={i18n.t("hostApplications.title")}>
        <SystemState
          kind="error"
          title={i18n.t("hostApplications.deviceUnavailable")}
          message={identity.error}
          action={{ label: i18n.t("common.tryAgain"), onPress: identity.retry }}
        />
      </FlowScreen>
    );
  }

  if (connection === "offline" && (applications === undefined || listings === undefined)) {
    return (
      <FlowScreen title={i18n.t("hostApplications.title")}>
        <SystemState kind="offline" message={i18n.t("hostApplications.reconnect")} />
      </FlowScreen>
    );
  }

  if (applications === undefined || listings === undefined) {
    return (
      <FlowScreen title={i18n.t("hostApplications.title")}>
        <SystemState kind="loading" title={i18n.t("hostApplications.loading")} />
      </FlowScreen>
    );
  }

  const pendingApplications = applications.filter((application) => application.status === "pending");
  const pendingCount = pendingApplications.length;
  const pendingKey = pendingCount === 1 ? "hostApplications.pendingCount.one" : "hostApplications.pendingCount.other";
  const currentApplication = pendingApplications[0];
  const reviewModes = [
    { value: "list", label: i18n.t("common.list") },
    { value: "swipe", label: i18n.t("common.swipe") },
  ] as const;

  return (
    <FlowScreen title={i18n.t("hostApplications.title")} intro={i18n.t("hostApplications.intro")}>
      {connection === "offline" ? (
        <SystemState
          kind="offline"
          title={i18n.t("hostApplications.offlineTitle")}
          message={i18n.t("hostApplications.offlineMessage")}
        />
      ) : null}
      {error ? <SystemState kind="error" title={i18n.t("hostApplications.saveError")} message={error} /> : null}

      {applications.length === 0 ? (
        <EmptyState
          title={i18n.t("hostApplications.emptyTitle")}
          body={i18n.t("hostApplications.emptyBody")}
        />
      ) : (
        <>
          <FlowCard>
            <ChoiceRow
              label={i18n.t("hostApplications.reviewMode")}
              options={reviewModes}
              value={reviewMode}
              onChange={setReviewMode}
            />
            <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
              {i18n.t(pendingKey, { count: i18n.formatNumber(pendingCount) })}
            </Text>
          </FlowCard>

          {reviewMode === "list" ? (
            applications.map((application) => (
              <ApplicationReviewCard
                key={application._id}
                application={application}
                listingTitle={
                  listings.find((listing) => listing._id === application.listingId)?.title ||
                  i18n.t("hostApplications.listingFallback")
                }
                busyReview={busyReview}
                disabled={Boolean(busyReview) || connection === "offline"}
                onReview={review}
                onUndo={undo}
              />
            ))
          ) : currentApplication ? (
            <SwipeReview
              application={currentApplication}
              listingTitle={
                listings.find((listing) => listing._id === currentApplication.listingId)?.title ||
                i18n.t("hostApplications.listingFallback")
              }
              deckRef={swipeDeck}
              busyReview={busyReview}
              disabled={Boolean(busyReview) || connection === "offline"}
              onReview={reviewSwipe}
            />
          ) : (
            <EmptyState
              title={i18n.t("hostApplications.allReviewed")}
              body={i18n.t("hostApplications.allReviewedBody")}
            />
          )}

          {reviewMode === "swipe" && lastReviewed ? (
            <Button
              disabled={Boolean(busyReview) || connection === "offline"}
              label={busyReview?.action === "undo" ? i18n.t("hostApplications.undoing") : i18n.t("hostApplications.undo")}
              variant="surface"
              onPress={() => {
                void undo(lastReviewed);
              }}
            />
          ) : null}
        </>
      )}
    </FlowScreen>
  );
}

function ApplicationReviewCard({
  application,
  listingTitle,
  busyReview,
  disabled,
  onReview,
  onUndo,
}: {
  application: HostApplication;
  listingTitle: string;
  busyReview: BusyReview;
  disabled: boolean;
  onReview: (application: HostApplication, decision: "shortlisted" | "declined") => Promise<boolean>;
  onUndo: (application: HostApplication) => Promise<boolean>;
}) {
  const theme = useTheme();
  const i18n = useI18n();
  const status = applicationStatusCopy(application.status, i18n.t);
  const busy = busyReview?.applicationId === String(application._id);

  return (
    <FlowCard>
      <ApplicantSummary application={application} listingTitle={listingTitle} />
      <StatusBadge label={status.label} accent={application.status === "pending" || application.status === "shortlisted"} />
      <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
        {i18n.t(HOST_STATUS_KEYS[application.status])}
      </Text>
      <Button
        href={{ pathname: "/host/applicants/[applicantId]", params: { applicantId: application._id } }}
        label={i18n.t("common.profile")}
        variant="surface"
      />

      {application.status === "pending" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button
            disabled={disabled}
            label={busy && busyReview?.action === "decline" ? i18n.t("hostApplications.saving") : i18n.t("hostApplications.pass")}
            variant="surface"
            onPress={() => {
              void onReview(application, "declined");
            }}
            style={{ flexGrow: 1 }}
          />
          <Button
            disabled={disabled}
            label={busy && busyReview?.action === "shortlist" ? i18n.t("hostApplications.saving") : i18n.t("hostApplications.shortlist")}
            onPress={() => {
              void onReview(application, "shortlisted");
            }}
            style={{ flexGrow: 1 }}
          />
        </View>
      ) : null}

      {application.status === "shortlisted" || application.status === "declined" ? (
        <Button
          disabled={disabled}
          label={busy ? i18n.t("hostApplications.undoing") : i18n.t("hostApplications.undo")}
          variant="surface"
          onPress={() => {
            void onUndo(application);
          }}
        />
      ) : null}
    </FlowCard>
  );
}

function SwipeReview({
  application,
  listingTitle,
  deckRef,
  busyReview,
  disabled,
  onReview,
}: {
  application: HostApplication;
  listingTitle: string;
  deckRef: React.RefObject<SwipeDeckHandle | null>;
  busyReview: BusyReview;
  disabled: boolean;
  onReview: (application: HostApplication, decision: SwipeReviewDecision) => Promise<boolean>;
}) {
  const theme = useTheme();
  const i18n = useI18n();
  const name = applicantDisplayName(application, i18n.t, i18n.formatNumber);
  const busy = busyReview?.applicationId === String(application._id);

  return (
    <View style={{ gap: 12 }}>
      <SwipeReviewDeck
        ref={deckRef}
        itemId={String(application._id)}
        accessibilityLabel={`${name}. ${i18n.t("hostApplications.swipeHint")}`}
        passLabel={i18n.t("hostApplications.pass").toUpperCase()}
        shortlistLabel={i18n.t("hostApplications.shortlist").toUpperCase()}
        disabled={disabled}
        style={{ minHeight: 380 }}
        onReview={(decision) => onReview(application, decision)}>
        <FlowCard style={{ minHeight: 300, borderWidth: 0 }}>
          <ApplicantSummary application={application} listingTitle={listingTitle} />
          <StatusBadge label={applicationStatusCopy(application.status, i18n.t).label} accent />
          <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
            {i18n.t("hostApplications.swipeHint")}
          </Text>
          <Button
            href={{ pathname: "/host/applicants/[applicantId]", params: { applicantId: application._id } }}
            label={i18n.t("common.profile")}
            variant="surface"
          />
        </FlowCard>
      </SwipeReviewDeck>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button
          disabled={disabled}
          label={busy && busyReview?.action === "decline" ? i18n.t("hostApplications.saving") : i18n.t("hostApplications.pass")}
          variant="surface"
          onPress={() => swipeDeckAction(deckRef, "pass")}
          style={{ flexGrow: 1 }}
        />
        <Button
          disabled={disabled}
          label={busy && busyReview?.action === "shortlist" ? i18n.t("hostApplications.saving") : i18n.t("hostApplications.shortlist")}
          onPress={() => swipeDeckAction(deckRef, "shortlist")}
          style={{ flexGrow: 1 }}
        />
      </View>
    </View>
  );
}

function ApplicantSummary({ application, listingTitle }: { application: HostApplication; listingTitle: string }) {
  const theme = useTheme();
  const i18n = useI18n();
  const name = applicantDisplayName(application, i18n.t, i18n.formatNumber);
  const photoUri = application.profileSnapshot.kind === "sharedHome"
    ? application.profilePhotoUrls[0]
    : undefined;

  return (
    <View style={{ minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      {photoUri ? (
        <Avatar
          uri={photoUri}
          size={64}
          accessibilityLabel={i18n.t("hostApplications.photoLabel", { name })}
        />
      ) : null}
      <View style={{ minWidth: 0, flex: 1, gap: 4 }}>
        <Heading level={2} numberOfLines={2} style={{ fontSize: 19, lineHeight: 24, fontWeight: "800" }}>
          {name}
        </Heading>
        <Text selectable numberOfLines={3} style={{ fontSize: 14, lineHeight: 20, color: theme.muted }}>
          {applicantSummary(application)}
        </Text>
        <Text selectable numberOfLines={2} style={{ fontSize: 13, lineHeight: 19, color: theme.body }}>
          {i18n.t("hostApplications.appliedTo", { listing: listingTitle })}
        </Text>
      </View>
    </View>
  );
}

function applicantDisplayName(
  application: HostApplication,
  translate: (key: TranslationKey, values?: Record<string, string | number>) => string,
  formatNumber: (value: number) => string,
) {
  const profile = application.profileSnapshot;
  return profile.kind === "sharedHome"
    ? profile.name
    : translate("hostApplications.householdOf", { count: formatNumber(profile.householdSize) });
}

function swipeDeckAction(ref: React.RefObject<SwipeDeckHandle | null>, decision: SwipeReviewDecision) {
  ref.current?.[decision]();
}
