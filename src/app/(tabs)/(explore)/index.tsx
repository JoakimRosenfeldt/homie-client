import { Image } from "expo-image";
import { useMutation } from "convex/react";
import { type Dispatch, type ReactNode, type RefObject, type SetStateAction, useDeferredValue, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  LoadingCard,
  MessageCard,
  PublicListingCard,
  ResponsiveColumns,
  useListingColors,
} from "@/features/listings/components";
import { listingsApi } from "@/features/listings/api";
import { type ListingExploreFilters, type ListingExploreItem } from "@/features/listings/model";
import { usePublishedListings, useSavedListingIds } from "@/features/listings/hooks";
import { parseOptionalNumber } from "@/features/listings/validation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";
import { homieRadii, homieSpacing } from "@/theme/homie";
import { homieBrandTitle, homieType } from "@/theme/typography";

const DEFAULT_FILTERS: ListingExploreFilters = {
  searchText: "",
  propertyType: "all",
  availability: "any",
};

const PROPERTY_TYPE_CHIPS: { value: NonNullable<ListingExploreFilters["propertyType"]>; label: string }[] = [
  { value: "all", label: "All" },
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "room", label: "Room" },
];

const AVAILABILITY_CHIPS: { value: ListingExploreFilters["availability"]; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "availableNow", label: "Available now" },
  { value: "next30Days", label: "Next 30 days" },
];

function getStartOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function parseListingDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function hasActiveFilters(filters: ListingExploreFilters) {
  return Boolean(
    filters.searchText.trim() ||
      (filters.propertyType && filters.propertyType !== "all") ||
      typeof filters.minRent === "number" ||
      typeof filters.maxRent === "number" ||
      filters.availability !== "any",
  );
}

function getActiveFilterCount(filters: ListingExploreFilters) {
  let count = 0;

  if (filters.propertyType && filters.propertyType !== "all") {
    count += 1;
  }

  if (typeof filters.minRent === "number" || typeof filters.maxRent === "number") {
    count += 1;
  }

  if (filters.availability !== "any") {
    count += 1;
  }

  return count;
}

function matchesSearch(listing: ListingExploreItem, searchText: string) {
  if (!searchText) {
    return true;
  }

  return [listing.title, listing.summary, listing.publicLocationLabel]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(searchText));
}

function matchesRent(listing: ListingExploreItem, filters: ListingExploreFilters) {
  const hasMin = typeof filters.minRent === "number";
  const hasMax = typeof filters.maxRent === "number";

  if (!hasMin && !hasMax) {
    return true;
  }

  if (typeof listing.monthlyRent !== "number") {
    return false;
  }

  if (hasMin && listing.monthlyRent < filters.minRent!) {
    return false;
  }

  if (hasMax && listing.monthlyRent > filters.maxRent!) {
    return false;
  }

  return true;
}

function matchesAvailability(listing: ListingExploreItem, availability: ListingExploreFilters["availability"], today: Date) {
  if (availability === "any") {
    return true;
  }

  const availableFrom = parseListingDate(listing.availableFrom);
  if (!availableFrom) {
    return false;
  }

  if (availability === "availableNow") {
    return availableFrom.getTime() <= today.getTime();
  }

  return availableFrom.getTime() <= addDays(today, 30).getTime();
}

function matchesFilters(listing: ListingExploreItem, filters: ListingExploreFilters, today: Date) {
  const normalizedSearch = filters.searchText.trim().toLowerCase();

  if (!matchesSearch(listing, normalizedSearch)) {
    return false;
  }

  if (filters.propertyType && filters.propertyType !== "all" && listing.propertyType !== filters.propertyType) {
    return false;
  }

  if (!matchesRent(listing, filters)) {
    return false;
  }

  return matchesAvailability(listing, filters.availability, today);
}

