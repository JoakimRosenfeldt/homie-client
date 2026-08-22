import { useAction, useMutation } from "convex/react";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { SectionLabel, SelectChip } from "@/components/chip";
import { Overlay } from "@/components/screen";
import { Text } from "@/components/text";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import { useSession } from "@/features/nabo/store";
import { LISTING_RULES } from "@/features/profile/data";
import { fontFamilyForWeight } from "@/theme/fonts";
import { useTheme } from "@/theme/tokens";

const PROPERTY_TYPES = ["Room", "Studio", "Apartment", "House"] as const;
const MAX_LISTING_PHOTOS = 12;
const PROPERTY_TYPE_VALUES = {
  Room: "room",
  Studio: "studio",
  Apartment: "apartment",
  House: "house",
} as const;

type PropertyType = (typeof PROPERTY_TYPES)[number];
type LocalPhoto = { uri: string; width: number; height: number };
type AddressSuggestion = {
  label: string;
  addressLine1: string;
  postalCode?: string;
  city?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};
type AddressSearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; suggestions: AddressSuggestion[] }
  | { kind: "error"; message: string }
  | { kind: "selected"; label: string };
type ListingForm = {
  title: string;
  description: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  monthlyRent: string;
  sizeSqm: string;
  availableFrom: string;
};

const INITIAL_FORM: ListingForm = {
  title: "Room in a 3-person flat",
  description:
    "Bright room in a calm shared home. We cook together sometimes and value a clean, relaxed place to live.",
  addressLine1: "Åboulevarden 55",
  postalCode: "8000",
  city: "Aarhus",
  monthlyRent: "5400",
  sizeSqm: "14",
  availableFrom: "2026-09-01",
};

function isStorageUploadResult(value: unknown): value is { storageId: Id<"_storage"> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "storageId" in value &&
    typeof value.storageId === "string" &&
    value.storageId.length > 0
  );
}

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

