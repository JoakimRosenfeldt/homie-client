import { useMutation } from "convex/react";
import React from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingCard, MessageCard, PublicListingCard, useListingColors } from "@/features/listings/components";
import { listingsApi } from "@/features/listings/api";
import { useSavedListings } from "@/features/listings/hooks";
import { useConvexConfiguration } from "@/providers/convex-app-provider";
import { homieSpacing } from "@/theme/homie";
import { homieType } from "@/theme/typography";

export default function SavedScreen() {
  const { isConfigured } = useConvexConfiguration();

  return !isConfigured ? <SavedMissing /> : <SavedListingsScreen />;
}

function SavedMissing() {
  return (
    <View style={{ flex: 1 }}>
      <SavedScreenContainer>
        <MessageCard
          title="Convex is not configured"
          description="Set EXPO_PUBLIC_CONVEX_URL before saving or revisiting listings."
          tone="warning"
        />
      </SavedScreenContainer>
    </View>
  );
}

function SavedListingsScreen() {
  const colors = useListingColors();
  const { ownerKey, listings, isLoading, error } = useSavedListings();
  const setSaved = useMutation(listingsApi.setSaved);
  const [pendingListingIds, setPendingListingIds] = React.useState<string[]>([]);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleToggleSaved = async (listingId: string) => {
    if (!ownerKey) {
      return;
    }

    setSaveError(null);
    setPendingListingIds((current) => [...current, listingId]);

    try {
      await setSaved({
        listingId: listingId as never,
        ownerKey,
        isSaved: false,
      });
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "We couldn't update the saved listing.");
    } finally {
      setPendingListingIds((current) => current.filter((currentListingId) => currentListingId !== listingId));
    }
  };

  if (isLoading || listings === undefined) {
    return (
      <SavedScreenContainer>
        <LoadingCard label="Loading your saved listings." />
      </SavedScreenContainer>
    );
  }

  if (error) {
    return (
      <SavedScreenContainer>
        <MessageCard title="Saved listings are unavailable" description={error} tone="danger" />
      </SavedScreenContainer>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        data={listings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, paddingHorizontal: homieSpacing.page }}>
            <PublicListingCard
              listing={item}
              isSaved
              isSavePending={pendingListingIds.includes(item._id)}
              isSaveDisabled={!ownerKey}
              onToggleSaved={() => handleToggleSaved(item._id)}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        ListHeaderComponent={
          <View
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: 980,
              paddingHorizontal: homieSpacing.page,
              marginBottom: homieSpacing.section,
              gap: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingBottom: 16,
            }}>
            <Text style={[homieType.headlineSection, { color: colors.title }]}>Saved listings</Text>
            <Text style={[homieType.bodySmall, { color: colors.body }]}>
              Keep your top picks close. Listings stay on this device until you remove them.
            </Text>
            {saveError ? (
              <MessageCard title="Saved listings unavailable" description={saveError} tone="danger" />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, paddingHorizontal: homieSpacing.page }}>
            <MessageCard
              title="Nothing saved yet"
              description="Tap the heart on a listing card or detail screen to keep it here."
              tone="default"
            />
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

function SavedScreenContainer({ children }: React.PropsWithChildren) {
  const colors = useListingColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: homieSpacing.page,
          paddingTop: homieSpacing.page,
        }}>
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, gap: 16 }}>{children}</View>
      </View>
    </SafeAreaView>
  );
}
