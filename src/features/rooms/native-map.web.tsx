import { View } from "react-native";

import { SystemState } from "@/components/system-state";
import type { NativeMapProps } from "@/features/rooms/native-map.types";

export function NativeMap({ onShowList, style }: NativeMapProps) {
  return (
    <View style={[{ flex: 1, minHeight: 320, justifyContent: "center", padding: 20 }, style]}>
      <SystemState
        action={{ label: "Show homes", onPress: onShowList }}
        kind="empty"
        message="Use the list to browse homes in the web demo."
        title="Map view is available in the iOS and Android apps"
      />
    </View>
  );
}

export type {
  NativeMapProps,
  PublicListingMapPin,
  PublicMapCoordinate,
  PublicMapViewport,
} from "@/features/rooms/native-map.types";