type ExploreDiscoverHeaderProps = {
  colors: ReturnType<typeof useListingColors>;
  filters: ListingExploreFilters;
  setFilters: Dispatch<SetStateAction<ListingExploreFilters>>;
  searchInputRef: RefObject<TextInput | null>;
  saveError: string | null;
  savedListingsError: string | null;
  areFiltersVisible: boolean;
  setAreFiltersVisible: Dispatch<SetStateAction<boolean>>;
  activeFilterCount: number;
  minRentText: string;
  setMinRentText: (value: string) => void;
  maxRentText: string;
  setMaxRentText: (value: string) => void;
  clearFilters: () => void;
  visibleCount: number;
};

function ExploreDiscoverHeader({
  colors,
  filters,
  setFilters,
  searchInputRef,
  saveError,
  savedListingsError,
  areFiltersVisible,
  setAreFiltersVisible,
  activeFilterCount,
  minRentText,
  setMinRentText,
  maxRentText,
  setMaxRentText,
  clearFilters,
  visibleCount,
}: ExploreDiscoverHeaderProps) {
  const filtersPrimary = areFiltersVisible || activeFilterCount > 0;

  return (
    <View style={{ gap: homieSpacing.section, marginBottom: homieSpacing.section }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: homieSpacing.page,
          paddingVertical: 12,
        }}>
        <Text style={[homieBrandTitle, { color: colors.accentPressed }]}>Homie</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Focus search"
            onPress={() => searchInputRef.current?.focus()}
            hitSlop={10}>
            <Image source="sf:magnifyingglass" style={{ width: 24, height: 24, tintColor: colors.body }} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Map view" hitSlop={10}>
            <Image source="sf:map" style={{ width: 24, height: 24, tintColor: colors.accentPressed }} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: homieSpacing.page, gap: homieSpacing.section }}>
        <View style={{ position: "relative" }}>
          <View
            style={{
              position: "absolute",
              left: 18,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              zIndex: 1,
              pointerEvents: "none",
            }}>
            <Image source="sf:location.fill" style={{ width: 22, height: 22, tintColor: colors.body }} />
          </View>
          <TextInput
            ref={searchInputRef}
            value={filters.searchText}
            onChangeText={(searchText) => setFilters((current) => ({ ...current, searchText }))}
            placeholder="Where do you want to live?"
            placeholderTextColor={`${colors.body}99`}
            style={{
              minHeight: 56,
              paddingLeft: 54,
              paddingRight: 18,
              paddingVertical: 16,
              borderRadius: homieRadii.control,
              borderCurve: "continuous",
              borderWidth: 0,
              color: colors.title,
              backgroundColor: colors.cardSecondary,
              ...homieType.searchInput,
              shadowColor: "#261817",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
            }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
          <Pressable
            onPress={() => setAreFiltersVisible((current) => !current)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 18,
              paddingVertical: 11,
              borderRadius: homieRadii.full,
              borderCurve: "continuous",
              backgroundColor: filtersPrimary ? colors.accent : colors.surfaceHigh,
            }}>
            <Image
              source="sf:slider.horizontal.3"
              style={{
                width: 16,
                height: 16,
                tintColor: filtersPrimary ? colors.onAccent : colors.title,
              }}
            />
            <Text
              style={[
                homieType.label,
                { color: filtersPrimary ? colors.onAccent : colors.title, fontSize: 13 },
              ]}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAreFiltersVisible(true)}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 11,
              borderRadius: homieRadii.full,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceHigh,
            }}>
            <Text style={[homieType.label, { color: colors.title, fontSize: 13 }]}>Price range</Text>
          </Pressable>

          {PROPERTY_TYPE_CHIPS.map((option) => {
            const isSelected = (filters.propertyType ?? "all") === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFilters((current) => ({ ...current, propertyType: option.value }))}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: homieRadii.full,
                  borderCurve: "continuous",
                  backgroundColor: isSelected ? colors.accent : colors.surfaceHigh,
                }}>
                <Text
                  style={[
                    homieType.label,
                    { color: isSelected ? colors.onAccent : colors.title, fontSize: 13 },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => setAreFiltersVisible(true)}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 11,
              borderRadius: homieRadii.full,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceHigh,
            }}>
            <Text style={[homieType.label, { color: colors.title, fontSize: 13 }]}>Move-in</Text>
          </Pressable>
        </ScrollView>
      </View>

      {saveError || savedListingsError ? (
        <View style={{ paddingHorizontal: homieSpacing.page }}>
          <MessageCard
            title="Saved listings unavailable"
            description={saveError ?? savedListingsError ?? "We couldn't update saved listings."}
            tone="danger"
          />
        </View>
      ) : null}

      {areFiltersVisible ? (
        <View style={{ paddingHorizontal: homieSpacing.page, gap: homieSpacing.section }}>
          <FilterChipGroup
            label="Availability"
            selectedValue={filters.availability}
            options={AVAILABILITY_CHIPS}
            onSelect={(availability) => setFilters((current) => ({ ...current, availability }))}
          />

          <ResponsiveColumns>
            <RentInput
              label="Min rent"
              value={minRentText}
              onChangeText={(value) => {
                setMinRentText(value);
                setFilters((current) => ({ ...current, minRent: parseOptionalNumber(value) }));
              }}
            />
            <RentInput
              label="Max rent"
              value={maxRentText}
              onChangeText={(value) => {
                setMaxRentText(value);
                setFilters((current) => ({ ...current, maxRent: parseOptionalNumber(value) }));
              }}
            />
          </ResponsiveColumns>

          {activeFilterCount > 0 ? (
            <Pressable onPress={clearFilters}>
              <Text style={[homieType.caption, { fontWeight: "700", color: colors.accent }]}>Clear filters</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          marginHorizontal: homieSpacing.page,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingBottom: 14,
          gap: 4,
        }}>
        <Text style={[homieType.headlineSection, { color: colors.title }]}>Available listings</Text>
        <Text style={[homieType.caption, { color: colors.body }]}>
          {visibleCount} propert{visibleCount === 1 ? "y" : "ies"} match your search
        </Text>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const { isConfigured } = useConvexConfiguration();

  return !isConfigured ? <ExploreMissing /> : <ExploreListingsScreen />;
}

function ExploreMissing() {
  return (
    <View style={{ flex: 1 }}>
      <ExploreScreenContainer>
        <MessageCard
          title="Convex is not configured"
          description="Set EXPO_PUBLIC_CONVEX_URL before browsing published listings."
          tone="warning"
        />
      </ExploreScreenContainer>
    </View>
  );
}

function ExploreListingsScreen() {
  const colors = useListingColors();
  const { listings, isLoading, error } = usePublishedListings();
  const { ownerKey, savedListingIds, error: savedListingsError } = useSavedListingIds();
  const setSaved = useMutation(listingsApi.setSaved);
  const [filters, setFilters] = useState<ListingExploreFilters>(DEFAULT_FILTERS);
  const [minRentText, setMinRentText] = useState("");
  const [maxRentText, setMaxRentText] = useState("");
  const [areFiltersVisible, setAreFiltersVisible] = useState(false);
  const [pendingListingIds, setPendingListingIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const deferredSearchText = useDeferredValue(filters.searchText);
  const deferredFilters = useDeferredValue({
    ...filters,
    searchText: deferredSearchText,
  });
  const today = getStartOfToday();
  const savedListingIdSet = new Set((savedListingIds ?? []).map((savedListingId) => String(savedListingId)));

  const visibleListings = (listings ?? []).filter((listing) => matchesFilters(listing, deferredFilters, today));

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setMinRentText("");
    setMaxRentText("");
  };

  const handleToggleSaved = async (listingId: string, isSaved: boolean) => {
    if (!ownerKey) {
      return;
    }

    setSaveError(null);
    setPendingListingIds((current) => [...current, listingId]);

    try {
      await setSaved({
        listingId: listingId as never,
        ownerKey,
        isSaved,
      });
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "We couldn't update the saved listing.");
    } finally {
      setPendingListingIds((current) => current.filter((currentListingId) => currentListingId !== listingId));
    }
  };

  if (isLoading || listings === undefined) {
    return (
      <ExploreScreenContainer>
        <LoadingCard label="Loading published listings." />
      </ExploreScreenContainer>
    );
  }

  if (error) {
    return (
      <ExploreScreenContainer>
        <MessageCard title="Explore is unavailable" description={error} tone="danger" />
      </ExploreScreenContainer>
    );
  }

  const activeFilters = hasActiveFilters(filters);
  const activeFilterCount = getActiveFilterCount(filters);
  const showNoMatches = listings.length > 0 && visibleListings.length === 0 && activeFilters;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        data={visibleListings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, paddingHorizontal: homieSpacing.page }}>
            <PublicListingCard
              listing={item}
              isSaved={savedListingIdSet.has(item._id)}
              isSavePending={pendingListingIds.includes(item._id)}
              isSaveDisabled={!ownerKey}
              onToggleSaved={() => handleToggleSaved(item._id, !savedListingIdSet.has(item._id))}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        ListHeaderComponent={
          <ExploreDiscoverHeader
            colors={colors}
            filters={filters}
            setFilters={setFilters}
            searchInputRef={searchInputRef}
            saveError={saveError}
            savedListingsError={savedListingsError}
            areFiltersVisible={areFiltersVisible}
            setAreFiltersVisible={setAreFiltersVisible}
            activeFilterCount={activeFilterCount}
            minRentText={minRentText}
            setMinRentText={setMinRentText}
            maxRentText={maxRentText}
            setMaxRentText={setMaxRentText}
            clearFilters={clearFilters}
            visibleCount={visibleListings.length}
          />
        }
        ListEmptyComponent={
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, paddingHorizontal: homieSpacing.page }}>
            {showNoMatches ? (
              <MessageCard
                title="No listings match these filters."
                description="Try widening the rent range, switching availability, or clearing the current filters."
                actionLabel="Clear filters"
                onActionPress={clearFilters}
              />
            ) : (
              <MessageCard
                title="No listings have been published yet."
                description="Explore will fill in once the first published rental is live."
              />
            )}
          </View>
        }
        contentContainerStyle={{
          paddingBottom: 120,
          flexGrow: 1,
        }}
      />
    </SafeAreaView>
  );
}

