import { useMutation } from "convex/react";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";

import { listingsApi } from "@/features/listings/api";
import { ListingScreen, LoadingCard, MessageCard } from "@/features/listings/components";
import { useMyListings } from "@/features/listings/hooks";
import { getResumeStepFromCompletedSteps, getStepRoute } from "@/features/listings/navigation";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

export default function NewListingIndexScreen() {
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "New Listing" }} />
      {!isConfigured ? <ListingConfigurationState /> : <ListingEntryResolver />}
    </>
  );
}

function ListingConfigurationState() {
  return (
    <ListingScreen>
      <MessageCard
        title="Convex is not configured"
        description="Set EXPO_PUBLIC_CONVEX_URL before using listing creation. The draft flow depends on a live Convex deployment."
        tone="warning"
      />
    </ListingScreen>
  );
}

function ListingEntryResolver() {
  const { ownerKey, error, isLoading, listings } = useMyListings("draft");
  const createDraft = useMutation(listingsApi.createDraft);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (isRouting || isLoading || !ownerKey || listings === undefined) {
      return;
    }

    setIsRouting(true);

    const latestDraft = listings[0];
    if (latestDraft) {
      router.replace(getStepRoute(latestDraft._id, getResumeStepFromCompletedSteps(latestDraft.completedSteps)) as never);
      return;
    }

    createDraft({ ownerKey })
      .then(({ listingId }) => {
        router.replace(getStepRoute(listingId, "basics") as never);
      })
      .catch((caughtError) => {
        setEntryError(caughtError instanceof Error ? caughtError.message : "We couldn't create your listing draft.");
        setIsRouting(false);
      });
  }, [createDraft, isLoading, isRouting, listings, ownerKey]);

  return (
    <ListingScreen>
      {error ? (
        <MessageCard title="This device key isn't ready" description={error} tone="danger" />
      ) : null}
      {entryError ? (
        <MessageCard
          title="We couldn't start the listing flow"
          description={entryError}
          tone="danger"
          actionLabel="Try again"
          onActionPress={() => {
            setEntryError(null);
            setIsRouting(false);
          }}
        />
      ) : null}
      {!error && !entryError ? (
        <LoadingCard label="Checking for an existing draft on this device and opening the listing flow." />
      ) : null}
    </ListingScreen>
  );
}
