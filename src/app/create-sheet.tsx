import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useListingColors } from "@/features/listings/components";
import { homieRadii, homieSpacing } from "@/theme/homie";
import { homieFontFamily, homieType } from "@/theme/typography";

const CREATE_CONTENT = {
  agent: {
    title: "Agent",
    description: "Start an agent setup flow with its own role, behavior, and workflow.",
    symbol: "sparkles",
  },
  listing: {
    title: "Listing",
    description: "Open the listing flow and start filling in the details for a new property.",
    symbol: "doc.text",
  },
} as const;

export default function CreateSheet() {
  const { kind } = useLocalSearchParams<{ kind?: "agent" | "listing" }>();
  const content = CREATE_CONTENT[kind ?? "agent"] ?? CREATE_CONTENT.agent;
  const colors = useListingColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "transparent" }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: homieSpacing.page,
        paddingTop: 12,
        paddingBottom: 24,
      }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: homieRadii.sheet,
          borderCurve: "continuous",
          padding: 20,
          gap: 18,
          borderWidth: 0,
        }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.cardSecondary,
          }}>
          <Image
            source={`sf:${content.symbol}`}
            style={{
              width: 22,
              height: 22,
              tintColor: colors.accent,
            }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text
            selectable
            style={{
              fontFamily: homieFontFamily.headlineExtraBold,
              fontSize: 28,
              lineHeight: 34,
              color: colors.title,
            }}>
            {content.title}
          </Text>
          <Text selectable style={[homieType.body, { fontSize: 16, color: colors.body }]}>{content.description}</Text>
        </View>

        <Pressable
          onPress={() => {
            if (kind === "listing") {
              router.replace("/listings/new" as never);
              return;
            }

            router.back();
          }}
          style={({ pressed }) => ({
            alignItems: "center",
            justifyContent: "center",
            minHeight: 52,
            borderRadius: homieRadii.control,
            borderCurve: "continuous",
            backgroundColor: pressed ? colors.accentPressed : colors.accent,
          })}>
          <Text style={[homieType.body, { fontSize: 16, fontFamily: homieFontFamily.bodySemiBold, color: colors.onAccent }]}>
            {kind === "listing" ? "Start listing" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
