import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import {
  AmenityTags,
  DetailMetric,
  ListingScreen,
  LoadingCard,
  MessageCard,
  ResponsiveColumns,
  SectionCard,
  Tag,
} from "@/features/listings/components";
import { formatCurrency, formatDate, formatLeaseWindow, formatSize, formatRooms, getListingHeadline } from "@/features/listings/format";
import { useListingDetail } from "@/features/listings/hooks";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function ListingDetailRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "Listing" }} />
      {!isConfigured ? <ListingDetailMissing /> : <ListingDetailScreen listingId={listingId} />}
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

function ListingDetailScreen({ listingId }: { listingId?: string }) {
  const detail = useListingDetail(listingId);

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
    <ListingScreen>
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
                    aspectRatio: index === 0 ? 1.45 : 1.3,
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
