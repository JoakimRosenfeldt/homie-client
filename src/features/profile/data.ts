export const OWNER_PROFILE = {
  name: "Sofie Lund",
  firstName: "Sofie",
  age: "28",
  occupation: "Physiotherapist, Bispebjerg",
  subtitle: "Renting out 1 room · Nørrebro",
  photoUri: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
  strengthPercent: 80,
  strengthHint: "Add a photo of the shared kitchen — listings with 5+ photos get 3× more applicants.",
  defaultBio:
    "Physio at Bispebjerg, out the door at seven, home by five. I cook too much food and will offer you some.",
};

export const PROFILE_SETTINGS = [
  { label: "Your listing", value: "Live · 12 applicants" },
  { label: "Deal breakers", value: "Non-smoker, no pets" },
  { label: "Verification", value: "ID + income ✓" },
  { label: "Notifications", value: "Push + email" },
];

export type SearchAgent = {
  name: string;
  meta: string;
  hits: number;
};

export const DEFAULT_SEARCH_AGENTS: SearchAgent[] = [
  { name: "Nørrebro, under 6.500", meta: "2 areas · instant alerts", hits: 3 },
];

export const AGENT_AREAS = ["Nørrebro", "Vesterbro", "Østerbro", "Amager", "Frederiksberg", "Valby"];
export const AGENT_FEATURES = ["Furnished", "Own bathroom", "Pets ok", "Couple ok", "Balcony", "Min. 12 months"];
export const AGENT_FREQUENCIES = ["Instantly", "Twice a day", "Daily digest"];

export const LISTING_FIELDS = [
  { label: "HEADLINE", value: "Room in a 3-person flat" },
  { label: "ADDRESS", value: "Jægersborggade 12, 2200 Kbh N" },
  { label: "MONTHLY RENT", value: "5.400 kr incl. utilities" },
  { label: "AVAILABLE FROM", value: "1 September" },
];

export const LISTING_RULES = ["Non-smoking", "Pets ok", "Couple ok", "Furnished", "Min. 6 months"];

export const ONBOARDING_STEPS = [
  {
    title: "Add a few photos",
    help: "Rooms go to people who feel real. Three photos is the minimum — one of you, two of anything you love.",
  },
  {
    title: "Who are you?",
    help: "Kept short on purpose. The details that matter to a household are on the next step.",
  },
  {
    title: "How do you live?",
    help: "Pick what is true, not what sounds good. These are the first thing a household filters on.",
  },
  {
    title: "Here is your card",
    help: "Looks right? You can change any of it later from your profile.",
  },
];

export const ONBOARDING_FIELDS = [
  { label: "NAME", value: OWNER_PROFILE.name },
  { label: "AGE", value: OWNER_PROFILE.age },
  { label: "OCCUPATION", value: OWNER_PROFILE.occupation },
];

export const ONBOARDING_TAG_GROUPS = [
  { label: "EVERYDAY", items: ["Tidy", "Cooks a lot", "Early riser", "Home late", "Works from home"] },
  { label: "HOUSEHOLD", items: ["Non-smoker", "Has a pet", "Vegetarian", "No parties"] },
  { label: "SOCIAL", items: ["Shared dinners", "Keep to myself", "Guests sometimes"] },
];

export const DEFAULT_PROFILE_TAGS = ["Tidy", "Cooks a lot", "Non-smoker"];
