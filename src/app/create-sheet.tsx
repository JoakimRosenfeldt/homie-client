import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, useColorScheme, View } from "react-native";

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
  const isDark = useColorScheme() === "dark";
  const { kind } = useLocalSearchParams<{ kind?: "agent" | "listing" }>();
  const content = CREATE_CONTENT[kind ?? "agent"] ?? CREATE_CONTENT.agent;

  const colors = {
    background: isDark ? "#1C1C1E" : "#FFFFFF",
    secondaryBackground: isDark ? "#2C2C2E" : "#F2F2F7",
    title: isDark ? "#FFFFFF" : "#111111",
    body: isDark ? "#A1A1A6" : "#6D6D72",
    border: isDark ? "#3A3A3C" : "#E5E5EA",
    accent: isDark ? "#0A84FF" : "#007AFF",
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "transparent" }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
      }}>
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: 28,
          borderCurve: "continuous",
          padding: 20,
          gap: 18,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.secondaryBackground,
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
              fontSize: 28,
              lineHeight: 32,
              fontWeight: "700",
              color: colors.title,
            }}>
            {content.title}
          </Text>
          <Text
            selectable
            style={{
              fontSize: 16,
              lineHeight: 22,
              color: colors.body,
            }}>
            {content.description}
          </Text>
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
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: pressed ? "#3395FF" : colors.accent,
          })}>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 20,
              fontWeight: "600",
              color: "#FFFFFF",
            }}>
            {kind === "listing" ? "Start listing" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
