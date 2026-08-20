import React from "react";
import { View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { PillButton } from "@/components/button";
import { SelectableText } from "@/components/text";
import {
  MAP_PIN_LIMIT,
  MAP_REGION_DEBOUNCE_MS,
  type NativeMapProps,
  type PublicMapViewport,
} from "@/features/rooms/native-map.types";
import { radius, shadow, useTheme } from "@/theme/tokens";

function isValidRegion(region: Region): region is PublicMapViewport {
  return (
    Number.isFinite(region.latitude) &&
    region.latitude >= -90 &&
    region.latitude <= 90 &&
    Number.isFinite(region.longitude) &&
    region.longitude >= -180 &&
    region.longitude <= 180 &&
    Number.isFinite(region.latitudeDelta) &&
    region.latitudeDelta > 0 &&
    Number.isFinite(region.longitudeDelta) &&
    region.longitudeDelta > 0
  );
}

export function NativeMap({
  pins,
  initialRegion,
  selectedListingId,
  pinLimitExceeded,
  onRegionChangeComplete,
  onSelectListing,
  onShowList,
  style,
}: NativeMapProps) {
  const theme = useTheme();
  const regionCallback = React.useRef(onRegionChangeComplete);
  const regionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    regionCallback.current = onRegionChangeComplete;
  }, [onRegionChangeComplete]);

  React.useEffect(
    () => () => {
      if (regionTimer.current) {
        clearTimeout(regionTimer.current);
      }
    },
    [],
  );

  const handleRegionChangeComplete = React.useCallback((region: Region) => {
    if (!isValidRegion(region)) {
      return;
    }
    if (regionTimer.current) {
      clearTimeout(regionTimer.current);
    }
    regionTimer.current = setTimeout(() => {
      regionCallback.current(region);
    }, MAP_REGION_DEBOUNCE_MS);
  }, []);

  const visiblePins = pins.slice(0, MAP_PIN_LIMIT);
  const showPinLimit = pinLimitExceeded || pins.length > MAP_PIN_LIMIT;

  return (
    <View style={[{ flex: 1, minHeight: 320, overflow: "hidden" }, style]}>
      <MapView
        accessibilityLabel="Map of approximate home locations"
        initialRegion={initialRegion}
        loadingEnabled
        onRegionChangeComplete={handleRegionChangeComplete}
        rotateEnabled={false}
        style={{ flex: 1 }}>
        {visiblePins.map((pin) => {
          const selected = pin.id === selectedListingId;

          return (
            <Marker
              key={pin.id}
              accessibilityLabel={pin.title}
              accessibilityState={{ selected }}
              coordinate={pin.publicCoordinate}
              description={pin.description}
              identifier={pin.id}
              onPress={() => onSelectListing(pin.id)}
              pinColor={selected ? theme.accent : theme.badge}
              title={pin.title}
            />
          );
        })}
      </MapView>

      <View style={{ position: "absolute", top: 16, right: 16 }}>
        <PillButton label="List" onPress={onShowList} />
      </View>

      {showPinLimit ? (
        <View
          accessibilityLiveRegion="polite"
          role="status"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            maxWidth: 520,
            alignSelf: "center",
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: radius.button,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: theme.borderStrong,
            backgroundColor: theme.card,
            ...shadow.floating,
          }}>
          <SelectableText style={{ color: theme.ink, fontSize: 15, fontWeight: "700", textAlign: "center" }}>
            Zoom in to see homes
          </SelectableText>
        </View>
      ) : null}
    </View>
  );
}

export type {
  NativeMapProps,
  PublicListingMapPin,
  PublicMapCoordinate,
  PublicMapViewport,
} from "@/features/rooms/native-map.types";
