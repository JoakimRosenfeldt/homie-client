import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { listingsApi } from "@/features/listings/api";
import {
  AmenityTags,
  ChecklistCard,
  DetailMetric,
  FooterActions,
  ListingScreen,
  LoadingCard,
  MessageCard,
  ResponsiveColumns,
  SectionCard,
  StepProgress,
  Tag,
} from "@/features/listings/components";
import { formatCurrency, formatDate, formatLeaseWindow, formatSize, formatRooms, getListingHeadline } from "@/features/listings/format";
import { useListingDraft } from "@/features/listings/hooks";
import { getListingDetailRoute, getStepRoute } from "@/features/listings/navigation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function ListingReviewRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "Review & Publish" }} />
      {!isConfigured ? <ReviewSetupMissing /> : <ListingReviewScreen listingId={listingId} />}
    </>
  );
}

function ReviewSetupMissing() {
  return (
    <ListingScreen>
      <MessageCard title="Convex is not configured" description="Set EXPO_PUBLIC_CONVEX_URL before editing listings." tone="warning" />
    </ListingScreen>
  );
}

function ListingReviewScreen({ listingId }: { listingId?: string }) {
  const { draft, ownerKey, error, isLoading } = useListingDraft(listingId);
  const publish = useMutation(listingsApi.publish);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  if (isLoading || !draft) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading the review screen." />
      </ListingScreen>
    );
  }

  const firstPhoto = draft.photos[0];

  const handlePublish = async () => {
    if (!ownerKey || !listingId) {
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const result = await publish({
        listingId: draft._id as never,
        ownerKey,
      });

      router.replace(getListingDetailRoute(result.listingId) as never);
    } catch (caughtError) {
      setPublishError(caughtError instanceof Error ? caughtError.message : "We couldn't publish the listing.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <ListingScreen
      footer={
        <FooterActions
          secondaryLabel="Back"
          onSecondaryPress={() => router.push(getStepRoute(listingId ?? draft._id, "photos") as never)}
          primaryLabel={isPublishing ? "Publishing..." : "Publish listing"}
          onPrimaryPress={handlePublish}
          primaryDisabled={isPublishing || !draft.completion.canPublish}
        />
      }>
      <StepProgress currentStep="review" completedSteps={draft.completion.completedSteps} />
      {error ? <MessageCard title="We couldn't unlock this draft" description={error} tone="danger" /> : null}
      {publishError ? <MessageCard title="Publish failed" description={publishError} tone="danger" /> : null}
      {!draft.completion.canPublish ? (
        <MessageCard
          title="This draft isn't ready to publish yet"
          description="Finish every required item in the checklist below. Publish is blocked until the draft passes the full Convex validation rules."
          tone="warning"
        />
      ) : null}

      <ChecklistCard checklist={draft.completion.checklist} />

      <SectionCard title="Preview" description="This is the public-facing information that will appear after publish.">
        {firstPhoto?.url ? (
          <Image
            source={firstPhoto.url}
            contentFit="cover"
            style={{
              width: "100%",
              aspectRatio: 1.45,
              borderRadius: 22,
            }}
          />
        ) : null}

        <View style={{ gap: 8 }}>
          <Tag label={draft.rentalArrangement === "sublease" ? "Sublease" : "Standard rental"} />
          <View style={{ gap: 4 }}>
            <MessageCard
              title={getListingHeadline(draft)}
              description={draft.summary?.trim() || "Add a short summary to strengthen the listing card and review preview."}
            />
          </View>
        </View>

        <ResponsiveColumns>
          <DetailMetric label="Rent" value={formatCurrency(draft.monthlyRent, draft.currency)} />
          <DetailMetric label="Location" value={draft.publicLocationLabel ?? "Private location"} />
        </ResponsiveColumns>
        <ResponsiveColumns>
          <DetailMetric label="Size" value={formatSize(draft.sizeSqm)} />
          <DetailMetric label="Availability" value={formatLeaseWindow(draft)} />
        </ResponsiveColumns>
        <ResponsiveColumns>
          <DetailMetric label="Bedrooms" value={formatRooms("bedroom", draft.bedroomCount)} />
          <DetailMetric label="Bathrooms" value={formatRooms("bathroom", draft.bathroomCount)} />
        </ResponsiveColumns>
      </SectionCard>

      <SectionCard title="Description" description="Long text and renter expectations are previewed exactly as entered.">
        <View style={{ gap: 10 }}>
          <Tag label={`Available from ${formatDate(draft.availableFrom)}`} />
          <AmenityTags amenities={draft.amenities} />
          <MessageCard
            title="Listing description"
            description={draft.description?.trim() || "Add more detail in Basics before you publish."}
          />
        </View>
      </SectionCard>
    </ListingScreen>
  );
}
