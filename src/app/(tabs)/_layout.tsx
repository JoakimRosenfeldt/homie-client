import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { router, Tabs, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListingColors } from "@/features/listings/components";
import { homieAmbientShadow, homieRadii } from "@/theme/homie";

const TAB_META = {
  "(explore)": {
    label: "Explore",
    icon: { default: "safari", selected: "safari.fill" },
  },
  "(saved)": {
    label: "Saved",
    icon: { default: "bookmark", selected: "bookmark.fill" },
  },
  "(inbox)": {
    label: "Inbox",
    icon: { default: "tray", selected: "tray.fill" },
  },
  "(profile)": {
    label: "Profile",
    icon: { default: "person", selected: "person.fill" },
  },
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="(explore)" />
      <Tabs.Screen name="(saved)" />
      <Tabs.Screen name="(inbox)" />
      <Tabs.Screen name="(profile)" />
    </Tabs>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const theme = useListingColors();

  useEffect(() => {
    setIsCreateMenuOpen(false);
  }, [pathname]);

  const colors = {
    accent: theme.accent,
    accentPressed: theme.accentPressed,
    surface: theme.card,
    surfacePressed: theme.cardSecondary,
    bar: theme.tabBar,
    border: theme.tabBarBorder,
    label: theme.title,
    labelMuted: theme.body,
  };

  const bottomInset = Math.max(insets.bottom, 8);
  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);
  const createRotation = useSharedValue(0);

  useEffect(() => {
    createRotation.value = withTiming(isCreateMenuOpen ? 45 : 0, { duration: 180 });
  }, [createRotation, isCreateMenuOpen]);

  const createIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${createRotation.value}deg` }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: 12,
        paddingBottom: bottomInset,
        backgroundColor: "transparent",
      }}>
      {isCreateMenuOpen ? (
        <Pressable
          accessibilityLabel="Close create options"
          onPress={() => setIsCreateMenuOpen(false)}
          style={{
            position: "absolute",
            left: -12,
            right: -12,
            top: -800,
            bottom: 0,
          }}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}>
        {isCreateMenuOpen ? (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(140)}
            layout={LinearTransition.duration(180)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}>
            <CreateOptionButton
              label="Agent"
              symbol="sparkles"
              colors={{ ...colors, accentSoft: theme.accentSoft }}
              onPress={() => {
                setIsCreateMenuOpen(false);
                router.push({
                  pathname: "/create-sheet",
                  params: { kind: "agent" },
                });
              }}
            />
            <CreateOptionButton
              label="Listing"
              symbol="doc.text"
              colors={{ ...colors, accentSoft: theme.accentSoft }}
              onPress={() => {
                setIsCreateMenuOpen(false);
                router.push("/listings/new" as never);
              }}
            />
          </Animated.View>
        ) : null}

        <View
          style={{
            width: "100%",
            minHeight: 72,
            paddingTop: 12,
            paddingBottom: 10,
            paddingHorizontal: 8,
            borderRadius: 30,
            borderCurve: "continuous",
            backgroundColor: colors.bar,
            borderWidth: 1,
            borderColor: colors.border,
            boxShadow: isDark ? homieAmbientShadow.dark : homieAmbientShadow.light,
          }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              width: "100%",
            }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "stretch",
              }}>
              {leftRoutes.map((route) => (
                <TabBarItem
                  key={route.key}
                  routeKey={route.key}
                  routeName={route.name}
                  isFocused={state.index === state.routes.findIndex((item) => item.key === route.key)}
                  descriptorLabel={descriptors[route.key]?.options.title}
                  colors={colors}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });

                    if (
                      state.index !== state.routes.findIndex((item) => item.key === route.key) &&
                      !event.defaultPrevented
                    ) {
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  onLongPress={() => {
                    navigation.emit({
                      type: "tabLongPress",
                      target: route.key,
                    });
                  }}
                />
              ))}
            </View>

            <View
              style={{
                width: 96,
                alignItems: "center",
                justifyContent: "flex-end",
                minHeight: 48,
                paddingBottom: 7,
              }}>
              <Pressable
                accessibilityLabel={isCreateMenuOpen ? "Close create options" : "Open create options"}
                accessibilityRole="button"
                onPress={() => setIsCreateMenuOpen((current) => !current)}
                style={({ pressed }) => ({
                  position: "absolute",
                  top: -40,
                  width: 58,
                  height: 58,
                  borderRadius: 999,
                  borderCurve: "continuous",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? colors.accentPressed : colors.accent,
                  borderWidth: 4,
                  borderColor: colors.bar,
                  boxShadow: pressed
                    ? "0 10px 24px rgba(181, 35, 48, 0.35)"
                    : "0 12px 28px rgba(181, 35, 48, 0.4)",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}>
                <Animated.View style={createIconStyle}>
                  <Image
                    source="sf:plus"
                    style={{
                      width: 22,
                      height: 22,
                      tintColor: theme.onAccent,
                    }}
                  />
                </Animated.View>
              </Pressable>

              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 14,
                  fontWeight: "600",
                  color: isCreateMenuOpen ? colors.accent : colors.labelMuted,
                }}>
                Create
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "stretch",
              }}>
              {rightRoutes.map((route) => (
                <TabBarItem
                  key={route.key}
                  routeKey={route.key}
                  routeName={route.name}
                  isFocused={state.index === state.routes.findIndex((item) => item.key === route.key)}
                  descriptorLabel={descriptors[route.key]?.options.title}
                  colors={colors}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });

                    if (
                      state.index !== state.routes.findIndex((item) => item.key === route.key) &&
                      !event.defaultPrevented
                    ) {
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  onLongPress={() => {
                    navigation.emit({
                      type: "tabLongPress",
                      target: route.key,
                    });
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function TabBarItem({
  routeKey,
  routeName,
  isFocused,
  descriptorLabel,
  colors,
  onPress,
  onLongPress,
}: {
  routeKey: string;
  routeName: string;
  isFocused: boolean;
  descriptorLabel?: string;
  colors: {
    accent: string;
    surface: string;
    border: string;
    label: string;
    labelMuted: string;
  };
  onPress: () => void;
  onLongPress: () => void;
}) {
  const meta = TAB_META[routeName as keyof typeof TAB_META];
  const label = descriptorLabel ?? meta.label;
  const symbol = isFocused ? meta.icon.selected : meta.icon.default;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      key={routeKey}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        minHeight: 48,
        borderRadius: 18,
        borderCurve: "continuous",
        opacity: pressed ? 0.82 : 1,
      })}>
      <Image
        source={`sf:${symbol}`}
        style={{
          width: 19,
          height: 19,
          tintColor: isFocused ? colors.accent : colors.labelMuted,
        }}
      />

      <Text
        style={{
          fontSize: 11,
          lineHeight: 14,
          fontWeight: isFocused ? "700" : "600",
          color: isFocused ? colors.label : colors.labelMuted,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

function CreateOptionButton({
  label,
  symbol,
  colors,
  onPress,
}: {
  label: string;
  symbol: string;
  colors: {
    accent: string;
    accentSoft: string;
    surface: string;
    surfacePressed: string;
    label: string;
  };
  onPress: () => void;
}) {
  const isDarkScheme = useColorScheme() === "dark";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: homieRadii.full,
        borderCurve: "continuous",
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        borderWidth: 0,
        boxShadow: isDarkScheme ? homieAmbientShadow.dark : homieAmbientShadow.light,
      })}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accentSoft,
        }}>
        <Image
          source={`sf:${symbol}`}
          style={{
            width: 14,
            height: 14,
            tintColor: colors.accent,
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 15,
          lineHeight: 18,
          fontWeight: "600",
          color: colors.label,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
