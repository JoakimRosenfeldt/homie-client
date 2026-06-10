import { Tabs } from "expo-router";
import { Text, useColorScheme } from "react-native";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
        opacity: focused ? 1 : 0.45,
      }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const isDark = useColorScheme() === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#0A84FF" : "#007AFF",
        tabBarInactiveTintColor: isDark ? "#8E8E93" : "#8E8E93",
        tabBarStyle: {
          backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
          borderTopColor: isDark ? "#2C2C2E" : "#E5E5EA",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
