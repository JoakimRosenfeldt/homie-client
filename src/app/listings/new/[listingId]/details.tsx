import { useMutation } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { listingsApi } from "@/features/listings/api";
import {
  DateField,
  FooterActions,
  ListingScreen,
  LoadingCard,
  MessageCard,
  ResponsiveColumns,
  SectionCard,
  StepProgress,
  TextField,
  ToggleField,
} from "@/features/listings/components";
import { useListingConnectionState, useListingDraft } from "@/features/listings/hooks";
import { getStepRoute } from "@/features/listings/navigation";
import { DEFAULT_CURRENCY } from "@/features/listings/model";
import { parseOptionalNumber } from "@/features/listings/validation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function ListingDetailsRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "Rental Details" }} />
      {!isConfigured ? <ListingDetailsMissing /> : <ListingDetailsScreen listingId={listingId} />}
    </>
  );
}

function ListingDetailsMissing() {
  return (
    <ListingScreen>
      <MessageCard title="Convex is not configured" description="Set EXPO_PUBLIC_CONVEX_URL before editing listings." tone="warning" />
    </ListingScreen>
  );
}

function ListingDetailsScreen({ listingId }: { listingId?: string }) {
  const { draft, ownerKey, error, isLoading } = useListingDraft(listingId);
  const { isOffline } = useListingConnectionState();
  const saveSection = useMutation(listingsApi.saveSection);
  const [monthlyRent, setMonthlyRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [sizeSqm, setSizeSqm] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [minLeaseMonths, setMinLeaseMonths] = useState("");
  const [maxLeaseMonths, setMaxLeaseMonths] = useState("");
  const [availableFrom, setAvailableFrom] = useState<string | undefined>();
  const [availableTo, setAvailableTo] = useState<string | undefined>();
  const [furnished, setFurnished] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      return;
    }

    setMonthlyRent(draft.monthlyRent?.toString() ?? "");
    setDeposit(draft.deposit?.toString() ?? "");
    setCurrency(draft.currency || DEFAULT_CURRENCY);
    setSizeSqm(draft.sizeSqm?.toString() ?? "");
    setBedrooms(draft.bedroomCount?.toString() ?? "");
    setBathrooms(draft.bathroomCount?.toString() ?? "");
    setMinLeaseMonths(draft.minLeaseMonths?.toString() ?? "");
    setMaxLeaseMonths(draft.maxLeaseMonths?.toString() ?? "");
    setAvailableFrom(draft.availableFrom);
    setAvailableTo(draft.availableTo);
    setFurnished(Boolean(draft.furnished));
    setUtilitiesIncluded(Boolean(draft.utilitiesIncluded));
  }, [draft]);

  if (isLoading || !draft) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading the rental details." />
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
        section: "details",
        payload: {
          monthlyRent: parseOptionalNumber(monthlyRent),
          deposit: parseOptionalNumber(deposit),
          currency,
          utilitiesIncluded,
          sizeSqm: parseOptionalNumber(sizeSqm),
          bedroomCount: parseOptionalNumber(bedrooms),
          bathroomCount: parseOptionalNumber(bathrooms),
          furnished,
          availableFrom,
          availableTo,
          minLeaseMonths: parseOptionalNumber(minLeaseMonths),
          maxLeaseMonths: parseOptionalNumber(maxLeaseMonths),
        },
      });

      router.push(getStepRoute(listingId, "features") as never);
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "We couldn't save the rental details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ListingScreen
      footer={
        <FooterActions
          secondaryLabel="Back"
          onSecondaryPress={() => router.push(getStepRoute(listingId ?? draft._id, "basics") as never)}
          primaryLabel={isSaving ? "Saving..." : "Save and continue"}
          onPrimaryPress={handleContinue}
          primaryDisabled={isSaving}
        />
      }>
      <StepProgress currentStep="details" completedSteps={draft.completion.completedSteps} />
      {isOffline ? (
        <MessageCard
          title="Connection lost"
          description="You can keep editing, but saving this section requires a live connection."
          tone="warning"
        />
      ) : null}
      {error ? <MessageCard title="We couldn't unlock this draft" description={error} tone="danger" /> : null}
      {saveError ? <MessageCard title="Details not saved" description={saveError} tone="danger" /> : null}

      <SectionCard title="Pricing" description="Use the monthly rent a renter should expect to pay. Currency defaults to DKK for this phase.">
        <ResponsiveColumns>
          <TextField label="Monthly rent" value={monthlyRent} onChangeText={setMonthlyRent} keyboardType="numeric" />
          <TextField label="Deposit" value={deposit} onChangeText={setDeposit} keyboardType="numeric" />
        </ResponsiveColumns>
        <TextField label="Currency" value={currency} onChangeText={setCurrency} helperText="Keep this as DKK unless you need another currency." />
        <ToggleField
          label="Utilities included"
          helperText="Turn this on if the monthly rent already includes utilities."
          value={utilitiesIncluded}
          onValueChange={setUtilitiesIncluded}
        />
      </SectionCard>

      <SectionCard title="Home details" description="These details appear in the published listing and help the review checklist.">
        <ResponsiveColumns>
          <TextField label="Size (sqm)" value={sizeSqm} onChangeText={setSizeSqm} keyboardType="numeric" />
          <TextField label="Bedrooms" value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
        </ResponsiveColumns>
        <ResponsiveColumns>
          <TextField label="Bathrooms" value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />
          <ToggleField
            label="Furnished"
            helperText="Let renters know whether the home is move-in ready."
            value={furnished}
            onValueChange={setFurnished}
          />
        </ResponsiveColumns>
      </SectionCard>

      <SectionCard title="Availability and lease length" description="Subleases must include both a start date and an end date before publish.">
        <ResponsiveColumns>
          <DateField label="Available from" value={availableFrom} onChange={setAvailableFrom} required />
          <DateField
            label="Available to"
            value={availableTo}
            onChange={setAvailableTo}
            helperText={draft.rentalArrangement === "sublease" ? "Required for subleases." : "Optional for standard rentals."}
          />
        </ResponsiveColumns>
        <ResponsiveColumns>
          <TextField label="Minimum lease months" value={minLeaseMonths} onChangeText={setMinLeaseMonths} keyboardType="numeric" />
          <TextField label="Maximum lease months" value={maxLeaseMonths} onChangeText={setMaxLeaseMonths} keyboardType="numeric" />
        </ResponsiveColumns>
      </SectionCard>
    </ListingScreen>
  );
}
