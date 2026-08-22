import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ProductFlowProvider } from "@/features/applications/store";
import { HomieBackendProvider } from "@/features/backend/convex-provider";
import { SessionProvider } from "@/features/nabo/store";
import { I18nProvider } from "@/i18n";
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
      <I18nProvider>
        <HomieBackendProvider>
          <SessionProvider>
            <ProductFlowProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="rooms/[roomId]" />
                <Stack.Screen name="chat/[threadId]" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="search-agent" />
                <Stack.Screen name="apply/[roomId]" />
                <Stack.Screen name="applications/[applicationId]" />
                <Stack.Screen name="inbox/[threadId]" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="host/index" />
                <Stack.Screen name="host/applications" />
                <Stack.Screen name="host/applicants/[applicantId]" />
                <Stack.Screen name="report" />
                <Stack.Screen name="delete-data" />
                <Stack.Screen name="new-listing" />
              </Stack>
              <StatusBar style="dark" />
            </ProductFlowProvider>
          </SessionProvider>
        </HomieBackendProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}
