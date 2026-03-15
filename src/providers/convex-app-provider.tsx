import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

const ConvexConfigContext = React.createContext({
  isConfigured: Boolean(convexClient),
  convexUrl,
});

export function ConvexAppProvider({ children }: React.PropsWithChildren) {
  const value = {
    isConfigured: Boolean(convexClient),
    convexUrl,
  };

  if (!convexClient) {
    return <ConvexConfigContext value={value}>{children}</ConvexConfigContext>;
  }

  return (
    <ConvexConfigContext value={value}>
      <ConvexProvider client={convexClient}>{children}</ConvexProvider>
    </ConvexConfigContext>
  );
}

export function useConvexConfiguration() {
  return React.use(ConvexConfigContext);
}
