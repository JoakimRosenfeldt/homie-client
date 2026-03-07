import { Image } from "expo-image";
import { router } from "expo-router";
import { ScrollView, Pressable, Text, useColorScheme, View } from "react-native";

export default function CreateSheet() {
  const isDark = useColorScheme() === "dark";

  const colors = {
    background: isDark ? "#1C1C1E" : "#FFFFFF",
    secondaryBackground: isDark ? "#2C2C2E" : "#F2F2F7",
    title: isDark ? "#FFFFFF" : "#111111",
    body: isDark ? "#A1A1A6" : "#6D6D72",
    border: isDark ? "#3A3A3C" : "#E5E5EA",
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
        gap: 12,
      }}>
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: 28,
          borderCurve: "continuous",
          padding: 20,
          gap: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <Text
          selectable
          style={{
            fontSize: 17,
            lineHeight: 24,
            color: colors.body,
          }}>
          Choose what you want to create.
        </Text>

        <CreateOption
          title="Agent"
          description="Create a new assistant with its own role, behavior, and workflow."
          symbol="sparkles"
          colors={colors}
        />

        <CreateOption
          title="Listing"
          description="Start a new listing with details you can review, save, and publish later."
          symbol="doc.text"
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

function CreateOption({
  title,
  description,
  symbol,
  colors,
}: {
  title: string;
  description: string;
  symbol: string;
  colors: {
    background: string;
    secondaryBackground: string;
    title: string;
    body: string;
    border: string;
  };
}) {
  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 22,
        borderCurve: "continuous",
        backgroundColor: colors.secondaryBackground,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.82 : 1,
      })}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}>
        <Image
          source={`sf:${symbol}`}
          style={{
            width: 18,
            height: 18,
            tintColor: colors.title,
          }}
        />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          selectable
          style={{
            fontSize: 17,
            lineHeight: 22,
            fontWeight: "600",
            color: colors.title,
          }}>
          {title}
        </Text>
        <Text
          selectable
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: colors.body,
          }}>
          {description}
        </Text>
      </View>

      <Image
        source="sf:chevron.right"
        style={{
          width: 12,
          height: 12,
          tintColor: colors.body,
        }}
      />
    </Pressable>
  );
}
