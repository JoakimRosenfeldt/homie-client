import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { api } from "../../../convex/_generated/api";
import { PillButton } from "@/components/button";
import { SoftPill } from "@/components/chip";
import { BellIcon, DiamondIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { SystemState } from "@/components/system-state";
import { Text } from "@/components/text";
import { useBackendConnection } from "@/features/backend/convex-provider";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import {
  AVAILABILITY_PREFIX_BY_LABEL,
  PROPERTY_TYPE_BY_LABEL,
  RENT_RANGE,
  RENTAL_ARRANGEMENT_BY_LABEL,
  RENTAL_ARRANGEMENTS,
  ROOM_TYPES,
  useSession,
} from "@/features/nabo/store";
import { EXPLORE_AREA, formatKr, roomFromListing } from "@/features/rooms/data";
import { ExploreMap } from "@/features/rooms/explore-map";
import { FiltersSheet } from "@/features/rooms/filters-sheet";
import { RoomCard } from "@/features/rooms/room-card";
import { FilterButton, SearchField } from "@/features/rooms/search-field";
import { useTheme } from "@/theme/tokens";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "rentAsc", label: "Lowest rent" },
  { value: "rentDesc", label: "Highest rent" },
] as const;

export default function ExploreScreen() {
  const theme = useTheme();
  const session = useSession();
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
  const [mapVisible, setMapVisible] = React.useState(false);
  const [filtersVisible, setFiltersVisible] = React.useState(false);
  const [sortIndex, setSortIndex] = React.useState(0);
  const [savingIds, setSavingIds] = React.useState<Record<string, boolean>>({});
  const sort = SORTS[sortIndex];
  const explore = useQuery(api.listings.explore, {
    filters: { area: EXPLORE_AREA },
    sort: sort.value,
    limit: 100,
  });
  const savedIds = useQuery(
    api.listings.listSavedIds,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const setSaved = useMutation(api.listings.setSaved);

  const selectedTypes = ROOM_TYPES.filter((label) => session.filters.types[label]);
  const selectedArrangements = RENTAL_ARRANGEMENTS.filter((label) => session.filters.arrangements[label]);
  const availabilityPrefix = session.filters.availability
    ? AVAILABILITY_PREFIX_BY_LABEL[session.filters.availability]
    : undefined;
  const rooms = React.useMemo(
    () =>
      (explore?.items ?? [])
        .filter((listing) => {
          if ((listing.monthlyRent ?? Number.POSITIVE_INFINITY) > session.filters.maxRent) return false;
          if (
            selectedTypes.length > 0 &&
            (!listing.propertyType ||
              !selectedTypes.some((label) => PROPERTY_TYPE_BY_LABEL[label] === listing.propertyType))
          ) {
            return false;
          }
          if (
            selectedArrangements.length > 0 &&
            (!listing.rentalArrangement ||
              !selectedArrangements.some(
                (label) => RENTAL_ARRANGEMENT_BY_LABEL[label] === listing.rentalArrangement,
              ))
          ) {
            return false;
          }
          return !availabilityPrefix || listing.availableFrom?.startsWith(availabilityPrefix);
        })
        .map(roomFromListing),
    [availabilityPrefix, explore, selectedArrangements, selectedTypes, session.filters.maxRent],
  );
  const rents = (explore?.items ?? [])
    .map((listing) => listing.monthlyRent)
    .filter((rent): rent is number => rent !== undefined);
  const searchChips = [
    EXPLORE_AREA,
    ...selectedTypes,
    ...selectedArrangements,
    ...(session.filters.maxRent < RENT_RANGE.max ? [`Under ${formatKr(session.filters.maxRent)}`] : []),
    ...(session.filters.availability ? [session.filters.availability] : []),
  ];
  if (searchChips.length === 1) searchChips.push("All homes");
  const searchSummary = searchChips.join(" · ");

  const openRoom = (roomId: string) => router.push(`/rooms/${roomId}`);
  const openFilters = () => setFiltersVisible(true);
  const openSearchAgent = () => {
    const propertyTypes = selectedTypes.map((label) => PROPERTY_TYPE_BY_LABEL[label]).join(",");
    const rentalArrangements = selectedArrangements
      .map((label) => RENTAL_ARRANGEMENT_BY_LABEL[label])
      .join(",");
    const agentName = [
      EXPLORE_AREA,
      ...selectedTypes,
      ...selectedArrangements,
      session.filters.maxRent < RENT_RANGE.max ? `under ${formatKr(session.filters.maxRent)}` : "",
      session.filters.availability,
    ]
      .filter(Boolean)
      .join(", ");

    router.push({
      pathname: "/search-agent",
      params: {
        name: agentName,
        area: EXPLORE_AREA,
        maximumRent: String(session.filters.maxRent),
        ...(propertyTypes ? { propertyTypes } : {}),
        ...(rentalArrangements ? { rentalArrangements } : {}),
        ...(availabilityPrefix ? { availableFromPrefix: availabilityPrefix } : {}),
      },
    });
  };
  const toggleSaved = async (roomId: (typeof rooms)[number]["id"]) => {
    if (identity.kind !== "ready" || savingIds[roomId]) {
      session.notify(identity.kind === "error" ? identity.error : "Your device identity is still loading.");
      return;
    }

    const isSaved = savedIds?.includes(roomId) ?? false;
    setSavingIds((current) => ({ ...current, [roomId]: true }));
    try {
      await setSaved({ listingId: roomId, ownerKey: identity.ownerKey, isSaved: !isSaved });
      session.notify(isSaved ? "Removed from saved homes." : "Saved to your homes.");
    } catch (error) {
      session.notify(readableBackendError(error));
    } finally {
      setSavingIds((current) => ({ ...current, [roomId]: false }));
    }
  };

  if (mapVisible) {
    return (
      <>
        <ExploreMap
          rooms={rooms}
          searchSummary={searchSummary}
          onOpenFilters={openFilters}
          onShowList={() => setMapVisible(false)}
          onOpenRoom={openRoom}
        />
        <FiltersSheet
          visible={filtersVisible}
          onClose={() => setFiltersVisible(false)}
          onCreateAgent={openSearchAgent}
          resultCount={rooms.length}
          rents={rents}
        />
      </>
    );
  }

  return (
    <>
      <Screen contentStyle={{ gap: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 4,
            gap: 12,
          }}>
          <Text style={{ flex: 1, fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
            {`Homes in\n${EXPLORE_AREA}`}
          </Text>
          <PillButton
            label="Map"
            onPress={() => setMapVisible(true)}
            icon={<DiamondIcon color={theme.accent} />}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 9, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
          <SearchField summary={searchSummary} onPress={openFilters} />
          <FilterButton onPress={openFilters} count={session.activeFilterCount} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14 }}>
          {searchChips.map((chip) => (
            <SoftPill key={chip} label={chip} size="sm" />
          ))}
        </ScrollView>

        {session.activeFilterCount > 0 ? (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 14,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: theme.accentSoft,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.card,
              }}>
              <BellIcon color={theme.accent} size={17} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: theme.ink }}>Keep this search running</Text>
              <Text style={{ fontSize: 11.5, lineHeight: 17, fontWeight: "500", color: theme.muted }}>
                Get notified when a matching home is added.
              </Text>
            </View>
            <PillButton label="Create agent" tone="accent" onPress={openSearchAgent} />
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingBottom: 10,
          }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.muted }}>{rooms.length} homes</Text>
          <PillButton
            label={sort.label}
            onPress={() => setSortIndex((current) => (current + 1) % SORTS.length)}
          />
        </View>

        <View style={{ gap: 14, paddingHorizontal: 20 }}>
          {explore === undefined ? (
            <SystemState
              kind={connection === "offline" ? "offline" : "loading"}
              message={connection === "offline" ? "Reconnect to load homes." : "Loading homes."}
            />
          ) : rooms.length === 0 ? (
            <SystemState
              kind="empty"
              title="No matching homes"
              message="Reset the filters to see the seeded Aarhus listings."
            />
          ) : (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                saved={savedIds?.includes(room.id) ?? false}
                saving={Boolean(savingIds[room.id])}
                onToggleSaved={() => void toggleSaved(room.id)}
                onPress={() => openRoom(room.id)}
              />
            ))
          )}
        </View>
      </Screen>

      <FiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        onCreateAgent={openSearchAgent}
        resultCount={rooms.length}
        rents={rents}
      />
    </>
  );
}
