import { ConvexProvider, ConvexReactClient, useConvexConnectionState } from "convex/react";
import React from "react";
import { View } from "react-native";

import { SystemState } from "@/components/system-state";
import { readableBackendError } from "@/features/backend/errors";
import { DeviceIdentityProvider } from "@/features/device/device-identity";
import { useTheme } from "@/theme/tokens";

type BackendBoundaryProps = React.PropsWithChildren;
type BackendBoundaryState = { error: Error | null };

class BackendBoundary extends React.Component<BackendBoundaryProps, BackendBoundaryState> {
  state: BackendBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BackendBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <BackendStateFrame>
          <SystemState
            kind="error"
            title="Backend request failed"
            message={readableBackendError(this.state.error)}
            action={{ label: "Try again", onPress: () => this.setState({ error: null }) }}
          />
        </BackendStateFrame>
      );
    }

    return this.props.children;
  }
}

function BackendStateFrame({ children }: React.PropsWithChildren) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: theme.background,
      }}>
      {children}
    </View>
  );
}

function createClient(url: string | undefined) {
  if (!url?.trim()) {
    return { kind: "missing" } as const;
  }

  try {
    return { kind: "ready", client: new ConvexReactClient(url.trim()) } as const;
  } catch (error) {
    return { kind: "invalid", message: readableBackendError(error) } as const;
  }
}

export function HomieBackendProvider({ children }: React.PropsWithChildren) {
  const backend = React.useMemo(() => createClient(process.env.EXPO_PUBLIC_CONVEX_URL), []);

  React.useEffect(() => {
    if (backend.kind !== "ready") return;
    return () => {
      void backend.client.close();
    };
  }, [backend]);

  if (backend.kind === "missing") {
    return (
      <BackendStateFrame>
        <SystemState
          kind="error"
          title="Backend not configured"
          message="Set EXPO_PUBLIC_CONVEX_URL to the Convex deployment URL, then restart Expo. No live data can load without it."
        />
      </BackendStateFrame>
    );
  }

  if (backend.kind === "invalid") {
    return (
      <BackendStateFrame>
        <SystemState
          kind="error"
          title="Backend URL is invalid"
          message={backend.message}
        />
      </BackendStateFrame>
    );
  }

  return (
    <ConvexProvider client={backend.client}>
      <DeviceIdentityProvider>
        <BackendBoundary>{children}</BackendBoundary>
      </DeviceIdentityProvider>
    </ConvexProvider>
  );
}

export type BackendConnectionKind = "connecting" | "online" | "offline";

export function useBackendConnection(): BackendConnectionKind {
  const state = useConvexConnectionState();
  const [connectionTimedOut, setConnectionTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (state.isWebSocketConnected) {
      setConnectionTimedOut(false);
      return;
    }

    const timer = setTimeout(() => setConnectionTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [state.isWebSocketConnected]);

  if (state.isWebSocketConnected) return "online";
  if (state.hasEverConnected || connectionTimedOut) return "offline";
  return "connecting";
}
