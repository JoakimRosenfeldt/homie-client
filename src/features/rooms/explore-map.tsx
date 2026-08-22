import { Image } from "expo-image";
import React from "react";
import {
  Animated,
  Linking,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CircleButton, PillButton } from "@/components/button";
import { Photo } from "@/components/photo";
import { useTabBarHeight } from "@/components/screen";
import { Text } from "@/components/text";
import { formatKr, formatThousands, type Room } from "@/features/rooms/data";
import { SearchField } from "@/features/rooms/search-field";
import { radius, shadow, useTheme } from "@/theme/tokens";

const TILE_SIZE = 256;
const MIN_ZOOM = 12;
const MAX_ZOOM = 17;
const DEFAULT_CENTER = { latitude: 56.1629, longitude: 10.2039 };

type Coordinate = typeof DEFAULT_CENTER;
type Size = { width: number; height: number };

export function ExploreMap({
  rooms,
  searchSummary,
  onOpenFilters,
  onShowList,
  onOpenRoom,
}: {
  rooms: Room[];
  searchSummary: string;
  onOpenFilters: () => void;
  onShowList: () => void;
  onOpenRoom: (roomId: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [layout, setLayout] = React.useState<Size>({ width: 0, height: 0 });
  const [center, setCenter] = React.useState<Coordinate>(() => centerOfRooms(rooms));
  const [zoom, setZoom] = React.useState(14);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | undefined>(rooms[0]?.id);
  const drag = React.useRef(new Animated.ValueXY()).current;
  const centerRef = React.useRef(center);
  const zoomRef = React.useRef(zoom);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0];

  React.useEffect(() => {
    centerRef.current = center;
  }, [center]);

  React.useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  React.useEffect(() => {
    if (selectedRoomId && !rooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0]?.id);
    }
  }, [rooms, selectedRoomId]);

  React.useEffect(() => {
    if (layout.width === 0 || layout.height === 0) return;
    setCenter(centerOfRooms(rooms));
    setZoom(fitZoomForRooms(rooms, layout));
  }, [layout, rooms]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_, gesture) => drag.setValue({ x: gesture.dx, y: gesture.dy }),
        onPanResponderRelease: (_, gesture) => {
          const currentZoom = zoomRef.current;
          const world = coordinateToWorld(centerRef.current, currentZoom);
          setCenter(worldToCoordinate(world.x - gesture.dx, world.y - gesture.dy, currentZoom));
          drag.setValue({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => drag.setValue({ x: 0, y: 0 }),
      }),
    [drag],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout;
    setLayout((current) =>
      Math.round(current.width) === Math.round(next.width) && Math.round(current.height) === Math.round(next.height)
        ? current
        : { width: next.width, height: next.height },
    );
  };

  const recenter = () => {
    setCenter(centerOfRooms(rooms));
    setZoom(fitZoomForRooms(rooms, layout));
  };

  return (
    <View
      onLayout={handleLayout}
      style={{ flex: 1, backgroundColor: theme.mapGround, overflow: "hidden" }}
      {...panResponder.panHandlers}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: drag.x }, { translateY: drag.y }] },
        ]}>
        <MapTiles center={center} layout={layout} zoom={zoom} />
        {rooms.map((room) => (
          <MapPin
            key={room.id}
            room={room}
            center={center}
            layout={layout}
            zoom={zoom}
            selected={room.id === selectedRoom?.id}
            onPress={() => setSelectedRoomId(room.id)}
          />
        ))}
      </Animated.View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          flexDirection: "row",
          gap: 9,
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: 12,
          backgroundColor: theme.background,
        }}>
        <SearchField summary={searchSummary} onPress={onOpenFilters} showIcon={false} />
        <PillButton label="List" tone="accent" onPress={onShowList} />
      </View>

      <View style={{ position: "absolute", right: 16, top: insets.top + 84, gap: 8, alignItems: "flex-end" }}>
        <View style={{ borderRadius: 999, backgroundColor: theme.card, ...shadow.pin }}>
          <CircleButton
            accessibilityLabel="Zoom in"
            size={44}
            onPress={() => setZoom((current) => Math.min(MAX_ZOOM, current + 1))}>
            <Text style={{ color: theme.ink, fontSize: 24, lineHeight: 25, fontWeight: "500" }}>+</Text>
          </CircleButton>
        </View>
        <View style={{ borderRadius: 999, backgroundColor: theme.card, ...shadow.pin }}>
          <CircleButton
            accessibilityLabel="Zoom out"
            size={44}
            onPress={() => setZoom((current) => Math.max(MIN_ZOOM, current - 1))}>
            <Text style={{ color: theme.ink, fontSize: 26, lineHeight: 27, fontWeight: "400" }}>−</Text>
          </CircleButton>
        </View>
        <PillButton label="Recenter" onPress={recenter} />
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL("https://www.openstreetmap.org/copyright")}
        style={{
          position: "absolute",
          right: 7,
          bottom: tabBarHeight + (selectedRoom ? 131 : 10),
          paddingHorizontal: 5,
          paddingVertical: 3,
          backgroundColor: theme.glass,
          borderRadius: 4,
        }}>
        <Text style={{ color: theme.muted, fontSize: 9, fontWeight: "500" }}>© OpenStreetMap contributors</Text>
      </Pressable>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: tabBarHeight + 26, paddingHorizontal: 16 }}>
        {selectedRoom ? <MapPreviewCard room={selectedRoom} onPress={() => onOpenRoom(selectedRoom.id)} /> : null}
      </View>
    </View>
  );
}