export default function NewListingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const identity = useDeviceIdentity();
  const createDraft = useMutation(api.listings.createDraft);
  const saveSection = useMutation(api.listings.saveSection);
  const searchAddresses = useAction(api.listings.searchAddresses);
  const geocodeLocation = useAction(api.listings.geocodeLocation);
  const generatePhotoUploadUrl = useMutation(api.listings.generatePhotoUploadUrl);
  const attachPhoto = useMutation(api.listings.attachPhoto);
  const discardPhotoUpload = useMutation(api.listings.discardPhotoUpload);
  const publishDraft = useMutation(api.listings.publish);
  const [form, setForm] = React.useState(INITIAL_FORM);
  const [propertyType, setPropertyType] = React.useState<PropertyType>("Room");
  const [rules, setRules] = React.useState<Record<string, boolean>>({
    "Non-smoking": true,
    Furnished: true,
    "Min. 6 months": true,
  });
  const [photos, setPhotos] = React.useState<LocalPhoto[]>([]);
  const [listingId, setListingId] = React.useState<Id<"listings"> | null>(null);
  const [busyLabel, setBusyLabel] = React.useState("");
  const [error, setError] = React.useState("");
  const [addressTouched, setAddressTouched] = React.useState(false);
  const [addressSearch, setAddressSearch] = React.useState<AddressSearchState>({ kind: "idle" });
  const addressCache = React.useRef(new Map<string, AddressSuggestion[]>());
  const uploadedCount = React.useRef(0);

  const setField = (field: keyof ListingForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  React.useEffect(() => {
    if (!addressTouched || identity.kind !== "ready") return;
    const query = [form.addressLine1, form.postalCode, form.city, "Denmark"]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");
    if (form.addressLine1.trim().length < 3) return;

    let active = true;
    const timer = setTimeout(() => {
      const cached = addressCache.current.get(query);
      if (cached) {
        setAddressSearch({ kind: "results", suggestions: cached });
        return;
      }
      setAddressSearch({ kind: "loading" });
      void searchAddresses({ ownerKey: identity.ownerKey, query })
        .then((suggestions) => {
          if (!active) return;
          addressCache.current.set(query, suggestions);
          setAddressSearch({ kind: "results", suggestions });
        })
        .catch((caught: unknown) => {
          if (!active) return;
          setAddressSearch({
            kind: "error",
            message: readableBackendError(caught),
          });
        });
    }, 1_100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    addressTouched,
    form.addressLine1,
    form.city,
    form.postalCode,
    identity,
    searchAddresses,
  ]);

  const changeAddress = (value: string) => {
    setField("addressLine1", value);
    setAddressTouched(true);
    setAddressSearch({ kind: "idle" });
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    setForm((current) => ({
      ...current,
      addressLine1: suggestion.addressLine1,
      postalCode: suggestion.postalCode ?? current.postalCode,
      city: suggestion.city ?? current.city,
    }));
    setAddressTouched(false);
    setAddressSearch({ kind: "selected", label: suggestion.label });
    setError("");
  };

  const pickPhoto = async (slot?: number) => {
    if (busyLabel) return;
    setError("");
    try {
      if (process.env.EXPO_OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("Allow photo-library access to add listing photos.");
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
      const nextPhoto = { uri: sanitized.uri, width: sanitized.width, height: sanitized.height };
      setPhotos((current) => {
        if (slot !== undefined && slot < current.length) {
          return current.map((photo, index) => (index === slot ? nextPhoto : photo));
        }
        return current.length < MAX_LISTING_PHOTOS ? [...current, nextPhoto] : current;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The photo could not be opened.");
    }
  };

  const validate = () => {
    const rent = Number(form.monthlyRent.replace(",", "."));
    const size = Number(form.sizeSqm.replace(",", "."));
    if (!form.title.trim()) return "Add a headline.";
    if (!form.description.trim()) return "Add a description.";
    if (!form.addressLine1.trim() || !form.postalCode.trim() || !form.city.trim()) {
      return "Add the full address.";
    }
    if (!Number.isFinite(rent) || rent <= 0) return "Enter a valid monthly rent.";
    if (!Number.isFinite(size) || size <= 0) return "Enter a valid room size.";
    if (!validDate(form.availableFrom)) return "Use YYYY-MM-DD for the available date.";
    if (photos.length === 0) return "Add at least one photo.";
    return "";
  };

  const uploadPhoto = async (draftId: Id<"listings">, photo: LocalPhoto, ownerKey: string) => {
    let pending:
      | { uploadSessionId: Id<"fileUploads">; storageId: Id<"_storage"> }
      | undefined;
    try {
      const fileResponse = await fetch(photo.uri);
      if (!fileResponse.ok) throw new Error("The selected photo could not be read.");
      const uploadSession = await generatePhotoUploadUrl({ listingId: draftId, ownerKey });
      const uploadResponse = await fetch(uploadSession.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: await fileResponse.blob(),
      });
      if (!uploadResponse.ok) throw new Error("The photo upload failed.");
      const result: unknown = await uploadResponse.json();
      if (!isStorageUploadResult(result)) throw new Error("The photo service returned an invalid response.");
      pending = { uploadSessionId: uploadSession.uploadSessionId, storageId: result.storageId };
      await attachPhoto({
        listingId: draftId,
        ownerKey,
        ...pending,
        width: photo.width,
        height: photo.height,
        mimeType: "image/jpeg",
      });
      pending = undefined;
    } catch (caught) {
      if (pending) {
        try {
          await discardPhotoUpload({ listingId: draftId, ownerKey, ...pending });
        } catch {
          // Preserve the upload error shown to the user.
        }
      }
      throw caught;
    }
  };

  const publish = async () => {
    if (busyLabel) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (identity.kind !== "ready") {
      setError(identity.kind === "error" ? identity.error : "Your device identity is still loading.");
      return;
    }

    setError("");
    setBusyLabel("Creating draft…");
    try {
      const ownerKey = identity.ownerKey;
      const draftId = listingId ?? (await createDraft({ ownerKey })).listingId;
      if (!listingId) setListingId(draftId);

      setBusyLabel("Saving details…");
      await saveSection({
        listingId: draftId,
        ownerKey,
        input: {
          section: "basics",
          payload: {
            title: form.title.trim(),
            summary: form.description.trim().slice(0, 220),
            description: form.description.trim(),
            propertyType: PROPERTY_TYPE_VALUES[propertyType],
            rentalArrangement: "standard",
            contentLanguage: "en",
          },
        },
      });
      await saveSection({
        listingId: draftId,
        ownerKey,
        input: {
          section: "details",
          payload: {
            monthlyRent: Number(form.monthlyRent.replace(",", ".")),
            currency: "DKK",
            utilitiesIncluded: true,
            sizeSqm: Number(form.sizeSqm.replace(",", ".")),
            furnished: Boolean(rules.Furnished),
            availableFrom: form.availableFrom,
            minLeaseMonths: rules["Min. 6 months"] ? 6 : undefined,
          },
        },
      });
      await saveSection({
        listingId: draftId,
        ownerKey,
        input: {
          section: "features",
          payload: {
            amenities: [
              ...(rules["Pets ok"] ? ["petsAllowed" as const] : []),
              ...(rules["Non-smoking"] ? [] : ["smokingAllowed" as const]),
            ],
          },
        },
      });
      await saveSection({
        listingId: draftId,
        ownerKey,
        input: {
          section: "location",
          payload: {
            addressLine1: form.addressLine1.trim(),
            postalCode: form.postalCode.trim(),
            city: form.city.trim(),
            countryCode: "DK",
            publicLocationLabel: form.city.trim(),
          },
        },
      });

      setBusyLabel("Confirming address…");
      await geocodeLocation({ listingId: draftId, ownerKey });

      for (let index = uploadedCount.current; index < photos.length; index += 1) {
        setBusyLabel("Uploading photo " + (index + 1) + " of " + photos.length + "…");
        await uploadPhoto(draftId, photos[index], ownerKey);
        uploadedCount.current = index + 1;
      }

      setBusyLabel("Publishing…");
      await publishDraft({ listingId: draftId, ownerKey });
      session.notify("Listing is live. Applicants will appear as they apply.");
      router.replace("/host");
    } catch (caught) {
      setError(readableBackendError(caught));
    } finally {
      setBusyLabel("");
    }
  };

  return (
    <Overlay>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}>
        <Pressable accessibilityRole="button" disabled={Boolean(busyLabel)} onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.faint }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>New listing</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {photos.map((photo, index) => (
            <PhotoCard
              key={photo.uri + index}
              photo={photo}
              index={index}
              disabled={Boolean(busyLabel)}
              onPress={() => void pickPhoto(index)}
            />
          ))}
          {photos.length < MAX_LISTING_PHOTOS ? (
            <PhotoCard
              disabled={Boolean(busyLabel)}
              onPress={() => void pickPhoto()}
            />
          ) : null}
        </View>

        <ListingInput label="HEADLINE" value={form.title} onChangeText={(value) => setField("title", value)} />
        <ListingInput
          label="DESCRIPTION"
          value={form.description}
          onChangeText={(value) => setField("description", value)}
          multiline
        />

        <View style={{ gap: 11 }}>
          <SectionLabel label="HOME TYPE" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {PROPERTY_TYPES.map((type) => (
              <SelectChip key={type} label={type} selected={propertyType === type} onPress={() => setPropertyType(type)} />
            ))}
          </View>
        </View>

        <AddressSearchField
          value={form.addressLine1}
          state={addressSearch}
          onChangeText={changeAddress}
          onSelect={selectAddress}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <ListingInput
            label="POSTAL CODE"
            value={form.postalCode}
            onChangeText={(value) => setField("postalCode", value)}
            keyboardType="number-pad"
            style={{ flex: 0.42 }}
          />
          <ListingInput
            label="CITY"
            value={form.city}
            onChangeText={(value) => setField("city", value)}
            autoComplete="postal-address-locality"
            style={{ flex: 0.58 }}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <ListingInput
            label="MONTHLY RENT"
            value={form.monthlyRent}
            onChangeText={(value) => setField("monthlyRent", value)}
            keyboardType="number-pad"
            suffix="kr"
            style={{ flex: 0.58 }}
          />
          <ListingInput
            label="SIZE"
            value={form.sizeSqm}
            onChangeText={(value) => setField("sizeSqm", value)}
            keyboardType="decimal-pad"
            suffix="m²"
            style={{ flex: 0.42 }}
          />
        </View>
        <ListingInput
          label="AVAILABLE FROM"
          value={form.availableFrom}
          onChangeText={(value) => setField("availableFrom", value)}
          placeholder="YYYY-MM-DD"
        />

        <View style={{ gap: 11 }}>
          <SectionLabel label="HOUSE RULES" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LISTING_RULES.map((rule) => (
              <SelectChip
                key={rule}
                label={rule}
                selected={Boolean(rules[rule])}
                onPress={() => setRules((current) => ({ ...current, [rule]: !current[rule] }))}
              />
            ))}
          </View>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={{ fontSize: 13, lineHeight: 19, color: theme.danger }}>
            {error}
          </Text>
        ) : null}

        <Text style={{ fontSize: 12.5, lineHeight: 19, fontWeight: "500", color: theme.faint }}>
          Publishing saves the listing to Homie. Everyone who applies will appear in your host dashboard.
        </Text>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 14) + 12,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.card,
        }}>
        <Button
          label={busyLabel || "Publish listing"}
          disabled={Boolean(busyLabel)}
          onPress={() => void publish()}
        />
      </View>
    </Overlay>
  );
}

