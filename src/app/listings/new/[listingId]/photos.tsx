import { useMutation } from "convex/react";
import { ImagePickerAsset, launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { listingsApi } from "@/features/listings/api";
import {
  FooterActions,
  ListingScreen,
  LoadingCard,
  MessageCard,
  MiniButton,
  PhotoTile,
  SectionCard,
  StepProgress,
} from "@/features/listings/components";
import { useListingDraft } from "@/features/listings/hooks";
import { getStepRoute } from "@/features/listings/navigation";
import { MAX_LISTING_PHOTOS } from "@/features/listings/model";
import { useConvexConfiguration } from "@/providers/convex-app-provider";

type PendingUpload = {
  id: string;
  asset: ImagePickerAsset;
  status: "uploading" | "error";
  errorMessage?: string;
};

export default function ListingPhotosRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isConfigured } = useConvexConfiguration();

  return (
    <>
      <Stack.Screen options={{ title: "Photos" }} />
      {!isConfigured ? <PhotoSetupMissing /> : <ListingPhotosScreen listingId={listingId} />}
    </>
  );
}

function PhotoSetupMissing() {
  return (
    <ListingScreen>
      <MessageCard title="Convex is not configured" description="Set EXPO_PUBLIC_CONVEX_URL before editing listings." tone="warning" />
    </ListingScreen>
  );
}

