import { Link } from "expo-router";
import { ScrollView, Text, useColorScheme, View } from "react-native";

export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";

  const colors = {
    background: isDark ? "#000000" : "#F2F2F7",
    card: isDark ? "#1C1C1E" : "#FFFFFF",
    title: isDark ? "#FFFFFF" : "#111111",
    body: isDark ? "#A1A1A6" : "#6D6D72",
    border: isDark ? "#2C2C2E" : "#E5E5EA",
    accent: isDark ? "#0A84FF" : "#007AFF",
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
        gap: 16,
      }}>
      <Text
        selectable
        style={{
          fontSize: 17,
          lineHeight: 24,
          color: colors.body,
        }}>
        Draft recovery for listings is device-based in this proof of concept. Your listings stay linked to this device until
        signed-in ownership is added.
      </Text>

      <Link href={"/(tabs)/(profile)/listings" as never} asChild>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            borderCurve: "continuous",
            padding: 20,
            gap: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Text
            selectable
            style={{
              fontSize: 22,
              lineHeight: 26,
              fontWeight: "700",
              color: colors.title,
            }}>
            My Listings
          </Text>
          <Text
            selectable
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: colors.body,
            }}>
            Resume a draft, check what is ready to publish, or open a published rental listing.
          </Text>
          <Text
            selectable
            style={{
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "700",
              color: colors.accent,
            }}>
            Open listings
          </Text>
        </View>
      </Link>
    </ScrollView>
  );
}
