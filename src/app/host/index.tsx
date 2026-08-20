import { useMutation, useQuery } from "convex/react";
import React from "react";
import { View } from "react-native";

import { Button } from "@/components/button";
import { DestructiveConfirmation, SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { EmptyState, FlowCard, FlowScreen, StatusBadge } from "@/features/applications/flow-ui";
import { useBackendConnection } from "@/features/backend/convex-provider";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import {
  api,
  formatHostRent,
  hostListingStatusLabel,
  PROPERTY_TYPES,
  type HostListing,
} from "@/features/host/backend-model";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

type CloseoutRequest = {
  listingId: HostListing["_id"];
  status: "rented" | "archived";
} | null;

export default function HostDashboardScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
  const setLifecycle = useMutation(api.listings.setLifecycle);
  const listings = useQuery(
    api.listings.listMine,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const applications = useQuery(
    api.applications.listForHost,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const [busyListingId, setBusyListingId] = React.useState<string | null>(null);
  const [closeout, setCloseout] = React.useState<CloseoutRequest>(null);
  const [error, setError] = React.useState<string | null>(null);
  const mutationInFlight = React.useRef(false);

  const changeLifecycle = async (listingId: HostListing["_id"], status: "published" | "paused" | "rented" | "archived") => {
    if (identity.kind !== "ready" || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusyListingId(String(listingId));
    setError(null);
    try {
      await setLifecycle({ listingId, ownerKey: identity.ownerKey, status });
      setCloseout(null);
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
    } finally {
      mutationInFlight.current = false;
      setBusyListingId(null);
    }
  };

  if (identity.kind === "loading") {
    return (
      <FlowScreen title={i18n.t("hostDashboard.title")}>
        <SystemState kind="loading" title={i18n.t("hostDashboard.deviceLoading")} />
      </FlowScreen>
    );
  }

  if (identity.kind === "error") {
    return (
      <FlowScreen title={i18n.t("hostDashboard.title")}>
        <SystemState kind="error" title={i18n.t("hostDashboard.deviceUnavailable")} message={identity.error} action={{ label: i18n.t("common.tryAgain"), onPress: identity.retry }} />
      </FlowScreen>
    );
  }

  if (connection === "offline" && (listings === undefined || applications === undefined)) {
    return (
      <FlowScreen title={i18n.t("hostDashboard.title")}>
        <SystemState kind="offline" message={i18n.t("hostDashboard.reconnect")} />
      </FlowScreen>
    );
  }

  if (listings === undefined || applications === undefined) {
    return (
      <FlowScreen title={i18n.t("hostDashboard.title")}>
        <SystemState kind="loading" title={i18n.t("hostDashboard.loading")} />
      </FlowScreen>
    );
  }

  const pendingApplicants = applications.filter((application) => application.status === "pending").length;
  const hasDraft = listings.some((listing) => listing.status === "draft");

  return (
    <FlowScreen title={i18n.t("hostDashboard.title")} intro={i18n.t("hostDashboard.intro")}>
      {connection === "offline" ? <SystemState kind="offline" title={i18n.t("hostDashboard.offlineTitle")} message={i18n.t("hostDashboard.offlineBody")} /> : null}
      {error ? <SystemState kind="error" title={i18n.t("hostDashboard.updateError")} message={error} /> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button label={i18n.t("hostDashboard.reviewApplications", { count: i18n.formatNumber(pendingApplicants) })} href="/host/applications" style={{ flexGrow: 1 }} />
        <Button label={hasDraft ? i18n.t("hostDashboard.continueDraft") : i18n.t("hostDashboard.createListing")} variant="surface" href="/new-listing" style={{ flexGrow: 1 }} />
      </View>

      {listings.length === 0 ? (
        <EmptyState title={i18n.t("hostDashboard.emptyTitle")} body={i18n.t("hostDashboard.emptyBody")} action={{ label: i18n.t("hostDashboard.createListing"), href: "/new-listing" }} />
      ) : (
        listings.map((listing) => {
          const listingPendingCount = applications.filter(
            (application) => application.listingId === listing._id && application.status === "pending",
          ).length;
          const busy = busyListingId === String(listing._id);
          const propertyType = PROPERTY_TYPES.find((type) => type.value === listing.propertyType);
          return (
            <FlowCard key={listing._id}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Heading level={2} style={{ fontSize: 19, lineHeight: 24, fontWeight: "800" }}>
                    {listing.title || i18n.t("hostDashboard.untitled")}
                  </Heading>
                  <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
                    {listing.publicLocationLabel ?? i18n.t("hostDashboard.locationMissing")} · {formatHostRent(listing.monthlyRent, listing.currency, i18n.t, i18n.formatCurrency)} · {propertyType ? i18n.t(propertyType.labelKey) : i18n.t("hostDashboard.typeMissing")}
                  </Text>
                  <Text selectable style={{ fontVariant: ["tabular-nums"], fontSize: 13, color: theme.body }}>
                    {i18n.t(listingPendingCount === 1 ? "hostDashboard.pending.one" : "hostDashboard.pending.other", { count: i18n.formatNumber(listingPendingCount) })}
                  </Text>
                </View>
                <StatusBadge label={hostListingStatusLabel(listing.status, i18n.t)} accent={listing.status === "published"} />
              </View>

              {listing.status === "draft" ? (
                <Button
                  href={{ pathname: "/new-listing", params: { listingId: String(listing._id) } }}
                  label={i18n.t("hostDashboard.continueDraft")}
                />
              ) : null}

              {listing.status === "published" ? (
                <Button disabled={busy || connection === "offline"} label={busy ? i18n.t("hostDashboard.updating") : i18n.t("hostDashboard.pause")} variant="surface" onPress={() => changeLifecycle(listing._id, "paused")} />
              ) : null}

              {listing.status === "paused" ? (
                <View style={{ gap: 8 }}>
                  <Button disabled={busy || connection === "offline"} label={busy ? i18n.t("hostDashboard.updating") : i18n.t("hostDashboard.resume")} onPress={() => changeLifecycle(listing._id, "published")} />
                  <Button label={i18n.t("hostDashboard.edit")} variant="surface" href={{ pathname: "/new-listing", params: { listingId: String(listing._id) } }} />
                </View>
              ) : null}

              {listing.status === "published" || listing.status === "paused" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button disabled={busy || connection === "offline"} label={i18n.t("hostDashboard.markRented")} variant="surface" onPress={() => setCloseout({ listingId: listing._id, status: "rented" })} style={{ flexGrow: 1 }} />
                  <Button disabled={busy || connection === "offline"} label={i18n.t("hostDashboard.archive")} variant="surface" onPress={() => setCloseout({ listingId: listing._id, status: "archived" })} style={{ flexGrow: 1 }} />
                </View>
              ) : null}

              {listing.status === "rented" ? (
                <Button disabled={busy || connection === "offline"} label={i18n.t("hostDashboard.archive")} variant="surface" onPress={() => setCloseout({ listingId: listing._id, status: "archived" })} />
              ) : null}
            </FlowCard>
          );
        })
      )}

      <DestructiveConfirmation
        visible={closeout !== null}
        title={closeout?.status === "rented" ? i18n.t("hostDashboard.markRentedTitle") : i18n.t("hostDashboard.archiveTitle")}
        message={i18n.t("hostDashboard.closeoutBody")}
        confirmLabel={closeout?.status === "rented" ? i18n.t("hostDashboard.markRented") : i18n.t("hostDashboard.archive")}
        cancelLabel={i18n.t("common.cancel")}
        busy={closeout ? busyListingId === String(closeout.listingId) : false}
        onCancel={() => { if (!busyListingId) setCloseout(null); }}
        onConfirm={() => { if (closeout) void changeLifecycle(closeout.listingId, closeout.status); }}
      />
    </FlowScreen>
  );
}