function PhotoCard({
  photo,
  index,
  disabled,
  onPress,
}: {
  photo?: LocalPhoto;
  index?: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={photo ? "Change listing photo " + ((index ?? 0) + 1) : "Add listing photo"}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: "31.6%",
        aspectRatio: 3 / 4,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderStyle: photo ? "solid" : "dashed",
        borderColor: photo ? theme.accent : theme.borderDashed,
        backgroundColor: theme.card,
        opacity: pressed ? 0.82 : 1,
      })}>
      {photo ? (
        <Image source={{ uri: photo.uri }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
      ) : (
        <Text style={{ fontSize: 12, fontWeight: "600", color: theme.faint }}>+ add</Text>
      )}
    </Pressable>
  );
}

function AddressSearchField({
  value,
  state,
  onChangeText,
  onSelect,
}: {
  value: string;
  state: AddressSearchState;
  onChangeText: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <ListingInput
        label="ADDRESS"
        value={value}
        onChangeText={onChangeText}
        autoComplete="street-address"
      />
      {state.kind === "loading" ? (
        <Text accessibilityLiveRegion="polite" style={{ paddingHorizontal: 5, fontSize: 12, color: theme.faint }}>
          Searching Danish addresses…
        </Text>
      ) : null}
      {state.kind === "error" ? (
        <Text accessibilityRole="alert" style={{ paddingHorizontal: 5, fontSize: 12, color: theme.danger }}>
          {state.message}
        </Text>
      ) : null}
      {state.kind === "selected" ? (
        <Text accessibilityLiveRegion="polite" numberOfLines={2} style={{ paddingHorizontal: 5, fontSize: 12, lineHeight: 17, color: theme.accent }}>
          Address selected: {state.label}
        </Text>
      ) : null}
      {state.kind === "results" && state.suggestions.length === 0 ? (
        <Text style={{ paddingHorizontal: 5, fontSize: 12, lineHeight: 17, color: theme.faint }}>
          No Danish addresses found. Check the spelling or keep typing the address manually.
        </Text>
      ) : null}
      {state.kind === "results" && state.suggestions.length > 0 ? (
        <View
          accessibilityLabel="Address suggestions"
          style={{
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.borderSoft,
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: theme.card,
          }}>
          {state.suggestions.map((suggestion, index) => (
            <Pressable
              key={`${suggestion.latitude}:${suggestion.longitude}`}
              accessibilityRole="button"
              accessibilityLabel={`Use ${suggestion.label}`}
              onPress={() => onSelect(suggestion)}
              style={({ pressed }) => ({
                gap: 2,
                paddingHorizontal: 15,
                paddingVertical: 11,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.borderSoft,
                backgroundColor: pressed ? theme.hover : theme.card,
              })}>
              <Text style={{ fontSize: 13.5, fontWeight: "600", color: theme.ink }}>
                {suggestion.addressLine1}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: theme.faint }}>
                {[suggestion.postalCode, suggestion.city].filter(Boolean).join(" ") || suggestion.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ListingInput({
  label,
  value,
  onChangeText,
  multiline = false,
  suffix,
  style,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  suffix?: string;
  style?: { flex: number };
  keyboardType?: "number-pad" | "decimal-pad";
  autoComplete?: "street-address" | "postal-address-locality";
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          gap: 3,
          minHeight: multiline ? 116 : undefined,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 22,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: theme.borderSoft,
          backgroundColor: theme.card,
        },
        style,
      ]}>
      <Text style={{ fontSize: 10.5, fontWeight: "600", letterSpacing: 0.74, color: theme.faint }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          accessibilityLabel={label.toLocaleLowerCase()}
          placeholderTextColor={theme.faint}
          style={{
            flex: 1,
            minHeight: multiline ? 76 : 24,
            padding: 0,
            color: theme.ink,
            fontFamily: fontFamilyForWeight("600"),
            fontSize: 15,
            lineHeight: 21,
            textAlignVertical: multiline ? "top" : "center",
          }}
        />
        {suffix ? <Text style={{ fontSize: 13, fontWeight: "600", color: theme.faint }}>{suffix}</Text> : null}
      </View>
    </View>
  );
}
