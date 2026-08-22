import { router } from "expo-router";
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { SectionLabel, SelectChip, SoftPill } from "@/components/chip";
import { Photo } from "@/components/photo";
import { Overlay } from "@/components/screen";
import { Text } from "@/components/text";
import { useSession } from "@/features/nabo/store";
import {
  ONBOARDING_FIELDS,
  ONBOARDING_STEPS,
  ONBOARDING_TAG_GROUPS,
  OWNER_PROFILE,
} from "@/features/profile/data";
import { fontFamilyForWeight } from "@/theme/fonts";
import { radius, shadow, useTheme } from "@/theme/tokens";

const LAST_STEP = ONBOARDING_STEPS.length - 1;

/**
 * The profile builder ends on a preview of the exact card a household sees
 * while swiping, so the payoff for filling it in is visible before publishing.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = React.useState(0);

  const close = () => router.back();

  const goBack = () => {
    if (step === 0) {
      close();
      return;
    }

    setStep((current) => current - 1);
  };

  const goNext = () => {
    if (step === LAST_STEP) {
      close();
      return;
    }

    setStep((current) => current + 1);
  };

  return (
    <Overlay>
      <View style={{ gap: 14, paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable accessibilityRole="button" onPress={goBack} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.faint }}>‹ Back</Text>
          </Pressable>

          <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.88, color: theme.faint }}>
            STEP {step + 1} OF {ONBOARDING_STEPS.length}
          </Text>

          <Pressable accessibilityRole="button" onPress={close} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.faint }}>Close</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 6 }}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 99,
                backgroundColor: index <= step ? theme.accent : theme.borderStrong,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
        <Text style={{ fontSize: 30, lineHeight: 34, fontWeight: "800", color: theme.ink }}>
          {ONBOARDING_STEPS[step].title}
        </Text>
        <Text style={{ fontSize: 13.5, lineHeight: 21, fontWeight: "500", color: theme.muted }}>
          {ONBOARDING_STEPS[step].help}
        </Text>

        {step === 0 ? <PhotoStep /> : null}
        {step === 1 ? <DetailsStep /> : null}
        {step === 2 ? <LifestyleStep /> : null}
        {step === 3 ? <PreviewStep /> : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 14) + 12,
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}>
        <Button label={step === LAST_STEP ? "Publish my profile" : "Continue"} onPress={goNext} />
      </View>
    </Overlay>
  );
}

function PhotoStep() {
  const theme = useTheme();

  // Two filled slots, an "+ add" affordance, then empty slots — six in a 3×2 grid.
  const slots = [0, 1, 2, 3, 4, 5];
  const rows = [slots.slice(0, 3), slots.slice(3, 6)];

  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: 10 }}>
          {row.map((slot) => {
            const filled = slot < 2;

            if (filled) {
              return <Photo key={slot} stripe={8} style={{ flex: 1, aspectRatio: 3 / 4, borderRadius: 18 }} />;
            }

            return (
              <View
                key={slot}
                style={{
                  flex: 1,
                  aspectRatio: 3 / 4,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  borderCurve: "continuous",
                  backgroundColor: theme.card,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: theme.borderDashed,
                }}>
                {slot === 2 ? (
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.faint }}>+ add</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function DetailsStep() {
  const theme = useTheme();
  const session = useSession();

  return (
    <View style={{ gap: 12 }}>
      {ONBOARDING_FIELDS.map((field) => (
        <View key={field.label} style={fieldCardStyle(theme)}>
          <Text style={{ fontSize: 10.5, fontWeight: "600", letterSpacing: 0.74, color: theme.faint }}>{field.label}</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.ink }}>{field.value}</Text>
        </View>
      ))}

      <View style={[fieldCardStyle(theme), { gap: 6 }]}>
        <Text style={{ fontSize: 10.5, fontWeight: "600", letterSpacing: 0.74, color: theme.faint }}>
          ONE LINE ABOUT YOU
        </Text>
        <TextInput
          value={session.bio}
          onChangeText={session.setBio}
          multiline
          numberOfLines={3}
          accessibilityLabel="One line about you"
          style={{
            minHeight: 66,
            fontFamily: fontFamilyForWeight("500"),
            fontSize: 14,
            lineHeight: 21,
            color: theme.ink,
            textAlignVertical: "top",
          }}
        />
      </View>
    </View>
  );
}

function fieldCardStyle(theme: ReturnType<typeof useTheme>) {
  return {
    gap: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.card,
    borderRadius: 22,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  };
}

function LifestyleStep() {
  const session = useSession();

  return (
    <View style={{ gap: 18 }}>
      {ONBOARDING_TAG_GROUPS.map((group) => (
        <View key={group.label} style={{ gap: 10 }}>
          <SectionLabel label={group.label} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {group.items.map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={Boolean(session.profileTags[item])}
                onPress={() => session.toggleProfileTag(item)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function PreviewStep() {
  const theme = useTheme();
  const session = useSession();

  return (
    <View style={{ gap: 16 }}>
      <View style={{ borderRadius: radius.cardLg, backgroundColor: theme.card, ...shadow.raised }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: radius.cardLg,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: theme.border,
            overflow: "hidden",
          }}>
          <Photo label="your first photo" style={{ height: 190 }} />

          <View style={{ gap: 9, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: theme.ink }}>{OWNER_PROFILE.firstName}</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.muted }}>{OWNER_PROFILE.age}</Text>
            </View>

            <Text style={{ fontSize: 12.5, fontWeight: "500", color: theme.muted }}>
              {OWNER_PROFILE.occupation.split(",")[0]} · Copenhagen
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {session.pickedProfileTags.slice(0, 4).map((tag) => (
                <SoftPill key={tag} label={tag} />
              ))}
            </View>

            <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 20, color: theme.body }}>{session.bio}</Text>
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 12.5, lineHeight: 19, fontWeight: "500", color: theme.faint }}>
        This is exactly what the person renting out the room sees when they swipe.
      </Text>
    </View>
  );
}
