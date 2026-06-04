import { Text, View } from "react-native";

import { ApartmentCard, type ApartmentCardApartment } from "@/features/listings/apartment-card";
import { ListingScreen, useListingColors } from "@/features/listings/components";

const MOCK_APARTMENTS: ApartmentCardApartment[] = [
  {
    id: "norrebro-loft",
    title: "Bright top-floor apartment near Assistens",
    location: "Norrebro, Copenhagen",
    monthlyRent: 14800,
    currency: "DKK",
    sizeSqm: 74,
    bedroomCount: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-01",
    furnished: true,
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Balcony", "Dishwasher", "Bike parking"],
  },
  {
    id: "vesterbro-courtyard",
    title: "Quiet courtyard home with generous living room",
    location: "Vesterbro, Copenhagen",
    monthlyRent: 13200,
    currency: "DKK",
    sizeSqm: 68,
    bedroomCount: 1,
    bathroomCount: 1,
    availableFrom: "2026-08-15",
    furnished: false,
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Elevator", "Laundry", "Close to metro"],
  },
  {
    id: "amager-harbor",
    title: "Harbor-side apartment with morning light",
    location: "Amager Strand, Copenhagen",
    monthlyRent: 16900,
    currency: "DKK",
    sizeSqm: 82,
    bedroomCount: 2,
    bathroomCount: 1,
    availableFrom: "2026-06-20",
    furnished: true,
    imageUrl:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Water view", "Parking", "Pets allowed"],
  },
];

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
          <ApartmentCard key={apartment.id} apartment={apartment} />
        ))}
      </View>
    </ListingScreen>
  );
}
