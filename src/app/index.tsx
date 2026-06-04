import { router } from "expo-router";
import { Text, View } from "react-native";

import { ApartmentCard } from "@/features/listings/apartment-card";
import { ListingScreen, useListingColors } from "@/features/listings/components";
import { MOCK_APARTMENTS } from "@/features/listings/mock-apartments";

export default function HomeScreen() {
  const colors = useListingColors();

  return (
    <ListingScreen>
      <View style={{ gap: 6, paddingTop: 8, paddingBottom: 6 }}>
        <Text
          selectable
          style={{
            fontSize: 34,
            lineHeight: 39,
            fontWeight: "800",
            color: colors.title,
          }}>
          Apartments
        </Text>
        <Text
          selectable
          style={{
            fontSize: 16,
            lineHeight: 22,
            color: colors.body,
          }}>
          A quick look at available homes with the essentials up front.
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        {MOCK_APARTMENTS.map((apartment) => (
          <ApartmentCard
            key={apartment.id}
            apartment={apartment}
            onPress={() =>
              router.push({
                pathname: "/apartments/[apartmentId]",
                params: { apartmentId: apartment.id },
              } as never)
            }
          />
        ))}
      </View>
    </ListingScreen>
  );
}
