import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PillButton } from "@/components/button";
import { Photo } from "@/components/photo";
import { useTabBarHeight } from "@/components/screen";
import { Text } from "@/components/text";
import { formatKr, formatThousands, ROOMS, type Room } from "@/features/rooms/data";
import { SearchField } from "@/features/rooms/search-field";
import { radius, shadow, useTheme } from "@/theme/tokens";

/**
 * A stylised stand-in for the real map — grid streets, a park and a stretch of
 * water — so the pin/preview interaction can be designed before a tile
 * provider is wired in.
 */
export function ExploreMap({
  onOpenFilters,
  onShowList,
  onOpenRoom,
}: {
  onOpenFilters: () => void;
  onShowList: () => void;
  onOpenRoom: (roomId: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [selectedId, setSelectedId] = React.useState(ROOMS[0].id);

  const selected = ROOMS.find((room) => room.id === selectedId) ?? ROOMS[0];

  return (
    <View style={{ flex: 1, backgroundColor: theme.mapGround, overflow: "hidden" }}>
      <MapTerrain />

      {ROOMS.map((room) => (
        <MapPin
          key={room.id}
          room={room}
          selected={room.id === selectedId}
          onPress={() => setSelectedId(room.id)}
        />
      ))}

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
        <SearchField onPress={onOpenFilters} showIcon={false} />
        <PillButton label="List" tone="accent" onPress={onShowList} />
      </View>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: tabBarHeight + 26, paddingHorizontal: 16 }}>
        <MapPreviewCard room={selected} onPress={() => onOpenRoom(selected.id)} />
      </View>
    </View>
  );
}

function MapTerrain() {
  const theme = useTheme();

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
      {Array.from({ length: 8 }, (_, index) => (
        <View
          key={`v${index}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 46 + index * 52,
            width: 6,
            backgroundColor: theme.mapGrid,
          }}
        />
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <View
          key={`h${index}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 62 + index * 68,
            height: 6,
            backgroundColor: theme.mapGrid,
          }}
        />
      ))}

      <View
        style={{
          position: "absolute",
          left: -40,
          top: 180,
          width: 250,
          height: 150,
          backgroundColor: theme.mapPark,
          borderTopLeftRadius: 80,
          borderTopRightRadius: 120,
          borderBottomRightRadius: 110,
          borderBottomLeftRadius: 90,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: -70,
          top: 430,
          width: 300,
          height: 220,
          backgroundColor: theme.mapWater,
          borderTopLeftRadius: 130,
          borderTopRightRadius: 100,
          borderBottomRightRadius: 155,
          borderBottomLeftRadius: 115,
        }}
      />
    </View>
  );
}

function MapPin({ room, selected, onPress }: { room: Room; selected: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${room.title}, ${formatKr(room.rent)}`}
      onPress={onPress}
      style={{
        position: "absolute",
        left: room.pin.left,
        top: room.pin.top,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: selected ? theme.ink : theme.card,
        ...shadow.pin,
      }}>
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
