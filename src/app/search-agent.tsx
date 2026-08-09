import { router } from "expo-router";
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { SectionLabel, SelectChip } from "@/components/chip";
import { Overlay } from "@/components/screen";
import { Slider } from "@/components/slider";
import { Text } from "@/components/text";
import { useSession } from "@/features/nabo/store";
import { AGENT_AREAS, AGENT_FEATURES, AGENT_FREQUENCIES } from "@/features/profile/data";
import { formatKr } from "@/features/rooms/data";
import { fontFamilyForWeight } from "@/theme/fonts";
import { useTheme } from "@/theme/tokens";

export default function SearchAgentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [name, setName] = React.useState("Nørrebro, under 6.500");
  const [rent, setRent] = React.useState(6500);
  const [areas, setAreas] = React.useState<Record<string, boolean>>({ Nørrebro: true, Vesterbro: true });
  const [features, setFeatures] = React.useState<Record<string, boolean>>({ Furnished: true });
  const [frequency, setFrequency] = React.useState("Instantly");

  const selectedAreas = Object.values(areas).filter(Boolean).length;
  const selectedFeatures = Object.values(features).filter(Boolean).length;
  const estimate = selectedAreas
    ? `${Math.max(1, Math.round(rent / 260) - selectedFeatures * 4)} live rooms match. About 6 new ones a week.`
    : "Pick at least one area to see how many rooms match.";

  const save = () => {
    session.addAgent({
      name: name.trim() || "Untitled agent",
      meta: `${selectedAreas} area${selectedAreas === 1 ? "" : "s"} · ${frequency.toLowerCase()}`,
      hits: 0,
    });
    router.back();
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
          Rooms in Copenhagen are gone in hours. An agent checks every new listing against your criteria and pings you first.
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

        <ChipSection label="AREAS" options={AGENT_AREAS} selected={areas} onToggle={(area) => toggle(areas, setAreas, area)} />

        <View style={{ gap: 11 }}>
          <SectionLabel label="MAX RENT" />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>Any</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>{formatKr(rent)}</Text>
          </View>
          <Slider accessibilityLabel="Maximum rent" min={4000} max={12000} step={500} value={rent} onChange={setRent} />
        </View>

        <ChipSection
          label="MUST HAVE"
          options={AGENT_FEATURES}
          selected={features}
          onToggle={(feature) => toggle(features, setFeatures, feature)}
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
        <Button label="Turn on this agent" onPress={save} />
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