function ExploreScreenContainer({ children }: { children: ReactNode }) {
  const colors = useListingColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: homieSpacing.page, paddingTop: homieSpacing.page }}>
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

function FilterChipGroup<TValue extends string>({
  label,
  selectedValue,
  options,
  onSelect,
}: {
  label: string;
  selectedValue: TValue;
  options: { value: TValue; label: string }[];
  onSelect: (value: TValue) => void;
}) {
  const colors = useListingColors();

  return (
    <View style={{ gap: 8 }}>
      <Text
        selectable
        style={{
          fontSize: 15,
          lineHeight: 20,
          fontWeight: "700",
          color: colors.title,
        }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: homieRadii.full,
                borderCurve: "continuous",
                backgroundColor: isSelected ? colors.accent : colors.cardSecondary,
                borderWidth: 0,
              }}>
              <Text
                selectable
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  fontWeight: "700",
                  color: isSelected ? colors.onAccent : colors.title,
                }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RentInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const colors = useListingColors();

  return (
    <View style={{ gap: 8 }}>
      <Text
        selectable
        style={{
          fontSize: 15,
          lineHeight: 20,
          fontWeight: "700",
          color: colors.title,
        }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.body}
        keyboardType="number-pad"
        style={{
          minHeight: 54,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: homieRadii.control,
          borderCurve: "continuous",
          borderWidth: 0,
          color: colors.title,
          backgroundColor: colors.cardSecondary,
          fontSize: 16,
          lineHeight: 22,
        }}
      />
    </View>
  );
}
