import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { MetaTag } from "@/components/chip";
import { useFocusRing } from "@/components/interaction";
import { Photo } from "@/components/photo";
import { Text } from "@/components/text";
import { useI18n } from "@/i18n";
import { radius, shadow, useTheme } from "@/theme/tokens";

export type Room = {
  id: string;
  title: string;
  meta: string;
  rent: number;
  photo: string;
  photoUri?: string;
  tags: string[];
};

export function RoomCard({ room }: { room: Room }) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const { formatCurrency, t } = useI18n();

  return (
    // The shadow lives on an outer wrapper: iOS maps `overflow: "hidden"` to
    // `masksToBounds`, which would clip the shadow away on the clipped card.
    <View style={{ borderRadius: radius.card, backgroundColor: theme.card, ...shadow.card }}>
      <Link href={{ pathname: "/rooms/[roomId]", params: { roomId: room.id } }} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("explore.openListing", { title: room.title })}
          onBlur={focus.onBlur}
          onFocus={focus.onFocus}
          style={({ pressed }) => [
            {
              backgroundColor: theme.card,
              borderRadius: radius.card,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
              opacity: pressed ? 0.93 : 1,
            },
            focus.focusStyle,
          ]}>
          <Photo
            uri={room.photoUri}
            label={room.photo}
            accessibilityLabel={t("explore.photoOf", { title: room.title })}
            style={{ height: 170 }}>
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
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.onPhotoOverlay }}>
                {formatCurrency(room.rent)}
              </Text>
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
        </Pressable>
      </Link>
    </View>
  );
}
