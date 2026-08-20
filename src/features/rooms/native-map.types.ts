import type { StyleProp, ViewStyle } from "react-native";

export const MAP_PIN_LIMIT = 100;
export const MAP_REGION_DEBOUNCE_MS = 350;

export type PublicMapCoordinate = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type PublicMapViewport = PublicMapCoordinate &
  Readonly<{
    latitudeDelta: number;
    longitudeDelta: number;
  }>;

export type PublicListingMapPin = Readonly<{
  id: string;
  publicCoordinate: PublicMapCoordinate;
  title: string;
  description?: string;
}>;

export type NativeMapProps = {
  pins: readonly PublicListingMapPin[];
  initialRegion: PublicMapViewport;
  selectedListingId?: string;
  pinLimitExceeded: boolean;
  onRegionChangeComplete: (region: PublicMapViewport) => void;
  onSelectListing: (listingId: string) => void;
  onShowList: () => void;
  style?: StyleProp<ViewStyle>;
};
