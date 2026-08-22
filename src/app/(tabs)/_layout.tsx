import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router, Tabs } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountBadge } from "@/components/chip";
import { TAB_BAR_CONTENT_HEIGHT } from "@/components/screen";
import { Text } from "@/components/text";
import { OPEN_APPLICATION_COUNT } from "@/features/applicants/data";
import { CreateSheet } from "@/features/create/create-sheet";
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
      <Tabs.Screen name="applications" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{ href: null }} />
    </Tabs>
  );
}

function NaboTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [createVisible, setCreateVisible] = React.useState(false);

  const unreadCount = THREADS.filter((thread) => session.isThreadUnread(thread.id)).length;
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 14);

  const badgeFor = (name: string) => {
    if (name === "applicants") {
      return OPEN_APPLICATION_COUNT;
    }

    return name === "matches" ? unreadCount : 0;
  };

  const openRoute = (path: "/new-listing" | "/search-agent") => {
    setCreateVisible(false);
    router.push(path);
  };

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          paddingTop: 9,
          paddingHorizontal: 14,
          paddingBottom: Math.max(insets.bottom, 14),
          minHeight: tabBarHeight,
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}>
      {[TABS[0], TABS[1], null, TABS[2], TABS[3]].map((tab) => {
        if (!tab) {
          return <View key="create-slot" style={{ flex: 1 }} />;
        }

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

        {!createVisible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create"
            onPress={() => setCreateVisible(true)}
            style={({ pressed }) => ({
              position: "absolute",
              left: "50%",
              bottom: Math.max(insets.bottom, 14) + 2,
              width: 58,
              height: 58,
              marginLeft: -29,
              zIndex: 2,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              borderWidth: 4,
              borderColor: theme.background,
              backgroundColor: pressed ? theme.accentPressed : theme.accent,
              boxShadow: "0 8px 22px rgba(194,73,46,.34)",
            })}>
            <Text style={{ marginTop: -2, fontSize: 27, lineHeight: 30, fontWeight: "400", color: theme.onAccent }}>+</Text>
          </Pressable>
        ) : null}

        {session.toast ? (
          <View
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: tabBarHeight + 42,
              zIndex: 3,
              flexDirection: "row",
              alignItems: "center",
              gap: 11,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 18,
              borderCurve: "continuous",
              backgroundColor: theme.inverse,
              boxShadow: "0 10px 30px rgba(22,32,43,.28)",
            }}>
            <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: theme.accent }} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600", color: theme.onInverse }}>
              {session.toast}
            </Text>
          </View>
        ) : null}
      </View>

      <CreateSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onNewListing={() => openRoute("/new-listing")}
        onNewAgent={() => openRoute("/search-agent")}
      />
    </>
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
