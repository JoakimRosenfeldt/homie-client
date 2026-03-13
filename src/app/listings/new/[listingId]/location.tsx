import { useMutation } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { listingsApi } from "@/features/listings/api";
import {
  FooterActions,
  ListingScreen,
  LoadingCard,
  MessageCard,
  ResponsiveColumns,
  SectionCard,
  StepProgress,
  TextField,
} from "@/features/listings/components";
import { useListingDraft } from "@/features/listings/hooks";
import { getStepRoute } from "@/features/listings/navigation";
import { buildPublicLocationLabel } from "@/features/listings/validation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function ListingLocationRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "Location" }} />
      {!isConfigured ? <LocationSetupMissing /> : <ListingLocationScreen listingId={listingId} />}
    </>
  );
}

function LocationSetupMissing() {
  return (
    <ListingScreen>
      <MessageCard title="Convex is not configured" description="Set EXPO_PUBLIC_CONVEX_URL before editing listings." tone="warning" />
    </ListingScreen>
  );
}

function ListingLocationScreen({ listingId }: { listingId?: string }) {
  const { draft, ownerKey, error, isLoading } = useListingDraft(listingId);
  const saveSection = useMutation(listingsApi.saveSection);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("DK");
  const [neighborhood, setNeighborhood] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!draft) {
      return;
    }

    setAddressLine1(draft.addressLine1 ?? "");
    setAddressLine2(draft.addressLine2 ?? "");
    setPostalCode(draft.postalCode ?? "");
    setCity(draft.city ?? "");
    setCountryCode(draft.countryCode ?? "DK");
    setNeighborhood(draft.neighborhood ?? "");
  }, [draft]);

  if (isLoading || !draft) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading the saved address." />
      </ListingScreen>
    );
  }

  const publicLocationLabel = buildPublicLocationLabel({
    neighborhood,
    city,
    countryCode,
  });

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
        section: "location",
        payload: {
          addressLine1,
          addressLine2,
          postalCode,
          city,
          countryCode,
          neighborhood,
          publicLocationLabel,
        },
      });

      router.push(getStepRoute(listingId, "photos") as never);
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "We couldn't save the location section.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ListingScreen
      footer={
        <FooterActions
          secondaryLabel="Back"
          onSecondaryPress={() => router.push(getStepRoute(listingId ?? draft._id, "features") as never)}
          primaryLabel={isSaving ? "Saving..." : "Save and continue"}
          onPrimaryPress={handleContinue}
          primaryDisabled={isSaving}
        />
      }>
      <StepProgress currentStep="location" completedSteps={draft.completion.completedSteps} />
      {error ? <MessageCard title="We couldn't unlock this draft" description={error} tone="danger" /> : null}
      {saveError ? <MessageCard title="Location not saved" description={saveError} tone="danger" /> : null}

      <SectionCard
        title="Private address"
        description="This stays private in Convex. Only the public area preview below is shown on the published listing.">
        <TextField label="Address line 1" value={addressLine1} onChangeText={setAddressLine1} required />
        <TextField label="Address line 2" value={addressLine2} onChangeText={setAddressLine2} helperText="Optional." />
        <ResponsiveColumns>
          <TextField label="Postal code" value={postalCode} onChangeText={setPostalCode} required />
          <TextField label="City" value={city} onChangeText={setCity} required />
        </ResponsiveColumns>
        <ResponsiveColumns>
          <TextField label="Country code" value={countryCode} onChangeText={setCountryCode} required />
          <TextField
            label="Neighborhood"
            value={neighborhood}
            onChangeText={setNeighborhood}
            helperText="Optional, but helpful for a better public area label."
          />
        </ResponsiveColumns>
      </SectionCard>

      <SectionCard
        title="Public area preview"
        description="This is the only location text that will be visible on the public detail screen for this milestone.">
        <MessageCard
          title={publicLocationLabel ?? "Add city or neighborhood"}
          description="This is generated from neighborhood and city. Update the fields above if you want to change the public area label."
        />
      </SectionCard>
    </ListingScreen>
  );
}
