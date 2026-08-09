export type Flatmate = {
  name: string;
  role: string;
  photoUri?: string;
};

export type Room = {
  id: string;
  title: string;
  meta: string;
  /** Monthly rent in DKK, incl. utilities. */
  rent: number;
  /** Caption shown when no photo is available. */
  photo: string;
  photoUri?: string;
  photoCount: number;
  tags: string[];
  blurb: string;
  flatmates: Flatmate[];
  /** Position of the price pin on the stylised map. */
  pin: { left: number; top: number };
};

export const ROOMS: Room[] = [
  {
    id: "l1",
    title: "Bright room in a 4-person flat",
    meta: "Nørrebro · 18 m² · own balcony",
    rent: 5400,
    photo: "room photo — window wall",
    photoUri: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    photoCount: 8,
    tags: ["Furnished", "Female flatmates", "From 1 Sep"],
    blurb:
      "Corner room facing the courtyard, morning light until noon. We are three: a nurse, a PhD student and a chef, so the flat is quiet on weekdays and busy on Sundays. Shared kitchen was redone last year.",
    flatmates: [
      {
        name: "Ida",
        role: "Nurse, 29",
        photoUri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Mikkel",
        role: "PhD, 27",
        photoUri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Yara",
        role: "Chef, 31",
        photoUri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      },
    ],
    pin: { left: 70, top: 300 },
  },
  {
    id: "l2",
    title: "Room in artist collective",
    meta: "Vesterbro · 22 m² · shared studio",
    rent: 4900,
    photo: "room photo — desk corner",
    photoUri: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    photoCount: 6,
    tags: ["Unfurnished", "Pets ok", "From 15 Aug"],
    blurb:
      "Old print workshop turned into five rooms and a shared studio. Loud on Thursdays, empty most weekends. Best for someone who makes things.",
    flatmates: [
      {
        name: "Otto",
        role: "Printer, 34",
        photoUri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Line",
        role: "Dancer, 26",
        photoUri: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
      },
    ],
    pin: { left: 210, top: 240 },
  },
  {
    id: "l3",
    title: "Quiet room near the lakes",
    meta: "Østerbro · 15 m² · furnished",
    rent: 6200,
    photo: "room photo — bed and shelf",
    photoUri: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    photoCount: 5,
    tags: ["Non-smoking", "Couple ok", "From 1 Oct"],
    blurb: "Top floor, two flatmates who both work early. Deposit three months. Bike parking in the yard.",
    flatmates: [
      {
        name: "Sara",
        role: "Vet, 33",
        photoUri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Tom",
        role: "Baker, 30",
        photoUri: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
      },
    ],
    pin: { left: 130, top: 470 },
  },
  {
    id: "l4",
    title: "Big room, garden access",
    meta: "Amager · 24 m² · house share",
    rent: 5800,
    photo: "room photo — garden door",
    photoUri: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
    photoCount: 9,
    tags: ["Furnished", "Garden", "From 1 Sep"],
    blurb:
      "Ground floor of a 1930s house, five of us, one very old cat. Shared vegetable patch that nobody waters enough.",
    flatmates: [
      {
        name: "Nina",
        role: "Teacher, 38",
        photoUri: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Ravi",
        role: "Dev, 29",
        photoUri: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
      },
    ],
    pin: { left: 265, top: 400 },
  },
];

export function getRoom(roomId?: string | string[]) {
  const id = Array.isArray(roomId) ? roomId[0] : roomId;
  return ROOMS.find((room) => room.id === id);
}

/** Active search chips shown under the Explore search field. */
export const SEARCH_CHIPS = ["Nørrebro", "Vesterbro", "Under 7.000 kr", "From 1 Sep", "Furnished"];

/** Total matching the saved search — the prototype's catalogue is a sample of it. */
export const RESULT_COUNT = 128;

export const SEARCH_SUMMARY = "Nørrebro · 1 Sep · under 7.000";

export const OWN_LISTING_LABEL = "Your listing · Jægersborggade 12";

/** Danish thousand separators, e.g. 5400 -> "5.400 kr". */
export function formatKr(amount: number) {
  return `${formatThousands(amount)} kr`;
}

export function formatThousands(amount: number) {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
