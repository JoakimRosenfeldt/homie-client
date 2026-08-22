import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button, CircleButton } from "@/components/button";
import { OutlineTag, SectionLabel } from "@/components/chip";
import { ChevronLeftIcon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Overlay } from "@/components/screen";
import { SystemState } from "@/components/system-state";
import { Text } from "@/components/text";
import { useProductFlow } from "@/features/applications/store";
import { formatKr, formatListingDate, propertyTypeLabel } from "@/features/rooms/data";
import { radius, useTheme } from "@/theme/tokens";

const AMENITY_LABELS = {
  parking: "Parking",
  laundry: "Laundry",
  dishwasher: "Dishwasher",
  balcony: "Balcony",
  elevator: "Elevator",
  internetIncluded: "Internet included",
  petsAllowed: "Pets allowed",
  smokingAllowed: "Smoking allowed",
} as const;

export default function RoomDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const flow = useProductFlow();
  const params = useLocalSearchParams<{ roomId?: Id<"listings"> | Id<"listings">[] }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const room = useQuery(api.listings.getDetail, roomId ? { listingId: roomId } : "skip");

  if (!roomId || room === null) {
    return (
      <Overlay style={{ alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.ink }}>Home not found</Text>
        <Text style={{ textAlign: "center", fontSize: 14, lineHeight: 21, color: theme.muted }}>
          This listing is no longer available.
        </Text>
        <Button label="Back to Explore" onPress={() => router.back()} style={{ paddingHorizontal: 24 }} />
      </Overlay>
    );
  }

  if (room === undefined) {
    return (
      <Overlay style={{ alignItems: "center", justifyContent: "center", padding: 32 }}>
        <SystemState kind="loading" message="Loading this home." />
      </Overlay>
    );
  }

  const application = flow.applications.find((item) => item.listingId === room._id);
  const tags = [
    propertyTypeLabel(room.propertyType),
    room.furnished === true ? "Furnished" : room.furnished === false ? "Unfurnished" : undefined,
    room.rentalArrangement === "sublease" ? "Sublease" : undefined,
    ...room.amenities.map((amenity) => AMENITY_LABELS[amenity]),
  ].filter((tag): tag is string => Boolean(tag));
  const facts = [
    room.publicLocationLabel,
    room.sizeSqm ? `${room.sizeSqm} m²` : undefined,
    room.bedroomCount ? `${room.bedroomCount} ${room.bedroomCount === 1 ? "bedroom" : "bedrooms"}` : undefined,
    room.bathroomCount
      ? `${room.bathroomCount} ${room.bathroomCount === 1 ? "bathroom" : "bathrooms"}`
      : undefined,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <Overlay>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Photo uri={room.photos[0]?.url ?? undefined} label={`Photo of ${room.title}`} stripe={12} style={{ height: 330 }}>
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
            <Text style={{ fontSize: 11, fontWeight: "600", color: theme.onPhotoOverlay }}>
              {room.photos.length} {room.photos.length === 1 ? "photo" : "photos"}
            </Text>
          </View>
        </Photo>

        <View style={{ padding: 20, gap: 10 }}>
          <Text style={{ fontSize: 27, lineHeight: 31, fontWeight: "800", color: theme.ink }}>{room.title}</Text>
          <Text style={{ fontSize: 13, fontWeight: "500", color: theme.muted }}>{facts.join(" · ")}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 2 }}>
            {tags.map((tag) => (
              <OutlineTag key={tag} label={tag} />
            ))}
          </View>

          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 23, color: theme.body }}>
            {room.description ?? room.summary ?? "The host has not added a description yet."}
          </Text>

          <View
            style={{
              marginTop: 8,
              padding: 18,
              paddingTop: 16,
              gap: 11,
              backgroundColor: theme.card,
              borderRadius: radius.card,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <SectionLabel label="RENTAL DETAILS" />
            <DetailRow label="Available" value={room.availableFrom ? formatListingDate(room.availableFrom) : "Ask host"} />
            <DetailRow label="Deposit" value={room.deposit === undefined ? "Ask host" : formatKr(room.deposit)} />
            <DetailRow label="Utilities" value={room.utilitiesIncluded ? "Included" : "Not included"} />
            <DetailRow label="Minimum stay" value={room.minLeaseMonths ? `${room.minLeaseMonths} months` : "Flexible"} />
          </View>

          <MiniMap label={room.publicLocationLabel ?? "Approximate area"} />
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
          <Text style={{ fontSize: 19, fontWeight: "700", color: theme.ink }}>
            {room.monthlyRent === undefined ? "Ask host" : formatKr(room.monthlyRent)}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "500", color: theme.faint }}>
            {room.utilitiesIncluded ? "utilities included" : "plus utilities"}
          </Text>
        </View>

        <Button
          label={application ? "View your application" : "Apply with your profile"}
          onPress={() =>
            application
              ? router.push(`/applications/${application.id}`)
              : router.push(`/apply/${room._id}`)
          }
          height={50}
          style={{ flex: 1 }}
        />
      </View>
    </Overlay>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text style={{ fontSize: 13, color: theme.muted }}>{label}</Text>
      <Text style={{ flexShrink: 1, textAlign: "right", fontSize: 13, fontWeight: "600", color: theme.ink }}>
        {value}
      </Text>
    </View>
  );
}

function MiniMap({ label }: { label: string }) {
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
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 40 + index * 45,
            width: 5,
            backgroundColor: theme.mapGrid,
          }}
        />
      ))}
      {Array.from({ length: 3 }, (_, index) => (
        <View
          key={`h${index}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 44 + index * 49,
            height: 5,
            backgroundColor: theme.mapGrid,
          }}
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
      <Text
        style={{
          position: "absolute",
          left: 12,
          bottom: 10,
          paddingHorizontal: 9,
          paddingVertical: 5,
          borderRadius: radius.pill,
          backgroundColor: theme.card,
          fontSize: 11,
          fontWeight: "600",
          color: theme.ink,
        }}>
        {label}
      </Text>
    </View>
  );
}
