import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { useColorScheme } from "react-native";

import { ConvexAppProvider } from "@/providers/convex-app-provider";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ConvexAppProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listings" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-sheet"
            options={{
              title: "Create",
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.34],
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </Stack>
      </ThemeProvider>
    </ConvexAppProvider>
  );
}
