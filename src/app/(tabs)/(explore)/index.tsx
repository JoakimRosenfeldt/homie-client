import { type ReactNode, useDeferredValue, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";

import {
  LoadingCard,
  MessageCard,
  PublicListingCard,
  ResponsiveColumns,
  SectionCard,
  useListingColors,
} from "@/features/listings/components";
import { type ListingExploreFilters, type ListingExploreItem } from "@/features/listings/model";
import { usePublishedListings } from "@/features/listings/hooks";
import { parseOptionalNumber } from "@/features/listings/validation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

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
  const [filters, setFilters] = useState<ListingExploreFilters>(DEFAULT_FILTERS);
  const [minRentText, setMinRentText] = useState("");
  const [maxRentText, setMaxRentText] = useState("");
  const deferredSearchText = useDeferredValue(filters.searchText);
  const deferredFilters = useDeferredValue({
    ...filters,
    searchText: deferredSearchText,
  });
  const today = getStartOfToday();

  const visibleListings = (listings ?? []).filter((listing) => matchesFilters(listing, deferredFilters, today));

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setMinRentText("");
    setMaxRentText("");
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
  const showNoMatches = listings.length > 0 && visibleListings.length === 0 && activeFilters;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        data={visibleListings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>
            <PublicListingCard listing={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, gap: 16, marginBottom: 16 }}>
            <SectionCard>
              <View style={{ gap: 14 }}>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    lineHeight: 21,
                    color: colors.body,
                  }}>
                  Browse the latest published listings and refine the feed with quick local filters.
                </Text>

                <View style={{ gap: 8 }}>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      lineHeight: 20,
                      fontWeight: "700",
                      color: colors.title,
                    }}>
                    Search
                  </Text>
                  <TextInput
                    value={filters.searchText}
                    onChangeText={(searchText) => setFilters((current) => ({ ...current, searchText }))}
                    placeholder="Search title, summary, or location"
                    placeholderTextColor={colors.body}
                    style={{
                      minHeight: 54,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: 18,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: colors.border,
                      color: colors.title,
                      backgroundColor: colors.cardSecondary,
                      fontSize: 16,
                      lineHeight: 22,
                    }}
                  />
                </View>

                <FilterChipGroup
                  label="Property type"
                  selectedValue={filters.propertyType ?? "all"}
                  options={PROPERTY_TYPE_CHIPS}
                  onSelect={(propertyType) => setFilters((current) => ({ ...current, propertyType }))}
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

                <FilterChipGroup
                  label="Availability"
                  selectedValue={filters.availability}
                  options={AVAILABILITY_CHIPS}
                  onSelect={(availability) => setFilters((current) => ({ ...current, availability }))}
                />

                <Text
                  selectable
                  style={{
                    fontSize: 13,
                    lineHeight: 18,
                    fontWeight: "600",
                    color: colors.body,
                  }}>
                  {visibleListings.length} listing{visibleListings.length === 1 ? "" : "s"}
                </Text>
              </View>
            </SectionCard>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>
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
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
        }}
      />
    </View>
  );
}

function ExploreScreenContainer({ children }: { children: ReactNode }) {
  const colors = useListingColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 20 }}>
      <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>{children}</View>
    </View>
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
                borderRadius: 999,
                borderCurve: "continuous",
                backgroundColor: isSelected ? colors.accent : colors.cardSecondary,
                borderWidth: 1,
                borderColor: isSelected ? colors.accent : colors.border,
              }}>
              <Text
                selectable
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  fontWeight: "700",
                  color: isSelected ? "#FFFFFF" : colors.title,
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
          borderRadius: 18,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border,
          color: colors.title,
          backgroundColor: colors.cardSecondary,
          fontSize: 16,
          lineHeight: 22,
        }}
      />
    </View>
  );
}
