import { Image } from "expo-image";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { formatCurrency, formatDate, formatRooms, formatSize } from "@/features/listings/format";
import { useListingColors } from "@/features/listings/components";

export type ApartmentCardApartment = {
  id: string;
  title: string;
  location: string;
  monthlyRent: number;
  currency: string;
  sizeSqm: number;
  bedroomCount: number;
  bathroomCount: number;
  availableFrom: string;
  furnished: boolean;
  imageUrl?: string;
  highlights: string[];
};

export function ApartmentCard({
  apartment,
  onPress,
}: {
  apartment: ApartmentCardApartment;
  onPress?: () => void;
}) {
  const colors = useListingColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const mobileCardHeight = Math.min(410, Math.max(380, (width - 40) * 1.1));

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        overflow: "hidden",
        borderRadius: 22,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        flexDirection: isWide ? "row" : "column",
        height: isWide ? undefined : mobileCardHeight,
        opacity: pressed ? 0.92 : 1,
      })}>
      <View
        style={{
          alignSelf: "stretch",
          flex: isWide ? undefined : 2,
          minHeight: isWide ? 250 : undefined,
          width: isWide ? "66.666%" : "100%",
          backgroundColor: colors.cardSecondary,
        }}>
        {apartment.imageUrl ? (
          <Image source={apartment.imageUrl} contentFit="cover" transition={180} style={{ flex: 1 }} />
        ) : null}
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          justifyContent: isWide ? undefined : "space-between",
          gap: isWide ? 10 : 6,
          padding: isWide ? 14 : 10,
        }}>
        <View style={{ gap: 4 }}>
          <Text
            numberOfLines={isWide ? 2 : 1}
            style={{
              fontSize: 16,
              lineHeight: 20,
              fontWeight: "800",
              color: colors.title,
            }}>
            {apartment.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              lineHeight: 16,
              color: colors.body,
            }}>
            {apartment.location}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontSize: 18,
                lineHeight: 23,
                fontWeight: "800",
                color: colors.title,
              }}>
              {formatCurrency(apartment.monthlyRent, apartment.currency)}
            </Text>
            {isWide ? (
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  color: colors.body,
                }}>
                per month
              </Text>
            ) : null}
          </View>

          <View
            style={{
              borderRadius: 999,
              borderCurve: "continuous",
              backgroundColor: colors.accentSoft,
              paddingHorizontal: 9,
              paddingVertical: isWide ? 7 : 6,
            }}>
            <Text
              style={{
                fontSize: 11,
                lineHeight: 14,
                fontWeight: "800",
                color: colors.accent,
              }}>
              {formatDate(apartment.availableFrom)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: isWide ? 6 : 8 }}>
          <InfoPill label={formatSize(apartment.sizeSqm)} compact />
          <InfoPill label={formatRooms("bedroom", apartment.bedroomCount)} compact />
          {isWide ? (
            <>
              <InfoPill label={formatRooms("bathroom", apartment.bathroomCount)} compact />
              <InfoPill label={apartment.furnished ? "Furnished" : "Unfurnished"} compact />
            </>
          ) : null}
        </View>

        {isWide && apartment.highlights.length > 0 ? (
          <Text
            numberOfLines={2}
            style={{
              fontSize: isWide ? 12 : 14,
              lineHeight: isWide ? 17 : 20,
              color: colors.body,
            }}>
            {apartment.highlights.join(" · ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function InfoPill({ label, compact = false }: { label: string; compact?: boolean }) {
  const colors = useListingColors();

  return (
    <View
      style={{
        borderRadius: 999,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.cardSecondary,
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 6 : 7,
      }}>
      <Text
        numberOfLines={1}
        style={{
          fontSize: compact ? 11 : 13,
          lineHeight: compact ? 14 : 16,
          fontWeight: "700",
          color: colors.title,
        }}>
        {label}
      </Text>
    </View>
  );
}
