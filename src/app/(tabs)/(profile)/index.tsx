import { useMutation } from "convex/react";
import { Link, router } from "expo-router";
import React from "react";
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

const PROFILE_PREVIEW_LIMIT = 3;

export default function ProfileScreen() {
  const { isConfigured } = useConvexConfiguration();

  return !isConfigured ? <ProfileMissing /> : <ProfileListingsScreen />;
}

function ProfileMissing() {
  return (
    <ListingScreen>
      <MessageCard
        title="Convex is not configured"
        description="Set EXPO_PUBLIC_CONVEX_URL before loading listings on the profile page."
        tone="warning"
      />
    </ListingScreen>
  );
}

function ProfileListingsScreen() {
  const colors = useListingColors();
  const { listings, error, isLoading, ownerKey } = useMyListings();
  const removeDraft = useMutation(listingsApi.removeDraft);
  const [pendingListingIds, setPendingListingIds] = React.useState<string[]>([]);
  const [removeError, setRemoveError] = React.useState<string | null>(null);

  if (isLoading || listings === undefined) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading listings linked to this device." />
      </ListingScreen>
    );
  }

  const draftCount = listings.filter((listing) => listing.status === "draft").length;
  const publishedCount = listings.filter((listing) => listing.status === "published").length;
  const previewListings = listings.slice(0, PROFILE_PREVIEW_LIMIT);

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
        title="Listings on this device"
        description="Draft recovery is device-based in this proof of concept. Your listings stay linked to this device until signed-in ownership is added.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Tag label={`${listings.length} total`} />
          <Tag label={`${draftCount} draft${draftCount === 1 ? "" : "s"}`} />
          <Tag label={`${publishedCount} published`} />
        </View>
      </SectionCard>

      {listings.length === 0 ? (
        <SectionCard
          title="No listings yet"
          description="Create a listing from the center create button. A draft is stored in Convex and linked to this device key.">
          <FooterActions primaryLabel="Create a listing" onPrimaryPress={() => router.push("/listings/new" as never)} />
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Recent listings"
            description="Resume unfinished drafts here or jump straight into the public detail screen for anything already published.">
            <Link href={"/(tabs)/(profile)/listings" as never} asChild>
              <Pressable
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderCurve: "continuous",
                  backgroundColor: colors.accentSoft,
                  borderWidth: 1,
                  borderColor: colors.accent,
                }}>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    lineHeight: 18,
                    fontWeight: "700",
                    color: colors.accent,
                  }}>
                  Open all listings
                </Text>
              </Pressable>
            </Link>
          </SectionCard>

          {previewListings.map((listing) => (
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
          ))}
        </>
      )}
    </ListingScreen>
  );
}
