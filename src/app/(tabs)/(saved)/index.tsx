import { useMutation } from "convex/react";
import React from "react";
import { FlatList, Text, View } from "react-native";

import {
  LoadingCard,
  MessageCard,
  PublicListingCard,
  SectionCard,
  useListingColors,
} from "@/features/listings/components";
import { listingsApi } from "@/features/listings/api";
import { useSavedListings } from "@/features/listings/hooks";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

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
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      data={listings}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>
          <PublicListingCard
            listing={item}
            isSaved
            isSavePending={pendingListingIds.includes(item._id)}
            isSaveDisabled={!ownerKey}
            onToggleSaved={() => handleToggleSaved(item._id)}
          />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, gap: 16, marginBottom: 16 }}>
          <SectionCard title="Saved listings" description="Keep your top picks close, compare them later, and drop the ones that no longer fit.">
            <Text
              selectable
              style={{
                fontSize: 15,
                lineHeight: 21,
                color: colors.body,
              }}>
              Saved listings stay tied to this device, so you can come back to them from the explore feed or any listing detail screen.
            </Text>
          </SectionCard>
          {saveError ? <MessageCard title="Saved listings unavailable" description={saveError} tone="danger" /> : null}
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>
          <MessageCard
            title="Nothing saved yet"
            description="Tap Save on a listing card or detail screen to keep it here."
            tone="default"
          />
        </View>
      }
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
      }}
    />
  );
}

function SavedScreenContainer({ children }: React.PropsWithChildren) {
  const colors = useListingColors();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingTop: 20,
      }}>
      <View style={{ alignSelf: "center", width: "100%", maxWidth: 980, gap: 16 }}>{children}</View>
    </View>
  );
}
