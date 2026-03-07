import { Image } from "expo-image";
import { Link } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Pressable, Text, useColorScheme, View } from "react-native";

export default function TabsLayout() {
  const isDark = useColorScheme() === "dark";

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={isDark ? "#0A84FF" : "#007AFF"}>
      <NativeTabs.BottomAccessory>
        <CreateButton />
      </NativeTabs.BottomAccessory>

      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "safari", selected: "safari.fill" }}
          md="explore"
        />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(saved)" role="bookmarks">
        <NativeTabs.Trigger.Icon
          sf={{ default: "bookmark", selected: "bookmark.fill" }}
          md="bookmark"
        />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(inbox)">
        <NativeTabs.Trigger.Icon sf={{ default: "tray", selected: "tray.fill" }} md="inbox" />
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function CreateButton() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const isDark = useColorScheme() === "dark";
  const isInline = placement === "inline";
  const size = isInline ? 54 : 62;

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: "center",
        marginTop: isInline ? -14 : -22,
      }}>
      <Link href="/create-sheet" asChild>
        <Pressable
          accessibilityLabel="Open create options"
          style={({ pressed }) => ({
            width: size,
            height: size,
            borderRadius: 999,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#0A84FF" : "#007AFF",
            boxShadow: pressed
              ? "0 8px 18px rgba(0, 122, 255, 0.22)"
              : "0 12px 28px rgba(0, 122, 255, 0.28)",
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}>
          <Image
            source="sf:plus"
            style={{
              width: 22,
              height: 22,
              tintColor: "#FFFFFF",
            }}
          />
        </Pressable>
      </Link>
      {!isInline ? (
        <Text
          selectable
          style={{
            fontSize: 11,
            lineHeight: 14,
            fontWeight: "600",
            color: isDark ? "#8E8E93" : "#6D6D72",
            paddingTop: 4,
          }}>
          Create
        </Text>
      ) : null}
    </View>
  );
}
