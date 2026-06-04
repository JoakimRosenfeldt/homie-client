import type { ApartmentCardApartment } from "@/features/listings/apartment-card";

export type MockApartment = ApartmentCardApartment & {
  description: string;
  floor: string;
  leaseTerm: string;
  depositMonths: number;
  contactName: string;
  amenities: string[];
};

export const MOCK_APARTMENTS: MockApartment[] = [
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
    description:
      "A calm top-floor home with warm daylight, a practical kitchen, and a compact balcony facing the courtyard.",
    floor: "4th floor",
    leaseTerm: "12+ months",
    depositMonths: 3,
    contactName: "Homie Rentals",
    amenities: ["Balcony", "Dishwasher", "Laundry", "Bike parking", "Internet ready"],
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
    description:
      "A quiet apartment set back from the street, with an open living area and easy access to trains, cafes, and grocery stores.",
    floor: "2nd floor",
    leaseTerm: "24+ months",
    depositMonths: 3,
    contactName: "Homie Rentals",
    amenities: ["Elevator", "Laundry", "Metro nearby", "Storage room", "Shared courtyard"],
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
    description:
      "A furnished harbor-side apartment with generous windows, morning light, and quick access to the beach path.",
    floor: "3rd floor",
    leaseTerm: "6-18 months",
    depositMonths: 3,
    contactName: "Homie Rentals",
    amenities: ["Water view", "Parking", "Pets allowed", "Balcony", "Elevator"],
  },
];

export function getMockApartment(apartmentId?: string | string[]) {
  const id = Array.isArray(apartmentId) ? apartmentId[0] : apartmentId;
  return MOCK_APARTMENTS.find((apartment) => apartment.id === id);
}
