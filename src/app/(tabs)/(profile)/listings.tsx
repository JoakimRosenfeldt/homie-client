import { useMutation } from "convex/react";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  FooterActions,
  ListingScreen,
  ListingSummaryCard,
  LoadingCard,
  MessageCard,
  SectionCard,
  Tag,
  useListingColors,
} from "@/features/listings/components";
import { listingsApi } from "@/features/listings/api";
import { useMyListings } from "@/features/listings/hooks";
import { getListingDetailRoute, getResumeStepFromCompletedSteps, getStepRoute } from "@/features/listings/navigation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

type ListingFilter = "all" | "draft" | "published";

export default function MyListingsRoute() {
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "My Listings" }} />
      {!isConfigured ? <MyListingsMissing /> : <MyListingsScreen />}
    </>
  );
}

function MyListingsMissing() {
  return (
    <ListingScreen>
      <MessageCard
        title="Convex is not configured"
        description="Set EXPO_PUBLIC_CONVEX_URL before opening My Listings."
        tone="warning"
      />
    </ListingScreen>
  );
}

function MyListingsScreen() {
  const colors = useListingColors();
  const { listings, error, isLoading, ownerKey } = useMyListings();
  const removeDraft = useMutation(listingsApi.removeDraft);
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [pendingListingIds, setPendingListingIds] = useState<string[]>([]);
  const [removeError, setRemoveError] = useState<string | null>(null);

  if (isLoading || listings === undefined) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading drafts and published listings for this device." />
      </ListingScreen>
    );
  }

  const visibleListings = listings.filter((listing) => {
    if (filter === "all") {
      return true;
    }

    return listing.status === filter;
  });

  const handleRemoveDraft = async (listingId: string) => {
    if (!ownerKey) {
      return;
    }

    setRemoveError(null);
    setPendingListingIds((current) => [...current, listingId]);

    try {
      await removeDraft({
        listingId: listingId as never,
        ownerKey,
      });
    } catch (caughtError) {
      setRemoveError(caughtError instanceof Error ? caughtError.message : "We couldn't remove the draft.");
    } finally {
      setPendingListingIds((current) => current.filter((currentListingId) => currentListingId !== listingId));
    }
  };

  return (
    <ListingScreen>
      {error ? <MessageCard title="This device key isn't ready" description={error} tone="danger" /> : null}
      {removeError ? <MessageCard title="Draft not removed" description={removeError} tone="danger" /> : null}

      <SectionCard
        title="My Listings"
        description="Drafts can only be resumed on this device. Published listings open the public detail screen.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["all", "draft", "published"] as const).map((item) => {
            const isSelected = item === filter;
            return (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
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
                  {item === "all" ? "All" : item === "draft" ? "Drafts" : "Published"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      {visibleListings.length === 0 ? (
        <SectionCard
          title="No listings yet"
          description="Create a listing from the center create button. A draft is stored in Convex and linked to this device key.">
          <FooterActions primaryLabel="Create a listing" onPrimaryPress={() => router.push("/listings/new" as never)} />
        </SectionCard>
      ) : (
        visibleListings.map((listing) => (
          <Pressable
            key={listing._id}
            onPress={() => {
              if (listing.status === "draft") {
                router.push(getStepRoute(listing._id, getResumeStepFromCompletedSteps(listing.completedSteps)) as never);
                return;
              }

              router.push(getListingDetailRoute(listing._id) as never);
            }}>
            <ListingSummaryCard
              listing={listing}
              action={
                listing.status === "draft" ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      disabled={!ownerKey || pendingListingIds.includes(listing._id)}
                      onPress={(event) => {
                        event.stopPropagation();
                        void handleRemoveDraft(listing._id);
                      }}
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        borderCurve: "continuous",
                        backgroundColor: colors.cardSecondary,
                        borderWidth: 1,
                        borderColor: colors.danger,
                        opacity: !ownerKey || pendingListingIds.includes(listing._id) ? 0.6 : 1,
                      }}>
                      <Text
                        selectable
                        style={{
                          fontSize: 14,
                          lineHeight: 18,
                          fontWeight: "700",
                          color: colors.danger,
                        }}>
                        {pendingListingIds.includes(listing._id) ? "Removing..." : "Remove draft"}
                      </Text>
                    </Pressable>
                  </View>
                ) : undefined
              }
            />
          </Pressable>
        ))
      )}
    </ListingScreen>
  );
}
