import type { FunctionArgs } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { SelectChip } from "@/components/chip";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { ChoiceRow, DataRow, EmptyState, FlowCard, FlowScreen, LabeledInput } from "@/features/applications/flow-ui";
import { useBackendConnection } from "@/features/backend/convex-provider";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import {
  AMENITIES,
  api,
  formatHostRent,
  LISTING_STEP_LABEL_KEYS,
  LISTING_STEPS,
  PROPERTY_TYPES,
  type HostAmenity,
  type HostListingDraft,
  type HostPropertyType,
  type ListingStep,
} from "@/features/host/backend-model";
import { useI18n, type TranslationKey } from "@/i18n";
import { useTheme } from "@/theme/tokens";

type ListingId = FunctionArgs<typeof api.listings.getDraft>["listingId"];
type StorageId = FunctionArgs<typeof api.listings.attachPhoto>["storageId"];
type RentalArrangement = NonNullable<HostListingDraft["rentalArrangement"]>;

type ListingForm = {
  title: string;
  summary: string;
  description: string;
  propertyType: HostPropertyType;
  rentalArrangement: RentalArrangement;
  monthlyRent: string;
  deposit: string;
  utilitiesIncluded: boolean;
  sizeSqm: string;
  bedroomCount: string;
  bathroomCount: string;
  furnished: boolean;
  availableFrom: string;
  availableTo: string;
  minLeaseMonths: string;
  maxLeaseMonths: string;
  amenities: HostAmenity[];
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  countryCode: string;
  neighborhood: string;
};

const EMPTY_FORM: ListingForm = {
  title: "",
  summary: "",
  description: "",
  propertyType: "room",
  rentalArrangement: "standard",
  monthlyRent: "",
  deposit: "",
  utilitiesIncluded: false,
  sizeSqm: "",
  bedroomCount: "",
  bathroomCount: "",
  furnished: false,
  availableFrom: "",
  availableTo: "",
  minLeaseMonths: "",
  maxLeaseMonths: "",
  amenities: [],
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  countryCode: "DK",
  neighborhood: "",
};

const RENTAL_ARRANGEMENTS: readonly { value: RentalArrangement; labelKey: TranslationKey }[] = [
  { value: "standard", labelKey: "newListing.arrangement.standard" },
  { value: "sublease", labelKey: "newListing.arrangement.sublease" },
];

const CHECKLIST_KEYS = {
  title: "newListing.checklist.title",
  description: "newListing.checklist.description",
  propertyType: "newListing.checklist.propertyType",
  rentalArrangement: "newListing.checklist.rentalArrangement",
  monthlyRent: "newListing.checklist.monthlyRent",
  sizeSqm: "newListing.checklist.sizeSqm",
  availableFrom: "newListing.checklist.availableFrom",
  availableTo: "newListing.checklist.availableTo",
  leaseDuration: "newListing.checklist.leaseDuration",
  address: "newListing.checklist.address",
  photo: "newListing.checklist.photo",
} satisfies Record<HostListingDraft["completion"]["checklist"][number]["key"], TranslationKey>;

function isChecklistKey(value: string): value is keyof typeof CHECKLIST_KEYS {
  return value in CHECKLIST_KEYS;
}

