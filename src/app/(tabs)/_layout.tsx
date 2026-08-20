import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountBadge } from "@/components/chip";
import { useCompositeItemKeyboard, useFocusRing } from "@/components/interaction";
import { TAB_BAR_CONTENT_HEIGHT } from "@/components/screen";
import { Text } from "@/components/text";
import { useProductFlow } from "@/features/applications/store";
import { useI18n, type TranslationKey } from "@/i18n";
import { useTheme } from "@/theme/tokens";

type IconShape = "square" | "diamond" | "circle" | "block";

const TABS: { name: string; labelKey: TranslationKey; shape: IconShape }[] = [
  { name: "index", labelKey: "tabs.explore", shape: "square" },
  { name: "applications", labelKey: "tabs.applications", shape: "diamond" },
  { name: "inbox", labelKey: "tabs.inbox", shape: "circle" },
  { name: "you", labelKey: "tabs.you", shape: "block" },
];

export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NaboTabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.labelKey) }} />
      ))}
    </Tabs>
  );
}

function NaboTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const flow = useProductFlow();
  const { t } = useI18n();
  const tabListId = React.useId();

  const unreadCount = flow.conversations.filter(
    (conversation) => conversation.unread && conversation.blockState === "none",
  ).length;
  const activeApplicationCount = flow.applications.filter(
    (application) => application.status === "pending" || application.status === "shortlisted",
  ).length;
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 14);

  const badgeFor = (name: string) => {
    if (name === "applications") {
      return activeApplicationCount;
    }

    return name === "inbox" ? unreadCount : 0;
  };

  const openTab = (name: string) => {
    const routeIndex = state.routes.findIndex((route) => route.name === name);
    const route = state.routes[routeIndex];
    if (!route) return;
    const focused = state.index === routeIndex;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });

    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View
      accessibilityRole="tablist"
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
      {TABS.map((tab, index) => {
        const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
        const focused = state.index === routeIndex;
        const previousTab = TABS[(index - 1 + TABS.length) % TABS.length];
        const nextTab = TABS[(index + 1) % TABS.length];

        return (
          <TabButton
            key={tab.name}
            id={`${tabListId}-${tab.name}`}
            badge={badgeFor(tab.name)}
            focused={focused}
            label={t(tab.labelKey)}
            shape={tab.shape}
            onPress={() => openTab(tab.name)}
            previous={{
              id: `${tabListId}-${previousTab.name}`,
              onPress: () => openTab(previousTab.name),
            }}
            next={{
              id: `${tabListId}-${nextTab.name}`,
              onPress: () => openTab(nextTab.name),
            }}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  id,
  badge,
  focused,
  label,
  shape,
  onPress,
  previous,
  next,
}: {
  id: string;
  badge: number;
  focused: boolean;
  label: string;
  shape: IconShape;
  onPress: () => void;
  previous: { id: string; onPress: () => void };
  next: { id: string; onPress: () => void };
}) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const keyboard = useCompositeItemKeyboard({ id, selected: focused, onPress, previous, next });

  return (
    <Pressable
      {...keyboard}
      aria-selected={focused}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          opacity: pressed ? 0.7 : 1,
        },
        focus.focusStyle,
      ]}>
      <View>
        <TabIcon shape={shape} color={focused ? theme.accent : theme.tabInactive} />
        <CountBadge count={badge} style={{ top: -6, right: -14 }} />
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10.5,
          fontWeight: focused ? "700" : "500",
          color: focused ? theme.accent : theme.tabInactive,
        }}>
        {label}
      </Text>
    </Pressable>
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
