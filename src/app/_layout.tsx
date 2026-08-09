import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SessionProvider } from "@/features/nabo/store";
import { useNaboFonts } from "@/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden during fast refresh — not worth surfacing.
});

export default function RootLayout() {
  const fontsReady = useNaboFonts();

  React.useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, userSelect: "none" }}>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="rooms/[roomId]" />
          <Stack.Screen name="chat/[threadId]" />
          <Stack.Screen name="onboarding" />
        </Stack>
        <StatusBar style="auto" />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
