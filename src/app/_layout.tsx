import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { useColorScheme } from "react-native";

import { ConvexAppProvider } from "@/providers/convex-app-provider";
import { getHomieColors } from "@/theme/homie";

function homieNavigationTheme(colorScheme: "light" | "dark") {
  const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const h = getHomieColors(colorScheme);

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: h.accent,
      background: h.background,
      card: h.card,
      text: h.title,
      border: h.border,
      notification: h.accent,
    },
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navTheme = homieNavigationTheme((colorScheme ?? "light") === "dark" ? "dark" : "light");

  return (
    <ConvexAppProvider>
      <ThemeProvider value={navTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listings" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-sheet"
            options={{
              title: "Create",
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.44],
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </Stack>
      </ThemeProvider>
    </ConvexAppProvider>
  );
}
