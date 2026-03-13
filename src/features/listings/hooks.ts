import { useConvexConnectionState, useQuery } from "convex/react";
import type { GenericId as Id } from "convex/values";
import { useEffect, useState } from "react";

import { listingsApi } from "@/features/listings/api";
import { ensureDeviceOwnerKey } from "@/features/listings/owner-key";

export function useDeviceOwnerKey() {
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    ensureDeviceOwnerKey()
      .then((value) => {
        if (!isMounted) {
          return;
        }

        setOwnerKey(value);
      })
      .catch((caughtError) => {
        if (!isMounted) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "We couldn't secure this device key.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { ownerKey, error, isLoading };
}

export function useListingConnectionState() {
  const connectionState = useConvexConnectionState();

  return {
    isOffline: connectionState.hasEverConnected && !connectionState.isWebSocketConnected,
    hasInflightRequests: connectionState.hasInflightRequests,
    connectionRetries: connectionState.connectionRetries,
  };
}

export function useListingDraft(listingId?: string) {
  const owner = useDeviceOwnerKey();
  const draft = useQuery(
    listingsApi.getDraft,
    owner.ownerKey && listingId
      ? {
          listingId: listingId as Id<"listings">,
          ownerKey: owner.ownerKey,
        }
      : "skip",
  );

  return {
    ...owner,
    draft,
    listingId: listingId as Id<"listings"> | undefined,
  };
}

export function useMyListings(status?: "draft" | "published" | "archived") {
  const owner = useDeviceOwnerKey();
  const listings = useQuery(
    listingsApi.listMine,
    owner.ownerKey
      ? {
          ownerKey: owner.ownerKey,
          status,
        }
      : "skip",
  );

  return {
    ...owner,
    listings,
  };
}

export function useListingDetail(listingId?: string) {
  return useQuery(
    listingsApi.getDetail,
    listingId
      ? {
          listingId: listingId as Id<"listings">,
        }
      : "skip",
  );
}
