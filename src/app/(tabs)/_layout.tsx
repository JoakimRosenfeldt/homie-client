import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountBadge } from "@/components/chip";
import { TAB_BAR_CONTENT_HEIGHT } from "@/components/screen";
import { Text } from "@/components/text";
import { OPEN_APPLICATION_COUNT } from "@/features/applicants/data";
import { THREADS } from "@/features/matches/data";
import { useSession } from "@/features/nabo/store";
import { useTheme } from "@/theme/tokens";

type IconShape = "square" | "diamond" | "circle" | "block";

/**
 * The two halves of the app sit side by side in one bar so the swipe mode never
 * reads as the whole product. Order and labels come straight from the design.
 */
const TABS: { name: string; label: string; shape: IconShape }[] = [
  { name: "index", label: "Explore", shape: "square" },
  { name: "applicants", label: "Applicants", shape: "diamond" },
  { name: "matches", label: "Matches", shape: "circle" },
  { name: "you", label: "You", shape: "block" },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NaboTabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

function NaboTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();

  const unreadCount = THREADS.filter((thread) => session.isThreadUnread(thread.id)).length;

  const badgeFor = (name: string) => {
    if (name === "applicants") {
      return OPEN_APPLICATION_COUNT;
    }

    return name === "matches" ? unreadCount : 0;
  };

  return (
    <View
      style={{
        flexDirection: "row",
        paddingTop: 9,
        paddingHorizontal: 14,
        paddingBottom: Math.max(insets.bottom, 14),
        minHeight: TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 14),
        backgroundColor: theme.tabBar,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}>
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
        const focused = state.index === routeIndex;

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const route = state.routes[routeIndex];
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              gap: 5,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View>
              <TabIcon shape={tab.shape} color={focused ? theme.accent : theme.tabInactive} />
              <CountBadge count={badgeFor(tab.name)} style={{ top: -6, right: -14 }} />
            </View>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: focused ? "700" : "500",
                color: focused ? theme.accent : theme.tabInactive,
              }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({ shape, color }: { shape: IconShape; color: string }) {
  const base = { width: 18, height: 18 } as const;

  if (shape === "block") {
    return <View style={{ ...base, borderRadius: 3, backgroundColor: color }} />;
  }

  return (
    <View
      style={{
        ...base,
        borderWidth: 2,
        borderColor: color,
        borderRadius: shape === "circle" ? 9 : 4,
        transform: shape === "diamond" ? [{ rotate: "45deg" }] : undefined,
      }}
    />
  );
}
