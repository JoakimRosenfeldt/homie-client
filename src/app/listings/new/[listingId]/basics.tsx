import { useMutation } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { listingsApi } from "@/features/listings/api";
import {
  ChoiceGrid,
  FooterActions,
  ListingScreen,
  LoadingCard,
  MessageCard,
  SectionCard,
  StepProgress,
  TextField,
} from "@/features/listings/components";
import { useListingConnectionState, useListingDraft } from "@/features/listings/hooks";
import { getStepRoute } from "@/features/listings/navigation";
import { PROPERTY_TYPE_OPTIONS, RENTAL_ARRANGEMENT_OPTIONS } from "@/features/listings/model";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function ListingBasicsRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "Listing Basics" }} />
      {!isConfigured ? <ListingSetupMissing /> : <ListingBasicsScreen listingId={listingId} />}
    </>
  );
}

function ListingSetupMissing() {
  return (
    <ListingScreen>
      <MessageCard
        title="Convex is not configured"
        description="Set EXPO_PUBLIC_CONVEX_URL before editing listings."
        tone="warning"
      />
    </ListingScreen>
  );
}

function ListingBasicsScreen({ listingId }: { listingId?: string }) {
  const { draft, ownerKey, error, isLoading } = useListingDraft(listingId);
  const { isOffline } = useListingConnectionState();
  const saveSection = useMutation(listingsApi.saveSection);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPE_OPTIONS)[number]["value"] | undefined>();
  const [rentalArrangement, setRentalArrangement] = useState<
    (typeof RENTAL_ARRANGEMENT_OPTIONS)[number]["value"] | undefined
  >();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      return;
    }

    setTitle(draft.title);
    setSummary(draft.summary ?? "");
    setDescription(draft.description ?? "");
    setPropertyType(draft.propertyType);
    setRentalArrangement(draft.rentalArrangement);
  }, [draft]);

  if (isLoading || !draft) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading your listing draft." />
      </ListingScreen>
    );
  }

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
        section: "basics",
        payload: {
          title,
          summary,
          description,
          propertyType,
          rentalArrangement,
        },
      });

      router.push(getStepRoute(listingId, "details") as never);
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "We couldn't save the basics section.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ListingScreen
      footer={
        <FooterActions
          secondaryLabel="Save for later"
          onSecondaryPress={() => router.replace("/(tabs)/(profile)/listings" as never)}
          primaryLabel={isSaving ? "Saving..." : "Save and continue"}
          onPrimaryPress={handleContinue}
          primaryDisabled={isSaving}
        />
      }>
      <StepProgress currentStep="basics" completedSteps={draft.completion.completedSteps} />
      {isOffline ? (
        <MessageCard
          title="You're offline"
          description="Keep editing if you need to, but you’ll need a connection before this step can be saved to Convex."
          tone="warning"
        />
      ) : null}
      {error ? <MessageCard title="We couldn't unlock this draft" description={error} tone="danger" /> : null}
      {saveError ? <MessageCard title="Basics not saved" description={saveError} tone="danger" /> : null}

      <SectionCard
        title="Introduce the rental"
        description="Keep this clear and renter-facing. You can leave fields incomplete for now and finish them before publish.">
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Bright room near the lakes"
          helperText="This headline appears in the listing card and public detail screen."
        />
        <TextField
          label="Short summary"
          value={summary}
          onChangeText={setSummary}
          placeholder="Quiet building, bike storage, and a short walk to transit."
          helperText="A short teaser for the review screen and future browse views."
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the home, atmosphere, and what stands out for a renter."
          helperText="Publish requires a fuller description."
          multiline
        />
      </SectionCard>

      <SectionCard title="What kind of rental is this?" description="These choices shape the rest of the form and the publish rules.">
        <ChoiceGrid options={PROPERTY_TYPE_OPTIONS} selectedValue={propertyType} onSelect={setPropertyType} />
      </SectionCard>

      <SectionCard title="Rental arrangement" description="Subleases need a clear end date before the listing can be published.">
        <ChoiceGrid
          options={RENTAL_ARRANGEMENT_OPTIONS}
          selectedValue={rentalArrangement}
          onSelect={setRentalArrangement}
        />
      </SectionCard>
    </ListingScreen>
  );
}
