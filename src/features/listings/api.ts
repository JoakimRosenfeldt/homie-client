import { makeFunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

import type {
  ListingBasicsInput,
  ListingDetail,
  ListingExploreItem,
  ListingDetailsInput,
  ListingDraft,
  ListingFeaturesInput,
  ListingLocationInput,
  ListingMineItem,
  SavedListingItem,
} from "./model";

export const listingsApi = {
  createDraft: makeFunctionReference<
    "mutation",
    { ownerKey: string },
    { listingId: Id<"listings"> }
  >("listings:createDraft"),
  getDraft: makeFunctionReference<
    "query",
    { listingId: Id<"listings">; ownerKey: string },
    ListingDraft
  >("listings:getDraft"),
  saveSection: makeFunctionReference<
    "mutation",
    {
      listingId: Id<"listings">;
      ownerKey: string;
      section: "basics" | "details" | "features" | "location";
      payload: ListingBasicsInput | ListingDetailsInput | ListingFeaturesInput | ListingLocationInput;
    },
    { completedSteps: string[] }
  >("listings:saveSection"),
  removeDraft: makeFunctionReference<
    "mutation",
    { listingId: Id<"listings">; ownerKey: string },
    { listingId: Id<"listings"> }
  >("listings:removeDraft"),
  listMine: makeFunctionReference<
    "query",
    { ownerKey: string; status?: "draft" | "published" | "archived" },
    ListingMineItem[]
  >("listings:listMine"),
  listPublished: makeFunctionReference<
    "query",
    Record<string, never>,
    ListingExploreItem[]
  >("listings:listPublished"),
  listSaved: makeFunctionReference<
    "query",
    { ownerKey: string },
    SavedListingItem[]
  >("listings:listSaved"),
  listSavedIds: makeFunctionReference<
    "query",
    { ownerKey: string },
    Id<"listings">[]
  >("listings:listSavedIds"),
  setSaved: makeFunctionReference<
    "mutation",
    { listingId: Id<"listings">; ownerKey: string; isSaved: boolean },
    { isSaved: boolean }
  >("listings:setSaved"),
  generatePhotoUploadUrl: makeFunctionReference<
    "mutation",
    { listingId: Id<"listings">; ownerKey: string },
    string
  >("listings:generatePhotoUploadUrl"),
  attachPhoto: makeFunctionReference<
    "mutation",
    {
      listingId: Id<"listings">;
      ownerKey: string;
      storageId: Id<"_storage">;
      width?: number;
      height?: number;
      mimeType?: string;
    },
    { coverStorageId?: Id<"_storage"> }
  >("listings:attachPhoto"),
  reorderPhotos: makeFunctionReference<
    "mutation",
    {
      listingId: Id<"listings">;
      ownerKey: string;
      orderedStorageIds: Id<"_storage">[];
    },
    { coverStorageId?: Id<"_storage"> }
  >("listings:reorderPhotos"),
  removePhoto: makeFunctionReference<
    "mutation",
    {
      listingId: Id<"listings">;
      ownerKey: string;
      storageId: Id<"_storage">;
    },
    { photoCount: number }
  >("listings:removePhoto"),
  publish: makeFunctionReference<
    "mutation",
    { listingId: Id<"listings">; ownerKey: string },
    { listingId: Id<"listings">; publishedAt: number }
  >("listings:publish"),
  getDetail: makeFunctionReference<
    "query",
    { listingId: Id<"listings"> },
    ListingDetail | null
  >("listings:getDetail"),
};
