import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { api } from "../../../convex/_generated/api";
import { Button, PillButton } from "@/components/button";
import { useCompositeItemKeyboard, useFocusRing } from "@/components/interaction";
import { Screen } from "@/components/screen";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { ChoiceRow, FlowCard, LabeledInput } from "@/features/applications/flow-ui";
import { useBackendConnection } from "@/features/backend/convex-provider";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import { requestNearMeLocation, type DeviceSearchCoordinate } from "@/features/location";
import { requestProfilePushRegistration } from "@/features/notifications";
import { NativeMap } from "@/features/rooms/native-map";
import type { PublicMapViewport } from "@/features/rooms/native-map.types";
import { RoomCard, type Room } from "@/features/rooms/room-card";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n/dictionaries";
import { fontFamilyForWeight } from "@/theme/fonts";
import { radius, useTheme } from "@/theme/tokens";

type Segment = "browse" | "saved";
type Sort = "newest" | "rent" | "distance";
type PropertyType = "all" | "apartment" | "house" | "room" | "studio";
type LocationState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "located" }
  | { kind: "manual"; message: string };
type SavedSearch = FunctionReturnType<typeof api.savedSearches.listMine>[number];

const PROPERTY_TYPES: readonly { value: PropertyType; labelKey: TranslationKey }[] = [
  { value: "all", labelKey: "explore.type.all" },
  { value: "room", labelKey: "explore.type.room" },
  { value: "studio", labelKey: "explore.type.studio" },
  { value: "apartment", labelKey: "explore.type.apartment" },
  { value: "house", labelKey: "explore.type.house" },
];

