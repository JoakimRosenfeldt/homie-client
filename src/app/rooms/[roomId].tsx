import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button, CircleButton } from "@/components/button";
import { OutlineTag } from "@/components/chip";
import { ChevronLeftIcon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Overlay } from "@/components/screen";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { useProductFlow } from "@/features/applications/store";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import { useI18n } from "@/i18n";
import { radius, useTheme } from "@/theme/tokens";

const AMENITY_LABELS = {
  parking: "Parking",
  laundry: "Laundry",
  dishwasher: "Dishwasher",
  balcony: "Balcony",
  elevator: "Elevator",
  internetIncluded: "Internet included",
  petsAllowed: "Pets allowed",
  smokingAllowed: "Smoking allowed",
} as const;

function formatListingDate(value: string, i18n: ReturnType<typeof useI18n>) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : i18n.formatDate(date, { day: "numeric", month: "short", year: "numeric" });
}

export default function RoomDetailScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const insets = useSafeAreaInsets();
  const flow = useProductFlow();
  const identity = useDeviceIdentity();
  const params = useLocalSearchParams<{ roomId: Id<"listings"> | Id<"listings">[] }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const room = useQuery(api.listings.getDetail, roomId ? { listingId: roomId } : "skip");
  const savedIds = useQuery(
    api.listings.listSavedIds,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const setSavedMutation = useMutation(api.listings.setSaved);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (flow.connection === "offline" && (room === undefined || (identity.kind === "ready" && savedIds === undefined))) {
    return (
      <Overlay style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
        <SystemState headingLevel={1} kind="offline" message="Reconnect to load this home." />
      </Overlay>
    );
  }

  if (room === undefined || (identity.kind === "ready" && savedIds === undefined)) {
    return (
      <Overlay style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
        <SystemState headingLevel={1} kind="loading" message="Loading this home." />
      </Overlay>
    );
  }

  if (!room) {
    return (
      <Overlay style={{ alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <SystemState
          headingLevel={1}
          kind="empty"
          title="Home not found"
          message="This listing is no longer published."
          action={{ label: "Back to Explore", onPress: () => router.back() }}
        />
      </Overlay>
    );
  }

  const application = flow.applications.find((item) => item.listingId === room._id);
  const isSaved = savedIds?.includes(room._id) ?? false;
  const tags = [
    room.propertyType,
    room.furnished === true ? "Furnished" : room.furnished === false ? "Unfurnished" : undefined,
    ...room.amenities.map((amenity) => AMENITY_LABELS[amenity]),
  ].filter((tag): tag is string => Boolean(tag));
  const facts = [
    room.sizeSqm ? `${i18n.formatNumber(room.sizeSqm)} m²` : null,
    room.bedroomCount ? `${i18n.formatNumber(room.bedroomCount)} bedrooms` : null,
    room.availableFrom ? `Available ${formatListingDate(room.availableFrom, i18n)}` : null,
  ].filter((fact): fact is string => fact !== null);

  const toggleSaved = async () => {
    if (saving) return;
    if (identity.kind !== "ready") {
      setError(identity.kind === "error" ? identity.error : "Device identity is still loading.");
      return;
    }
    if (flow.connection === "offline") {
      setError("You are offline. Reconnect before changing saved homes.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await setSavedMutation({ listingId: room._id, ownerKey: identity.ownerKey, isSaved: !isSaved });
    } catch (saveError) {
      setError(readableBackendError(saveError, i18n));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: "100%", maxWidth: 720, alignSelf: "center", paddingBottom: 24 }}>
        <Photo
          uri={room.photos[0]?.url ?? undefined}
          label="Listing photo"
          accessibilityLabel={`Photo of ${room.title}`}
          stripe={12}
          style={{ height: 330 }}>
          <CircleButton
            accessibilityLabel="Back"
            onPress={() => router.back()}
            size={44}
            tone="glass"
            style={{ position: "absolute", left: 16, top: insets.top + 14 }}>
            <ChevronLeftIcon color={theme.ink} />
          </CircleButton>

          <View
            style={{
              position: "absolute",
              right: 16,
              bottom: 14,
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: theme.photoOverlay,
            }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: theme.onPhotoOverlay }}>
              {room.photos.length} {room.photos.length === 1 ? "photo" : "photos"}
            </Text>
          </View>
        </Photo>

        <View style={{ padding: 20, gap: 12 }}>
          {flow.connection === "offline" ? (
            <SystemState kind="offline" message="Showing cached listing details. Actions are unavailable." />
          ) : null}

          <Heading level={1} style={{ fontSize: 27, lineHeight: 31, fontWeight: "800" }}>
            {room.title}
          </Heading>
          <Text selectable style={{ fontSize: 13, fontWeight: "500", color: theme.muted }}>
            {[room.publicLocationLabel, ...facts].filter(Boolean).join(" · ")}
          </Text>

          {tags.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tag) => <OutlineTag key={tag} label={tag} />)}
            </View>
          ) : null}

          <Text selectable style={{ fontSize: 14, lineHeight: 23, color: theme.body }}>
            {room.description ?? room.summary ?? "The host has not added a full description yet."}
          </Text>

          <View
            style={{
              gap: 8,
              padding: 18,
              borderRadius: radius.card,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}>
            <Text selectable style={{ fontSize: 18, fontWeight: "800", color: theme.ink }}>
              {room.monthlyRent
                ? `${i18n.formatCurrency(room.monthlyRent, room.currency)} per month`
                : "Rent on request"}
            </Text>
            {room.deposit !== undefined ? (
              <Text selectable style={{ fontSize: 14, color: theme.body }}>
                Deposit: {i18n.formatCurrency(room.deposit, room.currency)}
              </Text>
            ) : null}
            {room.utilitiesIncluded !== undefined ? (
              <Text selectable style={{ fontSize: 14, color: theme.body }}>
                Utilities {room.utilitiesIncluded ? "included" : "not included"}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              gap: 6,
              padding: 18,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted }}>APPROXIMATE AREA</Text>
            <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.body }}>
              Homie only exposes the approximate public location. The exact address and exact coordinate stay private.
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Button
              disabled={saving || flow.connection === "offline"}
              label={saving ? "Saving" : isSaved ? "Remove from Saved" : "Save home"}
              variant="surface"
              onPress={() => void toggleSaved()}
              style={{ flexGrow: 1 }}
            />
            <Button
              href={{ pathname: "/report", params: { listingId: String(room._id), targetLabel: room.title } }}
              label="Report listing"
              variant="surface"
              style={{ flexGrow: 1 }}
            />
          </View>
          {error ? <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 14,
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}>
        <View>
          <Text style={{ fontSize: 19, fontWeight: "700", color: theme.ink }}>
            {room.monthlyRent
              ? i18n.formatCurrency(room.monthlyRent, room.currency)
              : "Rent on request"}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "500", color: theme.faint }}>per month</Text>
        </View>

        <Button
          href={application
            ? { pathname: "/applications/[applicationId]", params: { applicationId: application.id } }
            : { pathname: "/apply/[roomId]", params: { roomId: room._id } }}
          label={application ? "View application" : "Apply with your profile"}
          height={50}
          style={{ flex: 1 }}
        />
      </View>
    </Overlay>
  );
}
