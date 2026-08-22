import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/button";
import { SectionLabel, SelectChip } from "@/components/chip";
import { Overlay } from "@/components/screen";
import { Slider } from "@/components/slider";
import { Text } from "@/components/text";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import {
  AVAILABILITY_MONTHS,
  AVAILABILITY_PREFIX_BY_LABEL,
  RENT_RANGE,
  RENTAL_ARRANGEMENT_BY_LABEL,
  RENTAL_ARRANGEMENTS,
  useSession,
} from "@/features/nabo/store";
import { requestProfilePushRegistration } from "@/features/notifications";
import { AGENT_AREAS, AGENT_FEATURES, AGENT_FREQUENCIES } from "@/features/profile/data";
import { formatKr } from "@/features/rooms/data";
import { fontFamilyForWeight } from "@/theme/fonts";
import { useTheme } from "@/theme/tokens";

const AGENT_PROPERTY_TYPES = {
  Room: "room",
  Studio: "studio",
  Apartment: "apartment",
  House: "house",
} as const;

function isAgentPropertyType(value: string): value is keyof typeof AGENT_PROPERTY_TYPES {
  return value in AGENT_PROPERTY_TYPES;
}

export default function SearchAgentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const identity = useDeviceIdentity();
  const params = useLocalSearchParams<{
    savedSearchId?: string | string[];
    name?: string | string[];
    area?: string | string[];
    maximumRent?: string | string[];
    propertyTypes?: string | string[];
    rentalArrangements?: string | string[];
    availableFromPrefix?: string | string[];
  }>();
  const requestedId = firstParam(params.savedSearchId);
  const prefill = requestedId ? undefined : searchPrefillFromParams(params);
  const savedSearches = useQuery(
    api.savedSearches.listMine,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const saveSearch = useMutation(api.savedSearches.save);
  const removeSearch = useMutation(api.savedSearches.remove);
  const registerPushToken = useMutation(api.savedSearches.registerPushToken);
  const existing = requestedId ? savedSearches?.find((search) => String(search._id) === requestedId) : undefined;
  const [name, setName] = React.useState(() => prefill?.name ?? "Aarhus, under 6.500");
  const [rent, setRent] = React.useState(() => prefill?.maximumRent ?? 6500);
  const [areas, setAreas] = React.useState<Record<string, boolean>>(() =>
    prefill?.area ? { [prefill.area]: true } : { Aarhus: true },
  );
  const [features, setFeatures] = React.useState<Record<string, boolean>>(() =>
    prefill?.propertyTypes ?? { Room: true },
  );
  const [arrangements, setArrangements] = React.useState<Record<string, boolean>>(
    () => prefill?.rentalArrangements ?? {},
  );
  const [availability, setAvailability] = React.useState<(typeof AVAILABILITY_MONTHS)[number] | "">(
    () => prefill?.availability ?? "",
  );
  const [frequency, setFrequency] = React.useState("Instantly");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState("");
  const hydratedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!existing || hydratedId.current === String(existing._id)) return;
    hydratedId.current = String(existing._id);
    setName(existing.name);
    setRent(existing.maximumRent ?? 6500);
    setAreas(existing.area ? { [existing.area]: true } : {});
    setFeatures(
      Object.fromEntries(
        Object.entries(AGENT_PROPERTY_TYPES).map(([label, value]) => [
          label,
          existing.propertyTypes.includes(value),
        ]),
      ),
    );
    setArrangements(
      Object.fromEntries(
        RENTAL_ARRANGEMENTS.map((label) => [
          label,
          existing.rentalArrangements?.includes(RENTAL_ARRANGEMENT_BY_LABEL[label]) ?? false,
        ]),
      ),
    );
    setAvailability(
      AVAILABILITY_MONTHS.find(
        (label) => AVAILABILITY_PREFIX_BY_LABEL[label] === existing.availableFromPrefix,
      ) ?? "",
    );
    setFrequency(existing.notificationsEnabled ? "Instantly" : "Saved only");
  }, [existing]);

  const selectedAreaNames = Object.keys(areas).filter((area) => areas[area]);
  const selectedPropertyTypes = Object.keys(features).flatMap((feature) =>
    features[feature] && isAgentPropertyType(feature) ? [AGENT_PROPERTY_TYPES[feature]] : [],
  );
  const selectedRentalArrangements = RENTAL_ARRANGEMENTS.flatMap((label) =>
    arrangements[label] ? [RENTAL_ARRANGEMENT_BY_LABEL[label]] : [],
  );
  const matchingListings = useQuery(api.listings.explore, {
    filters: {
      area: selectedAreaNames.length === 1 ? selectedAreaNames[0] : undefined,
      propertyTypes: selectedPropertyTypes,
      rentalArrangements: selectedRentalArrangements,
      maximumRent: rent,
    },
    sort: "newest",
    limit: 100,
  });
  const selectedAreas = Object.values(areas).filter(Boolean).length;
  const liveHitCount = (matchingListings?.items ?? []).filter(
    (listing) => !availability || listing.availableFrom?.startsWith(AVAILABILITY_PREFIX_BY_LABEL[availability]),
  ).length;
  const estimate = selectedAreas
    ? matchingListings === undefined
      ? "Checking current listings…"
      : `${liveHitCount} ${liveHitCount === 1 ? "live home matches" : "live homes match"} these criteria.`
    : "Pick at least one area to see how many rooms match.";

  const save = async () => {
    if (identity.kind !== "ready" || saving || selectedAreas === 0) {
      setError(selectedAreas === 0 ? "Pick at least one area." : "Your device identity is still loading.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let notificationsEnabled = false;
      let notificationMessage = "Search saved.";
      if (frequency === "Instantly") {
        const push = await requestProfilePushRegistration({ ownerKey: identity.ownerKey, choice: "enable" });
        if (push.kind === "register") {
          await registerPushToken(push.registration);
          notificationsEnabled = true;
          notificationMessage = "Search agent is on. New matches will trigger an alert.";
        } else {
          notificationMessage = "Search saved. Push alerts are unavailable on this device.";
        }
      }

      await saveSearch({
        ownerKey: identity.ownerKey,
        savedSearchId: existing?._id,
        name: name.trim() || "Untitled agent",
        area: selectedAreaNames.length === 1 ? selectedAreaNames[0] : undefined,
        propertyTypes: selectedPropertyTypes,
        rentalArrangements: selectedRentalArrangements,
        availableFromPrefix: availability
          ? AVAILABILITY_PREFIX_BY_LABEL[availability]
          : undefined,
        maximumRent: rent,
        notificationsEnabled,
      });
      session.notify(notificationMessage);
      router.back();
    } catch (caught) {
      setError(readableBackendError(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (identity.kind !== "ready" || !existing || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await removeSearch({ ownerKey: identity.ownerKey, savedSearchId: existing._id });
      session.notify("Search agent removed.");
      router.back();
    } catch (caught) {
      setError(readableBackendError(caught));
      setDeleting(false);
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
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.faint }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>New search agent</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}>
        <Text style={{ fontSize: 13.5, lineHeight: 21, fontWeight: "500", color: theme.muted }}>
          Good rooms move quickly. An agent checks every new Aarhus listing against your criteria and pings you first.
        </Text>

        <View style={fieldStyle(theme)}>
          <Text style={{ fontSize: 10.5, fontWeight: "600", letterSpacing: 0.74, color: theme.faint }}>AGENT NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            accessibilityLabel="Agent name"
            style={{ padding: 0, fontFamily: fontFamilyForWeight("600"), fontSize: 15, color: theme.ink }}
          />
        </View>

        <ChipSection
          label="AREA"
          options={AGENT_AREAS}
          selected={areas}
          onToggle={(area) => setAreas((current) => (current[area] ? {} : { [area]: true }))}
        />

        <View style={{ gap: 11 }}>
          <SectionLabel label="MAX RENT" />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>Any</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>{formatKr(rent)}</Text>
          </View>
          <Slider
            accessibilityLabel="Maximum rent"
            min={RENT_RANGE.min}
            max={RENT_RANGE.max}
            step={RENT_RANGE.step}
            value={rent}
            onChange={setRent}
          />
        </View>

        <ChipSection
          label="HOME TYPE"
          options={AGENT_FEATURES}
          selected={features}
          onToggle={(feature) => toggle(features, setFeatures, feature)}
        />

        <ChipSection
          label="RENTAL ARRANGEMENT"
          options={[...RENTAL_ARRANGEMENTS]}
          selected={arrangements}
          onToggle={(arrangement) => toggle(arrangements, setArrangements, arrangement)}
        />

        <ChipSection
          label="AVAILABLE FROM"
          options={[...AVAILABILITY_MONTHS]}
          selected={Object.fromEntries(AVAILABILITY_MONTHS.map((month) => [month, month === availability]))}
          onToggle={(month) => {
            if (isAvailabilityMonth(month)) {
              setAvailability((current) => current === month ? "" : month);
            }
          }}
        />

        <View style={{ gap: 11 }}>
          <SectionLabel label="NOTIFY ME" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AGENT_FREQUENCIES.map((option) => (
              <SelectChip key={option} label={option} selected={frequency === option} onPress={() => setFrequency(option)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 5, paddingHorizontal: 17, paddingVertical: 15, borderRadius: 22, backgroundColor: theme.accentSoft }}>
          <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.88, color: theme.accent }}>RIGHT NOW</Text>
          <Text style={{ fontSize: 13, lineHeight: 20, fontWeight: "500", color: theme.accent }}>{estimate}</Text>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={{ fontSize: 13, lineHeight: 19, color: theme.danger }}>
            {error}
          </Text>
        ) : null}

        {existing ? (
          <Button
            label={deleting ? "Removing…" : "Remove this agent"}
            variant="destructive"
            disabled={deleting || saving}
            onPress={() => void remove()}
          />
        ) : null}
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
          label={saving ? "Saving…" : existing ? "Save changes" : "Turn on this agent"}
          disabled={saving || deleting}
          onPress={() => void save()}
        />
      </View>
    </Overlay>
  );
}