function formFromDraft(draft: HostListingDraft): ListingForm {
  return {
    title: draft.title,
    summary: draft.summary ?? "",
    description: draft.description ?? "",
    propertyType: draft.propertyType ?? "room",
    rentalArrangement: draft.rentalArrangement ?? "standard",
    monthlyRent: draft.monthlyRent?.toString() ?? "",
    deposit: draft.deposit?.toString() ?? "",
    utilitiesIncluded: draft.utilitiesIncluded ?? false,
    sizeSqm: draft.sizeSqm?.toString() ?? "",
    bedroomCount: draft.bedroomCount?.toString() ?? "",
    bathroomCount: draft.bathroomCount?.toString() ?? "",
    furnished: draft.furnished ?? false,
    availableFrom: draft.availableFrom ?? "",
    availableTo: draft.availableTo ?? "",
    minLeaseMonths: draft.minLeaseMonths?.toString() ?? "",
    maxLeaseMonths: draft.maxLeaseMonths?.toString() ?? "",
    amenities: [...draft.amenities],
    addressLine1: draft.addressLine1 ?? "",
    addressLine2: draft.addressLine2 ?? "",
    postalCode: draft.postalCode ?? "",
    city: draft.city ?? "",
    countryCode: draft.countryCode ?? "DK",
    neighborhood: draft.neighborhood ?? "",
  };
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalNonNegativeNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isStorageUploadResult(value: unknown): value is { storageId: StorageId } {
  if (typeof value !== "object" || value === null || !("storageId" in value)) return false;
  return typeof value.storageId === "string" && value.storageId.length > 0;
}

function stepAfter(step: ListingStep) {
  const index = LISTING_STEPS.indexOf(step);
  return LISTING_STEPS[Math.min(index + 1, LISTING_STEPS.length - 1)];
}

function stepBefore(step: ListingStep) {
  const index = LISTING_STEPS.indexOf(step);
  return LISTING_STEPS[Math.max(index - 1, 0)];
}

export default function NewListingScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
  const params = useLocalSearchParams<{ listingId?: string | string[] }>();
  const requestedListingId = Array.isArray(params.listingId) ? params.listingId[0] : params.listingId;
  const createDraft = useMutation(api.listings.createDraft);
  const saveSection = useMutation(api.listings.saveSection);
  const geocodeLocation = useAction(api.listings.geocodeLocation);
  const generatePhotoUploadUrl = useMutation(api.listings.generatePhotoUploadUrl);
  const attachPhoto = useMutation(api.listings.attachPhoto);
  const discardPhotoUpload = useMutation(api.listings.discardPhotoUpload);
  const publishDraft = useMutation(api.listings.publish);
  const setLifecycle = useMutation(api.listings.setLifecycle);
  const listings = useQuery(
    api.listings.listMine,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const [createdListingId, setCreatedListingId] = React.useState<ListingId | null>(null);
  const requestedListing = requestedListingId
    ? listings?.find((listing) => String(listing._id) === requestedListingId)
    : undefined;
  const selectedListing = requestedListingId
    ? requestedListing
    : listings?.find((listing) => listing.status === "draft");
  const listingId = createdListingId ?? selectedListing?._id ?? null;
  const draft = useQuery(
    api.listings.getDraft,
    identity.kind === "ready" && listingId
      ? { listingId, ownerKey: identity.ownerKey }
      : "skip",
  );
  const [form, setForm] = React.useState<ListingForm>(EMPTY_FORM);
  const [step, setStep] = React.useState<ListingStep>("basics");
  const [busyAction, setBusyAction] = React.useState<"create" | "save" | "upload" | "publish" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [errorField, setErrorField] = React.useState<keyof ListingForm | null>(null);
  const [locationPreview, setLocationPreview] = React.useState<HostListingDraft["publicCoordinate"]>(undefined);
  const [publishedTitle, setPublishedTitle] = React.useState<string | null>(null);
  const hydratedDraftId = React.useRef<string | null>(null);
  const actionInFlight = React.useRef(false);
  const titleRef = React.useRef<TextInput>(null);
  const descriptionRef = React.useRef<TextInput>(null);
  const monthlyRentRef = React.useRef<TextInput>(null);
  const depositRef = React.useRef<TextInput>(null);
  const sizeRef = React.useRef<TextInput>(null);
  const bedroomCountRef = React.useRef<TextInput>(null);
  const bathroomCountRef = React.useRef<TextInput>(null);
  const availableFromRef = React.useRef<TextInput>(null);
  const availableToRef = React.useRef<TextInput>(null);
  const minLeaseMonthsRef = React.useRef<TextInput>(null);
  const maxLeaseMonthsRef = React.useRef<TextInput>(null);
  const addressLine1Ref = React.useRef<TextInput>(null);
  const postalCodeRef = React.useRef<TextInput>(null);
  const cityRef = React.useRef<TextInput>(null);
  const countryCodeRef = React.useRef<TextInput>(null);
  const publicCoordinate = locationPreview ?? draft?.publicCoordinate;
  const propertyTypeOptions = PROPERTY_TYPES.map((type) => ({
    value: type.value,
    label: i18n.t(type.labelKey),
  }));
  const rentalArrangementOptions = RENTAL_ARRANGEMENTS.map((arrangement) => ({
    value: arrangement.value,
    label: i18n.t(arrangement.labelKey),
  }));
  const booleanOptions = [
    { value: "no", label: i18n.t("newListing.no") },
    { value: "yes", label: i18n.t("newListing.yes") },
  ] as const;

  React.useEffect(() => {
    if (!draft || hydratedDraftId.current === String(draft._id)) return;
    hydratedDraftId.current = String(draft._id);
    setForm(formFromDraft(draft));
    setLocationPreview(draft.publicCoordinate);
    setStep(draft.completion.checklist.find((item) => !item.complete)?.step ?? "review");
  }, [draft]);

  const setField = <Key extends keyof ListingForm,>(key: Key, value: ListingForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errorField === key) {
      setError(null);
      setErrorField(null);
    }
  };

  const showFieldError = (
    field: keyof ListingForm,
    message: string,
    ref: React.RefObject<TextInput | null>,
  ) => {
    setError(message);
    setErrorField(field);
    setTimeout(() => ref.current?.focus(), 0);
    return false;
  };

  const startDraft = async () => {
    if (identity.kind !== "ready" || actionInFlight.current) return;
    actionInFlight.current = true;
    setBusyAction("create");
    setError(null);
    setErrorField(null);
    try {
      const result = await createDraft({ ownerKey: identity.ownerKey });
      setCreatedListingId(result.listingId);
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
      setErrorField(null);
    } finally {
      actionInFlight.current = false;
      setBusyAction(null);
    }
  };

  const saveBasics = async () => {
    if (identity.kind !== "ready" || !listingId) return false;
    if (!form.title.trim()) {
      return showFieldError("title", i18n.t("newListing.validation.title"), titleRef);
    }
    if (!form.description.trim()) {
      return showFieldError("description", i18n.t("newListing.validation.description"), descriptionRef);
    }

    await saveSection({
      listingId,
      ownerKey: identity.ownerKey,
      input: {
        section: "basics",
        payload: {
          title: form.title.trim(),
          summary: form.summary.trim(),
          description: form.description.trim(),
          propertyType: form.propertyType,
          rentalArrangement: form.rentalArrangement,
          contentLanguage: i18n.locale,
        },
      },
    });
    return true;
  };

  const saveDetails = async () => {
    if (identity.kind !== "ready" || !listingId) return false;
    const monthlyRent = parsePositiveNumber(form.monthlyRent);
    const sizeSqm = parsePositiveNumber(form.sizeSqm);
    const deposit = parseOptionalNonNegativeNumber(form.deposit);
    const bedroomCount = parseOptionalNonNegativeNumber(form.bedroomCount);
    const bathroomCount = parseOptionalNonNegativeNumber(form.bathroomCount);
    const minLeaseMonths = parseOptionalNonNegativeNumber(form.minLeaseMonths);
    const maxLeaseMonths = parseOptionalNonNegativeNumber(form.maxLeaseMonths);

    if (monthlyRent === null) {
      return showFieldError("monthlyRent", i18n.t("newListing.validation.monthlyRent"), monthlyRentRef);
    }
    if (sizeSqm === null) {
      return showFieldError("sizeSqm", i18n.t("newListing.validation.size"), sizeRef);
    }
    if (deposit === null) return showFieldError("deposit", i18n.t("newListing.validation.deposit"), depositRef);
    if (bedroomCount === null) return showFieldError("bedroomCount", i18n.t("newListing.validation.bedrooms"), bedroomCountRef);
    if (bathroomCount === null) return showFieldError("bathroomCount", i18n.t("newListing.validation.bathrooms"), bathroomCountRef);
    if (minLeaseMonths === null) return showFieldError("minLeaseMonths", i18n.t("newListing.validation.minimumLease"), minLeaseMonthsRef);
    if (maxLeaseMonths === null) return showFieldError("maxLeaseMonths", i18n.t("newListing.validation.maximumLease"), maxLeaseMonthsRef);
    if (!isDateInput(form.availableFrom)) {
      return showFieldError("availableFrom", i18n.t("newListing.validation.availableFrom"), availableFromRef);
    }
    if (form.rentalArrangement === "sublease" && !isDateInput(form.availableTo)) {
      return showFieldError("availableTo", i18n.t("newListing.validation.subleaseEnd"), availableToRef);
    }
    if (form.availableTo && !isDateInput(form.availableTo)) {
      return showFieldError("availableTo", i18n.t("newListing.validation.availableTo"), availableToRef);
    }
    if (form.availableTo && new Date(form.availableTo).getTime() < new Date(form.availableFrom).getTime()) {
      return showFieldError("availableTo", i18n.t("newListing.validation.dateOrder"), availableToRef);
    }
    if (minLeaseMonths !== undefined && maxLeaseMonths !== undefined && minLeaseMonths > maxLeaseMonths) {
      return showFieldError("minLeaseMonths", i18n.t("newListing.validation.leaseOrder"), minLeaseMonthsRef);
    }

    await saveSection({
      listingId,
      ownerKey: identity.ownerKey,
      input: {
        section: "details",
        payload: {
          monthlyRent,
          ...(deposit !== undefined ? { deposit } : {}),
          currency: "DKK",
          utilitiesIncluded: form.utilitiesIncluded,
          sizeSqm,
          ...(form.propertyType === "apartment" || form.propertyType === "house"
            ? bedroomCount !== undefined
              ? { bedroomCount }
              : {}
            : {}),
          ...(bathroomCount !== undefined ? { bathroomCount } : {}),
          furnished: form.furnished,
          availableFrom: form.availableFrom,
          ...(form.availableTo ? { availableTo: form.availableTo } : {}),
          ...(minLeaseMonths !== undefined ? { minLeaseMonths } : {}),
          ...(maxLeaseMonths !== undefined ? { maxLeaseMonths } : {}),
        },
      },
    });
    return true;
  };

  const saveFeatures = async () => {
    if (identity.kind !== "ready" || !listingId) return false;
    await saveSection({
      listingId,
      ownerKey: identity.ownerKey,
      input: { section: "features", payload: { amenities: form.amenities } },
    });
    return true;
  };

  const saveLocation = async () => {
    if (identity.kind !== "ready" || !listingId) return false;
    if (!form.addressLine1.trim()) return showFieldError("addressLine1", i18n.t("newListing.validation.street"), addressLine1Ref);
    if (!form.postalCode.trim()) return showFieldError("postalCode", i18n.t("newListing.validation.postalCode"), postalCodeRef);
    if (!form.city.trim()) return showFieldError("city", i18n.t("newListing.validation.city"), cityRef);
    if (!/^[A-Za-z]{2}$/.test(form.countryCode.trim())) {
      return showFieldError("countryCode", i18n.t("newListing.validation.countryCode"), countryCodeRef);
    }

    const locationPayload = {
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      postalCode: form.postalCode.trim(),
      city: form.city.trim(),
      countryCode: form.countryCode.trim().toUpperCase(),
      neighborhood: form.neighborhood.trim(),
    };
    await saveSection({
      listingId,
      ownerKey: identity.ownerKey,
      input: { section: "location", payload: locationPayload },
    });
    const geocoded = await geocodeLocation({ listingId, ownerKey: identity.ownerKey });
    setLocationPreview(geocoded.publicCoordinate);
    return true;
  };

  const saveAndContinue = async () => {
    if (actionInFlight.current || step === "review") return;
    actionInFlight.current = true;
    setBusyAction("save");
    setError(null);
    setErrorField(null);
    try {
      const saved =
        step === "basics"
          ? await saveBasics()
          : step === "details"
            ? await saveDetails()
            : step === "features"
              ? await saveFeatures()
              : step === "location"
                ? await saveLocation()
                : Boolean(draft?.photos.length);

      if (step === "photos" && !saved) {
        setError(i18n.t("newListing.validation.photo"));
        setErrorField(null);
        return;
      }
      if (saved) setStep(stepAfter(step));
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
      setErrorField(null);
    } finally {
      actionInFlight.current = false;
      setBusyAction(null);
    }
  };

  const uploadPhoto = async () => {
    if (identity.kind !== "ready" || !listingId || actionInFlight.current) return;
    let pendingUpload:
      | Pick<FunctionArgs<typeof api.listings.discardPhotoUpload>, "uploadSessionId" | "storageId">
      | undefined;
    actionInFlight.current = true;
    setBusyAction("upload");
    setError(null);
    setErrorField(null);
    try {
      if (process.env.EXPO_OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(i18n.t("newListing.photoPermission"));
          setErrorField(null);
          return;
        }
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.82,
      });
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return;

      const sanitized = await ImageManipulator.manipulateAsync(
        asset.uri,
        asset.width > 2400 ? [{ resize: { width: 2400 } }] : [],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      const fileResponse = await fetch(sanitized.uri);
      if (!fileResponse.ok) throw new Error(i18n.t("newListing.photoReadError"));
      const blob = await fileResponse.blob();
      const uploadSession = await generatePhotoUploadUrl({ listingId, ownerKey: identity.ownerKey });
      const uploadResponse = await fetch(uploadSession.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(i18n.t("newListing.photoUploadError", {
          status: i18n.formatNumber(uploadResponse.status),
        }));
      }
      const uploadResult: unknown = await uploadResponse.json();
      if (!isStorageUploadResult(uploadResult)) throw new Error(i18n.t("newListing.photoResponseError"));
      pendingUpload = {
        uploadSessionId: uploadSession.uploadSessionId,
        storageId: uploadResult.storageId,
      };

      await attachPhoto({
        listingId,
        ownerKey: identity.ownerKey,
        ...pendingUpload,
        width: sanitized.width,
        height: sanitized.height,
        mimeType: "image/jpeg",
      });
      pendingUpload = undefined;
    } catch (caught) {
      if (pendingUpload) {
        try {
          await discardPhotoUpload({ listingId, ownerKey: identity.ownerKey, ...pendingUpload });
        } catch {
          // Cleanup is best-effort; surface the original upload error.
        }
      }
      setError(readableBackendError(caught, i18n));
      setErrorField(null);
    } finally {
      actionInFlight.current = false;
      setBusyAction(null);
    }
  };

  const publish = async () => {
    if (identity.kind !== "ready" || !listingId || !draft || actionInFlight.current) return;
    if (!publicCoordinate) {
      setError(i18n.t("newListing.publishLocationError"));
      setErrorField(null);
      return;
    }
    actionInFlight.current = true;
    setBusyAction("publish");
    setError(null);
    setErrorField(null);
    try {
      if (draft.status === "paused") {
        await setLifecycle({ listingId, ownerKey: identity.ownerKey, status: "published" });
      } else {
        await publishDraft({ listingId, ownerKey: identity.ownerKey });
      }
      setPublishedTitle(form.title.trim() || i18n.t("newListing.publishedFallback"));
    } catch (caught) {
      setError(readableBackendError(caught, i18n));
      setErrorField(null);
    } finally {
      actionInFlight.current = false;
      setBusyAction(null);
    }
  };

  if (publishedTitle) {
    return (
      <FlowScreen title={i18n.t("newListing.publishedTitle")} intro={i18n.t("newListing.publishedIntro")}>
        <SystemState
          kind="success"
          title={publishedTitle}
          message={i18n.t("newListing.publishedBody")}
          action={{ label: i18n.t("newListing.openDashboard"), href: "/host", replace: true }}
        />
      </FlowScreen>
    );
  }

  if (identity.kind === "loading") {
    return (
      <FlowScreen title={i18n.t("newListing.title")}>
        <SystemState kind="loading" title={i18n.t("newListing.deviceLoading")} />
      </FlowScreen>
    );
  }

  if (identity.kind === "error") {
    return (
      <FlowScreen title={i18n.t("newListing.title")}>
        <SystemState kind="error" title={i18n.t("newListing.deviceUnavailable")} message={identity.error} action={{ label: i18n.t("common.tryAgain"), onPress: identity.retry }} />
      </FlowScreen>
    );
  }

  if (connection === "offline" && listings === undefined) {
    return (
      <FlowScreen title={i18n.t("newListing.title")}>
        <SystemState kind="offline" message={i18n.t("newListing.reconnect")} />
      </FlowScreen>
    );
  }

  if (listings === undefined || (listingId && draft === undefined)) {
    return (
      <FlowScreen title={i18n.t("newListing.title")}>
        <SystemState kind="loading" title={i18n.t("newListing.loadingDraft")} />
      </FlowScreen>
    );
  }

  if (requestedListingId && !requestedListing) {
    return (
      <FlowScreen title={i18n.t("newListing.title")}>
        <SystemState
          kind="error"
          title={i18n.t("newListing.unavailableTitle")}
          message={i18n.t("newListing.unavailableBody")}
          action={{ label: i18n.t("newListing.openDashboard"), href: "/host", replace: true }}
        />
      </FlowScreen>
    );
  }

  if (!listingId) {
    return (
      <FlowScreen title={i18n.t("newListing.title")} intro={i18n.t("newListing.intro")}>
        {error ? <SystemState kind="error" message={error} /> : null}
        <EmptyState
          title={i18n.t("newListing.startTitle")}
          body={i18n.t("newListing.startBody")}
          action={{ label: busyAction === "create" ? i18n.t("newListing.creating") : i18n.t("newListing.createDraft"), onPress: startDraft }}
        />
      </FlowScreen>
    );
  }

  if (!draft) {
    return (
      <FlowScreen title={i18n.t("newListing.title")}>
        <SystemState kind="error" title={i18n.t("newListing.draftUnavailable")} message={i18n.t("newListing.draftUnavailableBody")} />
      </FlowScreen>
    );
  }

  const stepNumber = LISTING_STEPS.indexOf(step) + 1;
  const showBedrooms = form.propertyType === "apartment" || form.propertyType === "house";
  const sizeLabel = form.propertyType === "room"
    ? i18n.t("newListing.field.roomSize")
    : i18n.t("newListing.field.homeSize");
  const stepLabel = i18n.t(LISTING_STEP_LABEL_KEYS[step]);
  const selectedPropertyType = propertyTypeOptions.find((type) => type.value === form.propertyType);
  const selectedRentalArrangement = rentalArrangementOptions.find(
    (arrangement) => arrangement.value === form.rentalArrangement,
  );

  return (
    <FlowScreen
      title={draft.status === "paused" ? i18n.t("newListing.editPausedTitle") : i18n.t("newListing.title")}
      intro={i18n.t("newListing.stepIntro", {
        current: i18n.formatNumber(stepNumber),
        total: i18n.formatNumber(LISTING_STEPS.length),
        step: stepLabel,
      })}>
      {connection === "offline" ? <SystemState kind="offline" title={i18n.t("newListing.offlineTitle")} message={i18n.t("newListing.offlineBody")} /> : null}

      <View
        aria-valuemax={LISTING_STEPS.length}
        aria-valuemin={1}
        aria-valuenow={stepNumber}
        aria-valuetext={stepLabel}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: LISTING_STEPS.length, now: stepNumber, text: stepLabel }}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {LISTING_STEPS.map((item, index) => (
          <View
            key={item}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: index < stepNumber ? theme.accent : theme.hover }}>
            <Text style={{ fontVariant: ["tabular-nums"], fontSize: 13, fontWeight: "800", color: index < stepNumber ? theme.onAccent : theme.body }}>{i18n.formatNumber(index + 1)}</Text>
          </View>
        ))}
      </View>

      {step === "basics" ? (
        <>
          <ChoiceRow label={i18n.t("newListing.homeType")} options={propertyTypeOptions} value={form.propertyType} onChange={(value) => setField("propertyType", value)} />
          <ChoiceRow label={i18n.t("newListing.rentalArrangement")} options={rentalArrangementOptions} value={form.rentalArrangement} onChange={(value) => setField("rentalArrangement", value)} />
          <LabeledInput ref={titleRef} error={errorField === "title" ? error ?? undefined : undefined} label={i18n.t("newListing.field.title")} value={form.title} onChangeText={(value) => setField("title", value)} maxLength={120} placeholder={i18n.t("newListing.field.titlePlaceholder")} />
          <LabeledInput label={i18n.t("newListing.field.summary")} value={form.summary} onChangeText={(value) => setField("summary", value)} maxLength={220} placeholder={i18n.t("newListing.field.summaryPlaceholder")} />
          <LabeledInput ref={descriptionRef} error={errorField === "description" ? error ?? undefined : undefined} label={i18n.t("newListing.field.description")} value={form.description} onChangeText={(value) => setField("description", value)} maxLength={4000} multiline placeholder={i18n.t("newListing.field.descriptionPlaceholder")} />
        </>
      ) : null}

      {step === "details" ? (
        <>
          <LabeledInput ref={monthlyRentRef} error={errorField === "monthlyRent" ? error ?? undefined : undefined} label={i18n.t("newListing.field.monthlyRent")} value={form.monthlyRent} onChangeText={(value) => setField("monthlyRent", value)} keyboardType="decimal-pad" maxLength={12} placeholder="5400" />
          <LabeledInput ref={depositRef} error={errorField === "deposit" ? error ?? undefined : undefined} label={i18n.t("newListing.field.deposit")} value={form.deposit} onChangeText={(value) => setField("deposit", value)} keyboardType="decimal-pad" maxLength={12} placeholder="10800" />
          <LabeledInput ref={sizeRef} error={errorField === "sizeSqm" ? error ?? undefined : undefined} label={sizeLabel} value={form.sizeSqm} onChangeText={(value) => setField("sizeSqm", value)} keyboardType="decimal-pad" maxLength={8} placeholder={form.propertyType === "room" ? "14" : "72"} />
          {showBedrooms ? <LabeledInput ref={bedroomCountRef} error={errorField === "bedroomCount" ? error ?? undefined : undefined} label={i18n.t("newListing.field.bedrooms")} value={form.bedroomCount} onChangeText={(value) => setField("bedroomCount", value)} keyboardType="number-pad" maxLength={3} placeholder="2" /> : null}
          <LabeledInput ref={bathroomCountRef} error={errorField === "bathroomCount" ? error ?? undefined : undefined} label={i18n.t("newListing.field.bathrooms")} value={form.bathroomCount} onChangeText={(value) => setField("bathroomCount", value)} keyboardType="decimal-pad" maxLength={3} placeholder="1" />
          <ChoiceRow label={i18n.t("newListing.field.utilities")} options={booleanOptions} value={form.utilitiesIncluded ? "yes" : "no"} onChange={(value) => setField("utilitiesIncluded", value === "yes")} />
          <ChoiceRow label={i18n.t("newListing.field.furnished")} options={booleanOptions} value={form.furnished ? "yes" : "no"} onChange={(value) => setField("furnished", value === "yes")} />
          <LabeledInput ref={availableFromRef} error={errorField === "availableFrom" ? error ?? undefined : undefined} label={i18n.t("newListing.field.availableFrom")} hint={i18n.t("newListing.field.dateHint")} value={form.availableFrom} onChangeText={(value) => setField("availableFrom", value)} maxLength={10} placeholder="2026-09-01" />
          {form.rentalArrangement === "sublease" ? <LabeledInput ref={availableToRef} error={errorField === "availableTo" ? error ?? undefined : undefined} label={i18n.t("newListing.field.availableTo")} hint={i18n.t("newListing.field.availableToHint")} value={form.availableTo} onChangeText={(value) => setField("availableTo", value)} maxLength={10} placeholder="2027-02-28" /> : null}
          <LabeledInput ref={minLeaseMonthsRef} error={errorField === "minLeaseMonths" ? error ?? undefined : undefined} label={i18n.t("newListing.field.minimumLease")} value={form.minLeaseMonths} onChangeText={(value) => setField("minLeaseMonths", value)} keyboardType="number-pad" maxLength={3} placeholder="6" />
          <LabeledInput ref={maxLeaseMonthsRef} error={errorField === "maxLeaseMonths" ? error ?? undefined : undefined} label={i18n.t("newListing.field.maximumLease")} value={form.maxLeaseMonths} onChangeText={(value) => setField("maxLeaseMonths", value)} keyboardType="number-pad" maxLength={3} placeholder="24" />
        </>
      ) : null}

      {step === "features" ? (
        <FlowCard>
          <Heading level={2} style={{ fontSize: 18, fontWeight: "800" }}>{i18n.t("newListing.step.features")}</Heading>
          <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>{i18n.t("newListing.featuresBody")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AMENITIES.map((amenity) => {
              const selected = form.amenities.includes(amenity.value);
              return (
                <SelectChip
                  key={amenity.value}
                  label={i18n.t(amenity.labelKey)}
                  selected={selected}
                  onPress={() => setField("amenities", selected ? form.amenities.filter((value) => value !== amenity.value) : [...form.amenities, amenity.value])}
                />
              );
            })}
          </View>
        </FlowCard>
      ) : null}

      {step === "location" ? (
        <>
          <FlowCard>
            <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.body }}>{i18n.t("newListing.locationPrivacy")}</Text>
          </FlowCard>
          <LabeledInput ref={addressLine1Ref} error={errorField === "addressLine1" ? error ?? undefined : undefined} label={i18n.t("newListing.field.street")} value={form.addressLine1} onChangeText={(value) => setField("addressLine1", value)} maxLength={160} placeholder="Jægersborggade 12" />
          <LabeledInput label={i18n.t("newListing.field.unit")} value={form.addressLine2} onChangeText={(value) => setField("addressLine2", value)} maxLength={100} placeholder="2. th." />
          <LabeledInput ref={postalCodeRef} error={errorField === "postalCode" ? error ?? undefined : undefined} label={i18n.t("newListing.field.postalCode")} value={form.postalCode} onChangeText={(value) => setField("postalCode", value)} maxLength={20} placeholder="2200" />
          <LabeledInput ref={cityRef} error={errorField === "city" ? error ?? undefined : undefined} label={i18n.t("newListing.field.city")} value={form.city} onChangeText={(value) => setField("city", value)} maxLength={100} placeholder="Copenhagen" />
          <LabeledInput label={i18n.t("newListing.field.neighborhood")} value={form.neighborhood} onChangeText={(value) => setField("neighborhood", value)} maxLength={100} placeholder="Nørrebro" />
          <LabeledInput ref={countryCodeRef} error={errorField === "countryCode" ? error ?? undefined : undefined} label={i18n.t("newListing.field.countryCode")} hint={i18n.t("newListing.field.countryCodeHint")} value={form.countryCode} onChangeText={(value) => setField("countryCode", value)} autoCapitalize="characters" maxLength={2} placeholder="DK" />
        </>
      ) : null}

      {step === "photos" ? (
        <>
          <FlowCard>
            <Heading level={2} style={{ fontSize: 18, fontWeight: "800" }}>{i18n.t("newListing.step.photos")}</Heading>
            <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>{i18n.t("newListing.photosBody")}</Text>
            <Button disabled={Boolean(busyAction) || draft.photos.length >= 12} label={busyAction === "upload" ? i18n.t("newListing.uploadingPhoto") : i18n.t("newListing.addPhoto")} variant="surface" onPress={uploadPhoto} />
          </FlowCard>
          {draft.photos.map((photo, index) => {
            const photoLabel = index === 0
              ? i18n.t("newListing.cover")
              : i18n.t("newListing.photo", { index: i18n.formatNumber(index + 1) });
            const accessibilityLabel = i18n.t("newListing.photoAccessibility", {
              photo: photoLabel,
              title: form.title || i18n.t("newListing.listingFallback"),
            });
            return (
              <FlowCard key={photo.storageId} style={{ padding: 0, overflow: "hidden" }}>
                {photo.url ? <Image accessibilityLabel={accessibilityLabel} alt={accessibilityLabel} source={{ uri: photo.url }} contentFit="cover" style={{ width: "100%", aspectRatio: 16 / 10 }} /> : null}
                <Text selectable style={{ paddingHorizontal: 16, paddingBottom: 16, fontSize: 13, color: theme.muted }}>
                  {index === 0 ? i18n.t("newListing.coverPhoto") : photoLabel}
                </Text>
              </FlowCard>
            );
          })}
        </>
      ) : null}

      {step === "review" ? (
        <>
          <FlowCard>
            <Heading level={2} style={{ fontSize: 20, fontWeight: "800" }}>{form.title || i18n.t("newListing.untitled")}</Heading>
            <DataRow label={i18n.t("newListing.review.home")} value={`${selectedPropertyType?.label ?? form.propertyType} · ${selectedRentalArrangement?.label ?? form.rentalArrangement}`} />
            <DataRow label={i18n.t("newListing.review.rent")} value={formatHostRent(parsePositiveNumber(form.monthlyRent) ?? undefined, "DKK", i18n.t, i18n.formatCurrency)} />
            <DataRow label={i18n.t("newListing.review.publicArea")} value={draft.publicLocationLabel ?? i18n.t("newListing.review.publicAreaPending")} />
            <DataRow label={i18n.t("newListing.review.privateAddress")} value={i18n.t("newListing.review.privateAddressValue")} />
            {publicCoordinate ? <DataRow label={i18n.t("newListing.review.publicPin")} value={`${i18n.formatNumber(publicCoordinate.latitude, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}, ${i18n.formatNumber(publicCoordinate.longitude, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`} /> : null}
            <DataRow label={i18n.t("newListing.review.photos")} value={i18n.formatNumber(draft.photos.length)} />
          </FlowCard>
          {!draft.completion.canPublish || !publicCoordinate ? (
            <FlowCard>
              <Heading level={2} style={{ fontSize: 17, fontWeight: "800" }}>{i18n.t("newListing.finishTitle")}</Heading>
              {draft.completion.checklist.filter((item) => !item.complete).map((item) => <Text key={item.key} selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>• {isChecklistKey(item.key) ? i18n.t(CHECKLIST_KEYS[item.key]) : item.label}</Text>)}
              {!publicCoordinate ? <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>• {i18n.t("newListing.verifyAddress")}</Text> : null}
            </FlowCard>
          ) : null}
          <Button disabled={!draft.completion.canPublish || !publicCoordinate || Boolean(busyAction)} label={busyAction === "publish" ? i18n.t("newListing.publishing") : draft.status === "paused" ? i18n.t("newListing.saveResume") : i18n.t("newListing.publish")} onPress={publish} />
        </>
      ) : null}

      {error && !errorField ? <SystemState kind="error" title={i18n.t("newListing.continueError")} message={error} /> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {step !== "basics" ? <Button disabled={Boolean(busyAction)} label={i18n.t("common.back")} variant="surface" onPress={() => { setError(null); setErrorField(null); setStep(stepBefore(step)); }} style={{ flexGrow: 1 }} /> : null}
        {step !== "review" ? <Button disabled={Boolean(busyAction) || connection === "offline"} label={busyAction === "save" ? i18n.t("newListing.saving") : i18n.t("newListing.saveContinue")} onPress={saveAndContinue} style={{ flexGrow: 1 }} /> : null}
      </View>
    </FlowScreen>
  );
}
