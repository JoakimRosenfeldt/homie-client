import { useMutation } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { listingsApi } from "@/features/listings/api";
import {
  AmenityGrid,
  FooterActions,
  ListingScreen,
  LoadingCard,
  MessageCard,
  SectionCard,
  StepProgress,
} from "@/features/listings/components";
import { useListingDraft } from "@/features/listings/hooks";
import { getStepRoute } from "@/features/listings/navigation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function ListingFeaturesRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "Features" }} />
      {!isConfigured ? <FeatureSetupMissing /> : <ListingFeaturesScreen listingId={listingId} />}
    </>
  );
}

function FeatureSetupMissing() {
  return (
    <ListingScreen>
      <MessageCard title="Convex is not configured" description="Set EXPO_PUBLIC_CONVEX_URL before editing listings." tone="warning" />
    </ListingScreen>
  );
}

function ListingFeaturesScreen({ listingId }: { listingId?: string }) {
  const { draft, ownerKey, error, isLoading } = useListingDraft(listingId);
  const saveSection = useMutation(listingsApi.saveSection);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      return;
    }

    setAmenities(draft.amenities);
  }, [draft]);

  if (isLoading || !draft) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading the feature list." />
      </ListingScreen>
    );
  }

  const handleToggle = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity],
    );
  };

  const handleContinue = async () => {
    if (!ownerKey || !listingId) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await saveSection({
        listingId: draft._id as never,
        ownerKey,
        section: "features",
        payload: { amenities: amenities as never[] },
      });

      router.push(getStepRoute(listingId, "location") as never);
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "We couldn't save the features section.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ListingScreen
      footer={
        <FooterActions
          secondaryLabel="Back"
          onSecondaryPress={() => router.push(getStepRoute(listingId ?? draft._id, "details") as never)}
          primaryLabel={isSaving ? "Saving..." : "Save and continue"}
          onPrimaryPress={handleContinue}
          primaryDisabled={isSaving}
        />
      }>
      <StepProgress currentStep="features" completedSteps={draft.completion.completedSteps} />
      {error ? <MessageCard title="We couldn't unlock this draft" description={error} tone="danger" /> : null}
      {saveError ? <MessageCard title="Features not saved" description={saveError} tone="danger" /> : null}

      <SectionCard
        title="Amenities"
        description="This step is optional for publish, but it makes the listing easier to scan. Leave items off if they aren’t included.">
        <AmenityGrid selectedAmenities={amenities} onToggle={handleToggle} />
      </SectionCard>
    </ListingScreen>
  );
}
