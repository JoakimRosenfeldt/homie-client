import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, CircleButton } from "@/components/button";
import { OutlineTag, SectionLabel } from "@/components/chip";
import { ChevronLeftIcon } from "@/components/icons";
import { Avatar, Photo } from "@/components/photo";
import { Overlay } from "@/components/screen";
import { Text } from "@/components/text";
import { useSession } from "@/features/nabo/store";
import { formatKr, getRoom } from "@/features/rooms/data";
import { radius, useTheme } from "@/theme/tokens";

export default function RoomDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  const room = getRoom(roomId);

  if (!room) {
    return (
      <Overlay style={{ alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.ink }}>Room not found</Text>
        <Text style={{ textAlign: "center", fontSize: 14, lineHeight: 21, color: theme.muted }}>
          This listing is no longer available.
        </Text>
        <Button label="Back to Explore" onPress={() => router.back()} style={{ paddingHorizontal: 24 }} />
      </Overlay>
    );
  }

  const applied = Boolean(session.applied[room.id]);

  return (
    <Overlay>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Photo uri={room.photoUri} label={room.photo} stripe={12} style={{ height: 330 }}>
          <CircleButton
            accessibilityLabel="Back"
            onPress={() => router.back()}
            size={38}
            tone="glass"
            style={{ position: "absolute", left: 16, top: insets.top + 14 }}>
            <ChevronLeftIcon color={theme.ink} />
          </CircleButton>

          <View
            style={{
              position: "absolute",
              right: 16,
              bottom: 14,
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: theme.photoOverlay,
            }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: theme.onPhotoOverlay }}>1 / {room.photoCount}</Text>
          </View>
        </Photo>

        <View style={{ padding: 20, gap: 10 }}>
          <Text style={{ fontSize: 27, lineHeight: 31, fontWeight: "800", color: theme.ink }}>{room.title}</Text>
          <Text style={{ fontSize: 13, fontWeight: "500", color: theme.muted }}>{room.meta}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 2 }}>
            {room.tags.map((tag) => (
              <OutlineTag key={tag} label={tag} />
            ))}
          </View>

          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 23, color: theme.body }}>{room.blurb}</Text>

          <View
            style={{
              marginTop: 8,
              padding: 18,
              paddingTop: 16,
              backgroundColor: theme.card,
              borderRadius: radius.card,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <SectionLabel label="WHO YOU'D LIVE WITH" />
            <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
              {room.flatmates.map((flatmate) => (
                <View key={flatmate.name} style={{ width: 64, alignItems: "center", gap: 6 }}>
                  <Avatar uri={flatmate.photoUri} size={52} />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: theme.ink }}>{flatmate.name}</Text>
                  <Text style={{ textAlign: "center", fontSize: 10, fontWeight: "500", color: theme.faint }}>
                    {flatmate.role}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <MiniMap />
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 14,
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}>
        <View>
          <Text style={{ fontSize: 19, fontWeight: "700", color: theme.ink }}>{formatKr(room.rent)}</Text>
          <Text style={{ fontSize: 11, fontWeight: "500", color: theme.faint }}>incl. utilities</Text>
        </View>

        <Button
          label={applied ? "Application sent ✓" : "Apply with your profile"}
          onPress={() => session.applyToRoom(room.id)}
          disabled={applied}
          dimWhenDisabled={false}
          height={50}
          style={{ flex: 1 }}
        />
      </View>
    </Overlay>
  );
}

function MiniMap() {
  const theme = useTheme();

  return (
    <View
      style={{
        height: 150,
        marginTop: 4,
        borderRadius: radius.card,
        borderCurve: "continuous",
        backgroundColor: theme.mapGround,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}>
      {Array.from({ length: 9 }, (_, index) => (
        <View
          key={`v${index}`}
          style={{ position: "absolute", top: 0, bottom: 0, left: 40 + index * 45, width: 5, backgroundColor: theme.mapGrid }}
        />
      ))}
      {Array.from({ length: 3 }, (_, index) => (
        <View
          key={`h${index}`}
          style={{ position: "absolute", left: 0, right: 0, top: 44 + index * 49, height: 5, backgroundColor: theme.mapGrid }}
        />
      ))}

      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: theme.accent,
          borderWidth: 4,
          borderColor: theme.card,
        }}
      />
    </View>
  );
}
