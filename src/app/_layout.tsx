import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="create-sheet"
          options={{
            title: "Create",
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.36],
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