function ListingPhotosScreen({ listingId }: { listingId?: string }) {
  const { draft, ownerKey, error, isLoading } = useListingDraft(listingId);
  const generatePhotoUploadUrl = useMutation(listingsApi.generatePhotoUploadUrl);
  const attachPhoto = useMutation(listingsApi.attachPhoto);
  const reorderPhotos = useMutation(listingsApi.reorderPhotos);
  const removePhoto = useMutation(listingsApi.removePhoto);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [busyStorageId, setBusyStorageId] = useState<string | null>(null);

  const remainingSlots = useMemo(() => {
    const inFlight = pendingUploads.length;
    return Math.max(0, MAX_LISTING_PHOTOS - (draft?.photos.length ?? 0) - inFlight);
  }, [draft?.photos.length, pendingUploads.length]);

  if (isLoading || !draft) {
    return (
      <ListingScreen>
        <LoadingCard label="Loading the photo library for this draft." />
      </ListingScreen>
    );
  }

  const updatePending = (id: string, updates: Partial<PendingUpload>) => {
    setPendingUploads((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removePending = (id: string) => {
    setPendingUploads((current) => current.filter((item) => item.id !== id));
  };

  const uploadAsset = async (asset: ImagePickerAsset, uploadId: string) => {
    if (!ownerKey || !listingId) {
      return;
    }

    try {
      const uploadUrl = await generatePhotoUploadUrl({
        listingId: draft._id as never,
        ownerKey,
      });

      const fileResponse = await fetch(asset.uri);
      const fileBlob = await fileResponse.blob();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": asset.mimeType ?? "image/jpeg",
        },
        body: fileBlob,
      });

      if (!response.ok) {
        throw new Error("Upload failed before Convex could attach the image.");
      }

      const payload = (await response.json()) as { storageId: string };
      await attachPhoto({
        listingId: draft._id as never,
        ownerKey,
        storageId: payload.storageId as never,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType ?? undefined,
      });

      removePending(uploadId);
    } catch (caughtError) {
      updatePending(uploadId, {
        status: "error",
        errorMessage: caughtError instanceof Error ? caughtError.message : "Photo upload failed.",
      });
    }
  };

  const handlePickImages = async () => {
    setScreenError(null);

    const permission = await requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setScreenError("Photo access is required before you can upload listing images.");
      return;
    }

    if (remainingSlots <= 0) {
      setScreenError(`This draft already has the maximum of ${MAX_LISTING_PHOTOS} photos.`);
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.86,
    });

    if (result.canceled) {
      return;
    }

    const nextPending = result.assets.slice(0, remainingSlots).map((asset) => ({
      id: `${Date.now()}-${asset.assetId ?? asset.uri}`,
      asset,
      status: "uploading" as const,
    }));

    setPendingUploads((current) => [...current, ...nextPending]);
    for (const item of nextPending) {
      void uploadAsset(item.asset, item.id);
    }
  };

  const movePhoto = async (storageId: string, direction: "first" | "later") => {
    if (!ownerKey) {
      return;
    }

    setBusyStorageId(storageId);
    setScreenError(null);

    try {
      const orderedStorageIds = draft.photos.map((photo) => photo.storageId);
      const index = orderedStorageIds.indexOf(storageId);
      if (index === -1) {
        return;
      }

      if (direction === "first") {
        orderedStorageIds.splice(index, 1);
        orderedStorageIds.unshift(storageId);
      } else if (index < orderedStorageIds.length - 1) {
        [orderedStorageIds[index], orderedStorageIds[index + 1]] = [orderedStorageIds[index + 1], orderedStorageIds[index]];
      }

      await reorderPhotos({
        listingId: draft._id as never,
        ownerKey,
        orderedStorageIds: orderedStorageIds as never[],
      });
    } catch (caughtError) {
      setScreenError(caughtError instanceof Error ? caughtError.message : "We couldn't update the photo order.");
    } finally {
      setBusyStorageId(null);
    }
  };

  const handleRemove = async (storageId: string) => {
    if (!ownerKey) {
      return;
    }

    setBusyStorageId(storageId);
    setScreenError(null);

    try {
      await removePhoto({
        listingId: draft._id as never,
        ownerKey,
        storageId: storageId as never,
      });
    } catch (caughtError) {
      setScreenError(caughtError instanceof Error ? caughtError.message : "We couldn't remove that photo.");
    } finally {
      setBusyStorageId(null);
    }
  };

  return (
    <ListingScreen
      footer={
        <FooterActions
          secondaryLabel="Back"
          onSecondaryPress={() => router.push(getStepRoute(listingId ?? draft._id, "location") as never)}
          primaryLabel="Continue to review"
          onPrimaryPress={() => router.push(getStepRoute(listingId ?? draft._id, "review") as never)}
        />
      }>
      <StepProgress currentStep="photos" completedSteps={draft.completion.completedSteps} />
      {error ? <MessageCard title="We couldn't unlock this draft" description={error} tone="danger" /> : null}
      {screenError ? <MessageCard title="Photo action failed" description={screenError} tone="danger" /> : null}
      {draft.photos.length === 0 ? (
        <MessageCard
          title="Publish needs at least 1 photo"
          description="You can move ahead and finish the review step, but publish stays blocked until at least one photo uploads successfully."
          tone="warning"
        />
      ) : null}

      <SectionCard
        title="Upload listing photos"
        description={`Upload up to ${MAX_LISTING_PHOTOS} photos. The first image is the cover photo, and you can move another image to the front to change it.`}>
        <FooterActions primaryLabel="Choose photos" onPrimaryPress={handlePickImages} primaryDisabled={remainingSlots === 0} />
      </SectionCard>

      {pendingUploads.length > 0 ? (
        <SectionCard title="Uploads in progress" description="Failed uploads stay here so you can retry without corrupting the draft.">
          <View style={{ gap: 12 }}>
            {pendingUploads.map((upload) => (
              <PhotoTile
                key={upload.id}
                url={upload.asset.uri}
                label={upload.status === "uploading" ? "Uploading..." : "Upload failed"}
                actions={
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    {upload.status === "error" ? (
                      <MiniButton label="Retry upload" onPress={() => void uploadAsset(upload.asset, upload.id)} />
                    ) : null}
                    <MiniButton label="Remove" onPress={() => removePending(upload.id)} tone="danger" />
                  </View>
                }
              />
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard title="Current photos" description="Reorder photos to pick a cover image or remove anything that should not be published.">
        <View style={{ gap: 12 }}>
          {draft.photos.map((photo, index) => (
            <PhotoTile
              key={photo.storageId}
              url={photo.url}
              label={index === 0 ? "Cover photo" : `Photo ${index + 1}`}
              actions={
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                  {index > 0 ? (
                    <MiniButton
                      label="Make cover"
                      onPress={() => void movePhoto(photo.storageId, "first")}
                      disabled={busyStorageId === photo.storageId}
                    />
                  ) : null}
                  {index < draft.photos.length - 1 ? (
                    <MiniButton
                      label="Move later"
                      onPress={() => void movePhoto(photo.storageId, "later")}
                      disabled={busyStorageId === photo.storageId}
                    />
                  ) : null}
                  <MiniButton
                    label="Remove"
                    onPress={() => void handleRemove(photo.storageId)}
                    tone="danger"
                    disabled={busyStorageId === photo.storageId}
                  />
                </View>
              }
            />
          ))}
        </View>
      </SectionCard>
    </ListingScreen>
  );
}