function MapTiles({ center, layout, zoom }: { center: Coordinate; layout: Size; zoom: number }) {
  const tiles = React.useMemo(() => visibleTiles(center, layout, zoom), [center, layout, zoom]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tiles.map((tile) => (
        <Image
          key={`${zoom}-${tile.x}-${tile.y}`}
          accessibilityElementsHidden
          cachePolicy="disk"
          contentFit="cover"
          source={`https://tile.openstreetmap.org/${zoom}/${tile.sourceX}/${tile.y}.png`}
          style={{ position: "absolute", left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
        />
      ))}
    </View>
  );
}

function MapPin({
  room,
  center,
  layout,
  zoom,
  selected,
  onPress,
}: {
  room: Room;
  center: Coordinate;
  layout: Size;
  zoom: number;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  if (!room.coordinate || layout.width === 0) return null;

  const centerWorld = coordinateToWorld(center, zoom);
  const point = coordinateToWorld(room.coordinate, zoom);
  const left = layout.width / 2 + point.x - centerWorld.x;
  const top = layout.height / 2 + point.y - centerWorld.y;
  if (left < -80 || left > layout.width + 80 || top < -60 || top > layout.height + 60) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${room.title}, ${formatKr(room.rent)}`}
      onPress={onPress}
      style={({ pressed }) => ({
        position: "absolute",
        left,
        top,
        minWidth: 64,
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: selected ? theme.ink : theme.card,
        opacity: pressed ? 0.85 : 1,
        transform: [{ translateX: -32 }, { translateY: -18 }],
        ...shadow.pin,
      })}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: selected ? theme.background : theme.ink }}>
        {formatThousands(room.rent)}
      </Text>
    </Pressable>
  );
}

function MapPreviewCard({ room, onPress }: { room: Room; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${room.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 12,
        padding: 11,
        borderRadius: 22,
        borderCurve: "continuous",
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        opacity: pressed ? 0.93 : 1,
        ...shadow.floating,
      })}>
      <Photo uri={room.photoUri} stripe={8} style={{ width: 82, height: 82, borderRadius: 14 }} />
      <View style={{ gap: 5, justifyContent: "center", flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: "600", color: theme.ink }}>
          {room.title}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "500", color: theme.muted }}>
          {room.meta}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color: theme.accent }}>{formatKr(room.rent)}</Text>
      </View>
    </Pressable>
  );
}

function visibleTiles(center: Coordinate, layout: Size, zoom: number) {
  if (layout.width === 0 || layout.height === 0) return [];
  const centerWorld = coordinateToWorld(center, zoom);
  const originX = centerWorld.x - layout.width / 2;
  const originY = centerWorld.y - layout.height / 2;
  const firstX = Math.floor(originX / TILE_SIZE) - 1;
  const lastX = Math.floor((originX + layout.width) / TILE_SIZE) + 1;
  const firstY = Math.max(0, Math.floor(originY / TILE_SIZE) - 1);
  const tileCount = 2 ** zoom;
  const lastY = Math.min(tileCount - 1, Math.floor((originY + layout.height) / TILE_SIZE) + 1);
  const tiles: { x: number; sourceX: number; y: number; left: number; top: number }[] = [];

  for (let x = firstX; x <= lastX; x += 1) {
    for (let y = firstY; y <= lastY; y += 1) {
      tiles.push({
        x,
        sourceX: ((x % tileCount) + tileCount) % tileCount,
        y,
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
      });
    }
  }
  return tiles;
}

function centerOfRooms(rooms: Room[]): Coordinate {
  const coordinates = rooms.flatMap((room) => (room.coordinate ? [room.coordinate] : []));
  if (coordinates.length === 0) return DEFAULT_CENTER;
  return {
    latitude: coordinates.reduce((sum, coordinate) => sum + coordinate.latitude, 0) / coordinates.length,
    longitude: coordinates.reduce((sum, coordinate) => sum + coordinate.longitude, 0) / coordinates.length,
  };
}

function fitZoomForRooms(rooms: Room[], layout: Size) {
  const coordinates = rooms.flatMap((room) => (room.coordinate ? [room.coordinate] : []));
  if (coordinates.length < 2 || layout.width === 0 || layout.height === 0) return 14;

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const points = coordinates.map((coordinate) => coordinateToWorld(coordinate, zoom));
    const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
    const height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
    if (width <= Math.max(120, layout.width - 100) && height <= Math.max(180, layout.height - 310)) {
      return zoom;
    }
  }
  return MIN_ZOOM;
}

function coordinateToWorld(coordinate: Coordinate, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const latitude = Math.min(85.05112878, Math.max(-85.05112878, coordinate.latitude));
  const sine = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((coordinate.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  };
}

function worldToCoordinate(x: number, y: number, zoom: number): Coordinate {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const mercator = Math.PI - (2 * Math.PI * y) / scale;
  return {
    latitude: (180 / Math.PI) * Math.atan(Math.sinh(mercator)),
    longitude: ((longitude + 540) % 360) - 180,
  };
}
