import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import {
  AmenityTags,
  DetailMetric,
  FooterActions,
  ListingSaveButton,
  ListingScreen,
  LoadingCard,
  MessageCard,
  ResponsiveColumns,
  SectionCard,
  Tag,
} from "@/features/listings/components";
import { formatCurrency, formatDate, formatLeaseWindow, formatSize, formatRooms, getListingHeadline } from "@/features/listings/format";
import { listingsApi } from "@/features/listings/api";
import { useListingDetail, useSavedListingIds } from "@/features/listings/hooks";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function ListingDetailRoute() {
  const { listingId, fromPublish } = useLocalSearchParams<{ listingId: string; fromPublish?: string }>();
  const { isConfigured } = useConvexConfiguration();
  const isPublishConfirmation = fromPublish === "true";

  return (
    <>
      <Stack.Screen
        options={{
          title: isPublishConfirmation ? "Published" : "Listing",
          headerBackVisible: !isPublishConfirmation,
          gestureEnabled: !isPublishConfirmation,
        }}
      />
      {!isConfigured ? (
        <ListingDetailMissing />
      ) : (
        <ListingDetailScreen listingId={listingId} isPublishConfirmation={isPublishConfirmation} />
      )}
    </>
  );
}

function ListingDetailMissing() {
  return (
    <ListingScreen>
      <MessageCard title="Convex is not configured" description="Set EXPO_PUBLIC_CONVEX_URL before loading listing details." tone="warning" />
    </ListingScreen>
  );
}

function ListingDetailScreen({
  listingId,
  isPublishConfirmation,
}: {
  listingId?: string;
  isPublishConfirmation: boolean;
}) {
  const detail = useListingDetail(listingId);
  const { ownerKey, savedListingIds, error: savedListingsError } = useSavedListingIds();
  const setSaved = useMutation(listingsApi.setSaved);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavePending, setIsSavePending] = useState(false);

  const savedListingIdSet = new Set((savedListingIds ?? []).map((savedListingId) => String(savedListingId)));
  const isSaved = Boolean(listingId && savedListingIdSet.has(listingId));

  const handleToggleSaved = async () => {
    if (!ownerKey || !listingId) {
      return;
    }

    setSaveError(null);
    setIsSavePending(true);

    try {
      await setSaved({
        listingId: listingId as never,
        ownerKey,
        isSaved: !isSaved,
      });
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "We couldn't update the saved listing.");
    } finally {
      setIsSavePending(false);
    }
  };

  if (detail === undefined) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading the published listing." />
      </ListingScreen>
    );
  }

  if (!detail) {
    return (
      <ListingScreen>
        <MessageCard
          title="Listing not found"
          description="This detail screen only loads published listings, and full street addresses stay private in Convex."
          tone="warning"
        />
      </ListingScreen>
    );
  }

  return (
    <ListingScreen
      footer={
        isPublishConfirmation ? (
          <FooterActions
            primaryLabel="Ok"
            onPrimaryPress={() => router.replace("/(tabs)/(explore)" as never)}
          />
        ) : undefined
      }>
      {isPublishConfirmation ? (
        <MessageCard
          title="Listing published"
          description="Your rental listing is now live. Tap Ok to return to the front page."
          tone="success"
        />
      ) : null}
      {saveError || savedListingsError ? (
        <MessageCard
          title="Saved listings unavailable"
          description={saveError ?? savedListingsError ?? "We couldn't update saved listings."}
          tone="danger"
        />
      ) : null}
      <SectionCard title={getListingHeadline(detail)} description={detail.summary ?? "Published listing detail"}>
        {detail.photos.length > 0 ? (
          <View style={{ gap: 12 }}>
            {detail.photos.map((photo, index) =>
              photo.url ? (
                <Image
                  key={photo.storageId}
                  source={photo.url}
                  contentFit="cover"
                  style={{
                    width: "100%",
                    aspectRatio: index === 0 ? 16 / 9 : 1.3,
                    borderRadius: 22,
                  }}
                />
              ) : null,
            )}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Tag label={detail.rentalArrangement === "sublease" ? "Sublease" : "Standard rental"} />
          <Tag label={`Published ${formatDate(new Date(detail.publishedAt).toISOString().slice(0, 10))}`} />
        </View>
        {!isPublishConfirmation ? (
          <View style={{ alignItems: "flex-start" }}>
            <ListingSaveButton
              isSaved={isSaved}
              isPending={isSavePending}
              disabled={!ownerKey}
              onPress={() => {
                void handleToggleSaved();
              }}
            />
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Overview">
        <ResponsiveColumns>
          <DetailMetric label="Rent" value={formatCurrency(detail.monthlyRent, detail.currency)} />
          <DetailMetric label="Location" value={detail.publicLocationLabel ?? "Private location"} />
        </ResponsiveColumns>
        <ResponsiveColumns>
          <DetailMetric label="Size" value={formatSize(detail.sizeSqm)} />
          <DetailMetric label="Availability" value={formatLeaseWindow(detail)} />
        </ResponsiveColumns>
        <ResponsiveColumns>
          <DetailMetric label="Bedrooms" value={formatRooms("bedroom", detail.bedroomCount)} />
          <DetailMetric label="Bathrooms" value={formatRooms("bathroom", detail.bathroomCount)} />
        </ResponsiveColumns>
      </SectionCard>

      <SectionCard title="Description" description={detail.description ?? "No description provided."}>
        <AmenityTags amenities={detail.amenities} />
      </SectionCard>
    </ListingScreen>
  );
}
