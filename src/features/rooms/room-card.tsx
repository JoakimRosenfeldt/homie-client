import { View } from "react-native";

import { CardPressable } from "@/components/button";
import { MetaTag } from "@/components/chip";
import { HeartIcon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Text } from "@/components/text";
import { formatKr, type Room } from "@/features/rooms/data";
import { radius, shadow, useTheme } from "@/theme/tokens";

export function RoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  const theme = useTheme();

  return (
    // The shadow lives on an outer wrapper: iOS maps `overflow: "hidden"` to
    // `masksToBounds`, which would clip the shadow away on the clipped card.
    <View style={{ borderRadius: radius.card, backgroundColor: theme.card, ...shadow.card }}>
      <CardPressable
        onPress={onPress}
        style={{
          backgroundColor: theme.card,
          borderRadius: radius.card,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: theme.border,
          overflow: "hidden",
        }}>
      <Photo uri={room.photoUri} label={room.photo} style={{ height: 170 }}>
        <View
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            paddingHorizontal: 11,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: theme.photoOverlay,
          }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.onPhotoOverlay }}>{formatKr(room.rent)}</Text>
        </View>

        <View
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: theme.glass,
            alignItems: "center",
            justifyContent: "center",
          }}>
          <HeartIcon color={theme.ink} />
        </View>
      </Photo>

        <View style={{ padding: 15, paddingTop: 13, gap: 7 }}>
          <Text style={{ fontSize: 15.5, fontWeight: "600", color: theme.ink }}>{room.title}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: "500", color: theme.muted }}>{room.meta}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 3 }}>
            {room.tags.map((tag) => (
              <MetaTag key={tag} label={tag} />
            ))}
          </View>
        </View>
      </CardPressable>
    </View>
  );
}