const COPENHAGEN_REGION: PublicMapViewport = {
  latitude: 55.6761,
  longitude: 12.5683,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function areaMatches(label: string | undefined, area: string) {
  if (!area.trim()) return true;
  const normalizedArea = area.trim().toLocaleLowerCase();
  const normalizedLabel = label?.toLocaleLowerCase() ?? "";
  if (normalizedArea === "københavn" || normalizedArea === "copenhagen") {
    return normalizedLabel.includes("københavn") || normalizedLabel.includes("copenhagen");
  }
  return normalizedLabel.includes(normalizedArea);
}

function distanceSquared(
  coordinate: { latitude: number; longitude: number } | undefined,
  origin: DeviceSearchCoordinate | null,
) {
  if (!coordinate || !origin) return Number.POSITIVE_INFINITY;
  const latitude = coordinate.latitude - origin.latitude;
  const longitude = coordinate.longitude - origin.longitude;
  return latitude * latitude + longitude * longitude;
}

function locationFailureMessage(reason: string, t: ReturnType<typeof useI18n>["t"]) {
  if (reason === "permissionDenied") return t("explore.locationDenied");
  if (reason === "locationServicesDisabled") return t("explore.locationDisabled");
  if (reason === "unsupportedPlatform") return t("explore.locationUnsupported");
  return t("explore.locationUnavailable");
}

function moneyValue(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : undefined;
}

function wrapLongitude(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function viewportBounds(region: PublicMapViewport) {
  return {
    north: Math.min(90, region.latitude + region.latitudeDelta / 2),
    south: Math.max(-90, region.latitude - region.latitudeDelta / 2),
    east: wrapLongitude(region.longitude + region.longitudeDelta / 2),
    west: wrapLongitude(region.longitude - region.longitudeDelta / 2),
  };
}

function formatListingDate(value: string, i18n: ReturnType<typeof useI18n>) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : i18n.formatDate(date, { day: "numeric", month: "short", year: "numeric" });
}

export default function ExploreScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
  const [segment, setSegment] = React.useState<Segment>("browse");
  const [city, setCity] = React.useState("København");
  const [cityDraft, setCityDraft] = React.useState(city);
  const [propertyType, setPropertyType] = React.useState<PropertyType>("all");
  const [minimumRent, setMinimumRent] = React.useState("");
  const [maximumRent, setMaximumRent] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("newest");
  const [nearCoordinate, setNearCoordinate] = React.useState<DeviceSearchCoordinate | null>(null);
  const [locationState, setLocationState] = React.useState<LocationState>({ kind: "idle" });
  const [mapVisible, setMapVisible] = React.useState(false);
  const [mapViewport, setMapViewport] = React.useState<PublicMapViewport | null>(null);
  const [savedSearchName, setSavedSearchName] = React.useState("");
  const [savedSearchNotifications, setSavedSearchNotifications] = React.useState(false);
  const [savingSearch, setSavingSearch] = React.useState(false);
  const [removingSearchId, setRemovingSearchId] = React.useState<SavedSearch["_id"] | null>(null);
  const [updatingSearchId, setUpdatingSearchId] = React.useState<SavedSearch["_id"] | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [explorePagination, setExplorePagination] = React.useState<{
    key: string;
    cursor: string | null;
  }>({ key: "", cursor: null });
  const [explorePages, setExplorePages] = React.useState<{
    key: string;
    loadedCursor: string | null;
    value: FunctionReturnType<typeof api.listings.explore>;
  } | null>(null);
  const propertyTypeLabelId = React.useId();
  const sortLabelId = React.useId();
  const segmentId = React.useId();

  const minimumRentValue = moneyValue(minimumRent);
  const maximumRentValue = moneyValue(maximumRent);
  const supportsMap = process.env.EXPO_OS === "ios" || process.env.EXPO_OS === "android";
  const exploreArgs = React.useMemo(
    () => ({
      filters: {
        area: nearCoordinate || (supportsMap && mapVisible && mapViewport) ? undefined : city,
        propertyTypes: propertyType === "all" ? undefined : [propertyType],
        minimumRent: minimumRentValue,
        maximumRent: maximumRentValue,
      },
      sort: sort === "rent" ? ("rentAsc" as const) : sort,
      viewport:
        supportsMap && mapVisible && mapViewport ? viewportBounds(mapViewport) : undefined,
      origin: nearCoordinate ?? undefined,
      limit: 100,
    }),
    [
      city,
      mapViewport,
      mapVisible,
      maximumRentValue,
      minimumRentValue,
      nearCoordinate,
      propertyType,
      sort,
      supportsMap,
    ],
  );
  const exploreKey = JSON.stringify(exploreArgs);
  const exploreCursor = explorePagination.key === exploreKey ? explorePagination.cursor : null;
  const exploreQuery = useQuery(api.listings.explore, {
    ...exploreArgs,
    cursor: exploreCursor,
  });
  React.useEffect(() => {
    if (exploreQuery === undefined) return;
    setExplorePages((current) => {
      if (exploreCursor === null || current?.key !== exploreKey) {
        return { key: exploreKey, loadedCursor: null, value: exploreQuery };
      }
      if (current.loadedCursor === exploreCursor) return current;
      const seen = new Set(current.value.items.map((item) => item._id));
      const items = [
        ...current.value.items,
        ...exploreQuery.items.filter((item) => !seen.has(item._id)),
      ];
      return {
        key: exploreKey,
        loadedCursor: exploreCursor,
        value: {
          ...exploreQuery,
          items,
          total: exploreQuery.total,
          scanned: current.value.scanned + exploreQuery.scanned,
        },
      };
    });
  }, [exploreCursor, exploreKey, exploreQuery]);
  const cachedExplore =
    explorePages?.key === exploreKey
      ? explorePages.value
      : supportsMap && mapVisible && connection !== "offline"
        ? explorePages?.value
        : undefined;
  const explore = exploreCursor === null ? exploreQuery ?? cachedExplore : cachedExplore;
  const loadingMore =
    exploreCursor !== null &&
    (exploreQuery === undefined || explorePages?.loadedCursor !== exploreCursor);
  const saved = useQuery(
    api.listings.listSaved,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const savedSearches = useQuery(
    api.savedSearches.listMine,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const pushStatus = useQuery(
    api.savedSearches.getPushStatus,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const saveSavedSearch = useMutation(api.savedSearches.save);
  const removeSavedSearch = useMutation(api.savedSearches.remove);
  const registerPushToken = useMutation(api.savedSearches.registerPushToken);

  const items = React.useMemo(() => {
    const filtered = segment === "browse" ? [...(explore?.items ?? [])] : (saved ?? []).filter((listing) => {
      if (!nearCoordinate && !areaMatches(listing.publicLocationLabel, city)) return false;
      if (propertyType !== "all" && listing.propertyType !== propertyType) return false;
      if (minimumRentValue !== undefined && (listing.monthlyRent ?? 0) < minimumRentValue) return false;
      if (
        maximumRentValue !== undefined &&
        (listing.monthlyRent ?? Number.POSITIVE_INFINITY) > maximumRentValue
      ) {
        return false;
      }
      return true;
    });

    return filtered.sort((left, right) => {
      if (sort === "rent") {
        return (left.monthlyRent ?? Number.POSITIVE_INFINITY) -
          (right.monthlyRent ?? Number.POSITIVE_INFINITY);
      }
      if (sort === "distance") {
        return distanceSquared(left.publicCoordinate, nearCoordinate) -
          distanceSquared(right.publicCoordinate, nearCoordinate);
      }
      return right.publishedAt - left.publishedAt;
    });
  }, [city, explore, maximumRentValue, minimumRentValue, nearCoordinate, propertyType, saved, segment, sort]);

  const rooms = React.useMemo(
    () =>
      items.map((listing): Room => ({
        id: listing._id,
        title: listing.title,
        meta: [
          listing.publicLocationLabel,
          listing.sizeSqm ? `${i18n.formatNumber(listing.sizeSqm)} m²` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        rent: listing.monthlyRent ?? 0,
        photo: i18n.t("explore.photoLabel"),
        photoUri: listing.coverUrl ?? undefined,
        tags: [
          listing.propertyType
            ? i18n.t(
                PROPERTY_TYPES.find((option) => option.value === listing.propertyType)?.labelKey ??
                  "explore.type.all",
              )
            : null,
          listing.rentalArrangement === "sublease" ? i18n.t("explore.sublease") : null,
          listing.availableFrom
            ? i18n.t("explore.availableFrom", {
                date: formatListingDate(listing.availableFrom, i18n),
              })
            : null,
        ].filter((tag): tag is string => Boolean(tag)),
      })),
    [i18n, items],
  );

  const searchCity = () => {
    const nextCity = cityDraft.trim();
    if (!nextCity) return;
    setCity(nextCity);
    setNearCoordinate(null);
    setSort("newest");
    setLocationState({ kind: "idle" });
  };

  const handleNearMe = async () => {
    setLocationState({ kind: "loading" });
    setError(null);
    try {
      const result = await requestNearMeLocation();
      if (result.kind === "located") {
        setNearCoordinate(result.coordinate);
        setSort("distance");
        setLocationState({ kind: "located" });
        return;
      }
      setNearCoordinate(null);
      setLocationState({ kind: "manual", message: locationFailureMessage(result.reason, i18n.t) });
    } catch (locationError) {
      setLocationState({ kind: "manual", message: readableBackendError(locationError, i18n) });
    }
  };

  const ensurePushAvailable = async () => {
    if (identity.kind !== "ready") {
      setError(i18n.t("savedSearches.signInUnavailable"));
      return false;
    }
    if (pushStatus?.hasGrantedToken) return true;

    const result = await requestProfilePushRegistration({
      ownerKey: identity.ownerKey,
      choice: "enable",
    });
    if (result.kind === "register") {
      try {
        await registerPushToken(result.registration);
        return true;
      } catch {
        setError(i18n.t("savedSearches.pushUnavailable"));
        return false;
      }
    }

    setError(
      result.reason === "permissionDenied"
        ? `${i18n.t("savedSearches.pushDeniedTitle")}. ${i18n.t("savedSearches.pushDenied")}`
        : result.reason === "unsupportedPlatform"
          ? i18n.t("savedSearches.pushUnsupported")
          : i18n.t("savedSearches.pushUnavailable"),
    );
    return false;
  };

  const saveSearch = async () => {
    if (identity.kind !== "ready" || savingSearch || nearCoordinate) return;
    const name = savedSearchName.trim();
    if (!name) {
      setFeedback(null);
      setError(i18n.t("savedSearches.emptyName"));
      return;
    }
    setSavingSearch(true);
    setFeedback(null);
    setError(null);
    try {
      if (savedSearchNotifications && !(await ensurePushAvailable())) return;
      await saveSavedSearch({
        ownerKey: identity.ownerKey,
        name,
        area: city || undefined,
        propertyTypes: propertyType === "all" ? [] : [propertyType],
        minimumRent: minimumRentValue,
        maximumRent: maximumRentValue,
        notificationsEnabled: savedSearchNotifications,
      });
      setSavedSearchName("");
      setSavedSearchNotifications(false);
      setFeedback(i18n.t("savedSearches.saved"));
    } catch (saveError) {
      setError(readableBackendError(saveError, i18n));
    } finally {
      setSavingSearch(false);
    }
  };

  const updateSearchNotifications = async (search: SavedSearch) => {
    if (identity.kind !== "ready" || updatingSearchId) return;
    const enable = !search.notificationsEnabled;
    setUpdatingSearchId(search._id);
    setFeedback(null);
    setError(null);
    try {
      if (enable && !(await ensurePushAvailable())) return;
      await saveSavedSearch({
        ownerKey: identity.ownerKey,
        savedSearchId: search._id,
        name: search.name,
        area: search.area,
        propertyTypes: [...search.propertyTypes],
        minimumRent: search.minimumRent,
        maximumRent: search.maximumRent,
        notificationsEnabled: enable,
      });
      setFeedback(i18n.t("savedSearches.updated"));
    } catch (updateError) {
      setError(readableBackendError(updateError, i18n));
    } finally {
      setUpdatingSearchId(null);
    }
  };

  const removeSearch = async (savedSearchId: SavedSearch["_id"]) => {
    if (identity.kind !== "ready" || removingSearchId) return;
    setRemovingSearchId(savedSearchId);
    setFeedback(null);
    setError(null);
    try {
      await removeSavedSearch({ ownerKey: identity.ownerKey, savedSearchId });
    } catch (removeError) {
      setError(readableBackendError(removeError, i18n));
    } finally {
      setRemovingSearchId(null);
    }
  };

  if (explore === undefined && connection === "offline") {
    return (
      <Screen scroll={false} paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="offline" message={i18n.t("explore.offlineEmpty")} />
      </Screen>
    );
  }

  if (explore === undefined) {
    return (
      <Screen scroll={false} paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="loading" message={i18n.t("explore.loading")} />
      </Screen>
    );
  }

  const savedItems = saved ?? [];
  const savedSearchItems = savedSearches ?? [];
  const mapPins = items.flatMap((listing) =>
    listing.publicCoordinate
      ? [
          {
            id: listing._id,
            title: listing.title,
            description: listing.publicLocationLabel,
            publicCoordinate: listing.publicCoordinate,
          },
        ]
      : [],
  );
  const firstCoordinate = nearCoordinate ?? mapPins[0]?.publicCoordinate;
  const initialRegion: PublicMapViewport = firstCoordinate
    ? { ...firstCoordinate, latitudeDelta: 0.12, longitudeDelta: 0.12 }
    : COPENHAGEN_REGION;
  const resultTotal = segment === "browse" ? explore.total : items.length;
  const resultTruncated = segment === "browse" && explore.truncated;
  const resultKey = resultTruncated
    ? items.length === 1
      ? "explore.resultTruncated.one"
      : "explore.resultTruncated.other"
    : resultTotal === 1
      ? "explore.result.one"
      : "explore.result.other";
  const resultCopy = resultTruncated
    ? i18n.t(resultKey, { shown: i18n.formatNumber(items.length) })
    : i18n.t(resultKey, { count: i18n.formatNumber(resultTotal ?? items.length) });
  const sortOptions: readonly { value: Sort; label: string }[] = [
    { value: "newest", label: i18n.t("explore.sortNewest") },
    { value: "rent", label: i18n.t("explore.sortRent") },
    ...(nearCoordinate
      ? [{ value: "distance" as const, label: i18n.t("explore.sortNearest") }]
      : []),
  ];

  if (supportsMap && mapVisible) {
    return (
      <Screen scroll={false} paddingHorizontal={0} contentStyle={{ paddingTop: 0, paddingBottom: 0 }}>
        <NativeMap
          pins={mapPins}
          initialRegion={initialRegion}
          pinLimitExceeded={segment === "browse" ? explore.truncated : items.length > 100}
          onRegionChangeComplete={setMapViewport}
          onSelectListing={(listingId) => router.push(`/rooms/${listingId}`)}
          onShowList={() => setMapVisible(false)}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} paddingHorizontal={0} contentStyle={{ paddingTop: 0 }}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rooms}
        keyExtractor={(room) => room.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
              <Text accessibilityRole="header" selectable style={{ flex: 1, fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
                {nearCoordinate
                  ? i18n.t("explore.homesNear")
                  : i18n.t("explore.homesIn", { city })}
              </Text>
              {supportsMap ? (
                <PillButton
                  label={i18n.t("explore.map")}
                  onPress={() => {
                    setMapViewport(initialRegion);
                    setMapVisible(true);
                  }}
                />
              ) : null}
            </View>

            <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
              <SegmentButton
                id={`${segmentId}-browse`}
                selected={segment === "browse"}
                label={i18n.t("explore.browse")}
                onPress={() => setSegment("browse")}
                previous={{ id: `${segmentId}-saved`, onPress: () => setSegment("saved") }}
                next={{ id: `${segmentId}-saved`, onPress: () => setSegment("saved") }}
              />
              <SegmentButton
                id={`${segmentId}-saved`}
                selected={segment === "saved"}
                label={i18n.t("explore.saved", {
                  count: i18n.formatNumber(savedItems.length),
                })}
                onPress={() => setSegment("saved")}
                previous={{ id: `${segmentId}-browse`, onPress: () => setSegment("browse") }}
                next={{ id: `${segmentId}-browse`, onPress: () => setSegment("browse") }}
              />
            </View>

            {connection === "offline" ? (
              <SystemState kind="offline" message={i18n.t("explore.offlineCached")} />
            ) : null}

            {identity.kind === "error" ? (
              <SystemState
                kind="denied"
                title={i18n.t("explore.identityUnavailable")}
                message={i18n.t("explore.identityUnavailableBody")}
                action={{ label: i18n.t("common.tryAgain"), onPress: identity.retry }}
              />
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ExploreTextInput
                accessibilityLabel={i18n.t("explore.cityLabel")}
                value={cityDraft}
                onChangeText={setCityDraft}
                onSubmitEditing={searchCity}
                returnKeyType="search"
                placeholder={i18n.t("explore.cityPlaceholder")}
                placeholderTextColor={theme.faint}
                style={{
                  flexGrow: 1,
                  minWidth: 180,
                  height: 46,
                  paddingHorizontal: 14,
                  borderRadius: radius.field,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: theme.borderStrong,
                  backgroundColor: theme.card,
                  color: theme.ink,
                  fontFamily: fontFamilyForWeight("500"),
                  fontSize: 16,
                }}
              />
              <PillButton label={i18n.t("explore.search")} onPress={searchCity} tone="accent" />
              <PillButton label={i18n.t("explore.nearMe")} onPress={() => void handleNearMe()} />
            </View>

            {locationState.kind === "loading" ? (
              <SystemState kind="loading" message={i18n.t("explore.locating")} />
            ) : null}
            {locationState.kind === "manual" ? (
              <SystemState
                kind="denied"
                title={i18n.t("explore.manualArea")}
                message={locationState.message}
              />
            ) : null}

            <View
              accessibilityLabelledBy={propertyTypeLabelId}
              accessibilityRole="radiogroup"
              aria-labelledby={propertyTypeLabelId}
              role="radiogroup"
              style={{ gap: 8 }}>
              <Text
                nativeID={propertyTypeLabelId}
                style={{ fontSize: 12, fontWeight: "700", color: theme.body }}>
                {i18n.t("explore.homeType")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PROPERTY_TYPES.map((option, index) => {
                  const previousIndex = (index - 1 + PROPERTY_TYPES.length) % PROPERTY_TYPES.length;
                  const nextIndex = (index + 1) % PROPERTY_TYPES.length;
                  return (
                    <FilterChip
                      key={option.value}
                      id={`${propertyTypeLabelId}-option-${index}`}
                      label={i18n.t(option.labelKey)}
                      selected={propertyType === option.value}
                      onPress={() => setPropertyType(option.value)}
                      previous={{
                        id: `${propertyTypeLabelId}-option-${previousIndex}`,
                        onPress: () => setPropertyType(PROPERTY_TYPES[previousIndex].value),
                      }}
                      next={{
                        id: `${propertyTypeLabelId}-option-${nextIndex}`,
                        onPress: () => setPropertyType(PROPERTY_TYPES[nextIndex].value),
                      }}
                    />
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <ExploreTextInput
                  accessibilityLabel={i18n.t("explore.minimumRent")}
                  value={minimumRent}
                  onChangeText={setMinimumRent}
                  keyboardType="number-pad"
                  placeholder={i18n.t("explore.minimumRent")}
                  placeholderTextColor={theme.faint}
                  style={rentInputStyle(theme)}
                />
                <ExploreTextInput
                  accessibilityLabel={i18n.t("explore.maximumRentLabel")}
                  value={maximumRent}
                  onChangeText={setMaximumRent}
                  keyboardType="number-pad"
                  placeholder={i18n.t("explore.maximumRent")}
                  placeholderTextColor={theme.faint}
                  style={rentInputStyle(theme)}
                />
              </View>
              <View
                accessibilityLabelledBy={sortLabelId}
                accessibilityRole="radiogroup"
                aria-labelledby={sortLabelId}
                role="radiogroup"
                style={{ gap: 8 }}>
                <Text
                  nativeID={sortLabelId}
                  style={{ fontSize: 12, fontWeight: "700", color: theme.body }}>
                  {i18n.t("explore.sortBy")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {sortOptions.map((option, index) => {
                    const previousIndex = (index - 1 + sortOptions.length) % sortOptions.length;
                    const nextIndex = (index + 1) % sortOptions.length;
                    return (
                      <FilterChip
                        key={option.value}
                        id={`${sortLabelId}-option-${index}`}
                        label={option.label}
                        selected={sort === option.value}
                        onPress={() => setSort(option.value)}
                        previous={{
                          id: `${sortLabelId}-option-${previousIndex}`,
                          onPress: () => setSort(sortOptions[previousIndex].value),
                        }}
                        next={{
                          id: `${sortLabelId}-option-${nextIndex}`,
                          onPress: () => setSort(sortOptions[nextIndex].value),
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            </View>

            <Text accessibilityLiveRegion="polite" selectable style={{ fontSize: 12, fontWeight: "600", color: theme.muted }}>
              {resultCopy}
            </Text>

            {segment === "browse" ? (
              <SavedSearchesPanel
                name={savedSearchName}
                onChangeName={setSavedSearchName}
                notificationsEnabled={savedSearchNotifications}
                onChangeNotifications={setSavedSearchNotifications}
                searches={savedSearchItems}
                saving={savingSearch}
                removingSearchId={removingSearchId}
                updatingSearchId={updatingSearchId}
                disabled={connection === "offline" || identity.kind !== "ready"}
                identityLoading={identity.kind === "loading"}
                searchesLoading={identity.kind === "ready" && savedSearches === undefined}
                nearMe={Boolean(nearCoordinate)}
                onSave={() => void saveSearch()}
                onRemove={(savedSearchId) => void removeSearch(savedSearchId)}
                onUpdateNotifications={(search) => void updateSearchNotifications(search)}
              />
            ) : null}

            {feedback ? (
              <Text accessibilityLiveRegion="polite" role="status" selectable style={{ color: theme.success }}>
                {feedback}
              </Text>
            ) : null}
            {error ? (
              <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>
                {error}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          segment === "saved" &&
          (identity.kind === "loading" ||
            (identity.kind === "ready" && saved === undefined)) ? (
            <SystemState
              kind={connection === "offline" ? "offline" : "loading"}
              message={
                connection === "offline"
                  ? i18n.t("explore.offlineEmpty")
                  : i18n.t("explore.identityLoading")
              }
            />
          ) : (
            <SystemState
              kind="empty"
              title={
                segment === "saved"
                  ? i18n.t("explore.noSavedTitle")
                  : i18n.t("explore.noHomesTitle")
              }
              message={
                segment === "saved"
                  ? i18n.t("explore.noSavedBody")
                  : i18n.t("explore.noHomesBody")
              }
            />
          )
        }
        ListFooterComponent={
          segment === "browse" && !explore.isDone ? (
            <View style={{ paddingTop: 6 }}>
              <Button
                disabled={loadingMore || connection === "offline"}
                label={
                  loadingMore
                    ? i18n.t("explore.loadingMore")
                    : i18n.t("explore.loadMore")
                }
                variant="surface"
                onPress={() =>
                  setExplorePagination({ key: exploreKey, cursor: explore.continueCursor })
                }
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => <RoomCard room={item} />}
      />
    </Screen>
  );
}

function SavedSearchesPanel({
  name,
  onChangeName,
  notificationsEnabled,
  onChangeNotifications,
  searches,
  saving,
  removingSearchId,
  updatingSearchId,
  disabled,
  identityLoading,
  searchesLoading,
  nearMe,
  onSave,
  onRemove,
  onUpdateNotifications,
}: {
  name: string;
  onChangeName: (value: string) => void;
  notificationsEnabled: boolean;
  onChangeNotifications: (value: boolean) => void;
  searches: readonly SavedSearch[];
  saving: boolean;
  removingSearchId: SavedSearch["_id"] | null;
  updatingSearchId: SavedSearch["_id"] | null;
  disabled: boolean;
  identityLoading: boolean;
  searchesLoading: boolean;
  nearMe: boolean;
  onSave: () => void;
  onRemove: (savedSearchId: SavedSearch["_id"]) => void;
  onUpdateNotifications: (search: SavedSearch) => void;
}) {
  const theme = useTheme();
  const i18n = useI18n();

  return (
    <FlowCard>
      <Heading level={2} style={{ fontSize: 18, fontWeight: "800", color: theme.ink }}>
        {i18n.t("savedSearches.title")}
      </Heading>
      <LabeledInput
        label={i18n.t("savedSearches.name")}
        value={name}
        onChangeText={onChangeName}
        maxLength={80}
        placeholder={i18n.t("savedSearches.namePlaceholder")}
      />
      <ChoiceRow
        label={i18n.t("savedSearches.notificationsLabel")}
        options={[
          { value: "off", label: i18n.t("savedSearches.doNotNotify") },
          { value: "on", label: i18n.t("savedSearches.notify") },
        ]}
        value={notificationsEnabled ? "on" : "off"}
        onChange={(value) => onChangeNotifications(value === "on")}
      />
      {identityLoading ? (
        <Text selectable style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
          {i18n.t("explore.identityLoading")}
        </Text>
      ) : null}
      {nearMe ? (
        <Text selectable style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
          {i18n.t("savedSearches.nearMeUnavailable")}
        </Text>
      ) : null}
      <Button
        disabled={disabled || saving || nearMe}
        label={saving ? i18n.t("savedSearches.saving") : i18n.t("savedSearches.save")}
        onPress={onSave}
      />

      {searchesLoading ? (
        <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
          {i18n.t("savedSearches.loading")}
        </Text>
      ) : searches.length === 0 ? (
        <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
          {i18n.t("savedSearches.none")}
        </Text>
      ) : (
        searches.map((search, index) => (
          <View
            key={search._id}
            style={{
              gap: 7,
              paddingTop: index === 0 ? 4 : 12,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: theme.divider,
            }}>
            <Text selectable numberOfLines={2} style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>
              {search.name}
            </Text>
            <Text selectable style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
              {savedSearchSummary(search, i18n)}
            </Text>
            <View style={{ gap: 8 }}>
              <Button
                disabled={disabled || removingSearchId !== null || updatingSearchId !== null}
                label={
                  updatingSearchId === search._id
                    ? i18n.t("savedSearches.updating")
                    : search.notificationsEnabled
                      ? i18n.t("savedSearches.disable")
                      : i18n.t("savedSearches.enable")
                }
                variant="surface"
                onPress={() => onUpdateNotifications(search)}
              />
              <Button
                disabled={disabled || removingSearchId !== null || updatingSearchId !== null}
                label={
                  removingSearchId === search._id
                    ? i18n.t("savedSearches.removing")
                    : i18n.t("savedSearches.remove")
                }
                variant="surface"
                onPress={() => onRemove(search._id)}
              />
            </View>
          </View>
        ))
      )}
    </FlowCard>
  );
}

function savedSearchSummary(search: SavedSearch, i18n: ReturnType<typeof useI18n>) {
  const propertyTypes = search.propertyTypes.length
    ? search.propertyTypes
        .map((type: PropertyType) => {
          const key = PROPERTY_TYPES.find((option) => option.value === type)?.labelKey;
          return key ? i18n.t(key) : type;
        })
        .join(", ")
    : i18n.t("savedSearches.anyHome");
  const details = [search.area ?? i18n.t("savedSearches.anyArea"), propertyTypes];
  if (search.minimumRent !== undefined) {
    details.push(
      i18n.t("savedSearches.minimumRent", { rent: i18n.formatCurrency(search.minimumRent) }),
    );
  }
  if (search.maximumRent !== undefined) {
    details.push(
      i18n.t("savedSearches.maximumRent", { rent: i18n.formatCurrency(search.maximumRent) }),
    );
  }
  details.push(
    i18n.t(
      search.notificationsEnabled
        ? "savedSearches.notificationsOn"
        : "savedSearches.notificationsOff",
    ),
  );
  return details.join(" · ");
}

function ExploreTextInput({ style, onBlur, onFocus, ...props }: TextInputProps) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  return (
    <TextInput
      {...props}
      onBlur={(event) => {
        focus.onBlur();
        onBlur?.(event);
      }}
      onFocus={(event) => {
        focus.onFocus();
        onFocus?.(event);
      }}
      style={[style as StyleProp<TextStyle>, focus.focusStyle]}
    />
  );
}

function SegmentButton({
  id,
  selected,
  label,
  onPress,
  previous,
  next,
}: {
  id: string;
  selected: boolean;
  label: string;
  onPress: () => void;
  previous: { id: string; onPress: () => void };
  next: { id: string; onPress: () => void };
}) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const keyboard = useCompositeItemKeyboard({ id, selected, onPress, previous, next });
  return (
    <Pressable
      {...keyboard}
      aria-selected={selected}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.button,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: selected ? theme.accent : theme.borderStrong,
          backgroundColor: selected ? theme.accentSoft : pressed ? theme.hover : theme.card,
        },
        focus.focusStyle,
      ]}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: selected ? theme.accent : theme.ink }}>{label}</Text>
    </Pressable>
  );
}

function FilterChip({
  id,
  selected,
  label,
  onPress,
  previous,
  next,
}: {
  id: string;
  selected: boolean;
  label: string;
  onPress: () => void;
  previous: { id: string; onPress: () => void };
  next: { id: string; onPress: () => void };
}) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const keyboard = useCompositeItemKeyboard({ id, selected, onPress, previous, next });
  return (
    <Pressable
      {...keyboard}
      aria-checked={selected}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? theme.accent : theme.borderStrong,
          backgroundColor: selected ? theme.accentSoft : pressed ? theme.hover : theme.card,
        },
        focus.focusStyle,
      ]}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: selected ? theme.accent : theme.ink }}>{label}</Text>
    </Pressable>
  );
}

function rentInputStyle(theme: ReturnType<typeof useTheme>) {
  return {
    minWidth: 125,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.card,
    color: theme.ink,
    fontFamily: fontFamilyForWeight("500"),
    fontSize: 15,
  };
}