function ChipSection({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Record<string, boolean>;
  onToggle: (value: string) => void;
}) {
  return (
    <View style={{ gap: 11 }}>
      <SectionLabel label={label} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => (
          <SelectChip key={option} label={option} selected={Boolean(selected[option])} onPress={() => onToggle(option)} />
        ))}
      </View>
    </View>
  );
}

function toggle(current: Record<string, boolean>, set: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, key: string) {
  set({ ...current, [key]: !current[key] });
}

function fieldStyle(theme: ReturnType<typeof useTheme>) {
  return {
    gap: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.card,
  };
}

type SearchAgentParams = {
  name?: string | string[];
  area?: string | string[];
  maximumRent?: string | string[];
  propertyTypes?: string | string[];
  rentalArrangements?: string | string[];
  availableFromPrefix?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isAvailabilityMonth(value: string): value is (typeof AVAILABILITY_MONTHS)[number] {
  return AVAILABILITY_MONTHS.some((month) => month === value);
}

function searchPrefillFromParams(params: SearchAgentParams) {
  const requestedName = firstParam(params.name)?.trim();
  const requestedArea = firstParam(params.area);
  const requestedRent = Number(firstParam(params.maximumRent));
  const requestedPropertyTypes = new Set(
    (firstParam(params.propertyTypes) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const requestedRentalArrangements = new Set(
    (firstParam(params.rentalArrangements) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const requestedAvailableFromPrefix = firstParam(params.availableFromPrefix);
  const area = requestedArea && AGENT_AREAS.includes(requestedArea) ? requestedArea : undefined;
  const maximumRent =
    Number.isFinite(requestedRent) && requestedRent >= RENT_RANGE.min && requestedRent <= RENT_RANGE.max
      ? Math.round(requestedRent / RENT_RANGE.step) * RENT_RANGE.step
      : undefined;
  const propertyTypes = Object.fromEntries(
    Object.entries(AGENT_PROPERTY_TYPES).map(([label, value]) => [label, requestedPropertyTypes.has(value)]),
  );
  const rentalArrangements = Object.fromEntries(
    RENTAL_ARRANGEMENTS.map((label) => [
      label,
      requestedRentalArrangements.has(RENTAL_ARRANGEMENT_BY_LABEL[label]),
    ]),
  );
  const availability = AVAILABILITY_MONTHS.find(
    (label) => AVAILABILITY_PREFIX_BY_LABEL[label] === requestedAvailableFromPrefix,
  );

  if (
    !requestedName &&
    !area &&
    maximumRent === undefined &&
    requestedPropertyTypes.size === 0 &&
    requestedRentalArrangements.size === 0 &&
    !availability
  ) {
    return undefined;
  }

  return {
    name: requestedName || undefined,
    area,
    maximumRent,
    propertyTypes,
    rentalArrangements,
    availability,
  };
}
