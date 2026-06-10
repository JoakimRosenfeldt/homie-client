import type { UserProfile } from "@/features/profile/model";

export const MOCK_USER_PROFILE: UserProfile = {
  id: "current-user",
  displayName: "Sofia",
  age: 27,
  headline: "Looking for a calm home in Nørrebro",
  bio: "Product designer who works from home two days a week. I cook a lot, bike everywhere, and keep things tidy without being fussy about it.",
  occupation: "Product Designer at Pleo",
  verified: true,
  photos: [
    {
      id: "photo-1",
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
      caption: "Sunday market runs",
    },
    {
      id: "photo-2",
      url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80",
      caption: "Balcony season",
    },
    {
      id: "photo-3",
      url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
      caption: "Home office setup",
    },
    {
      id: "photo-4",
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  prompts: [
    {
      id: "prompt-1",
      question: "My ideal Sunday looks like",
      answer: "Farmers market, a long bike ride, then pasta and a movie on the couch.",
    },
    {
      id: "prompt-2",
      question: "I'm picky about",
      answer: "Natural light and a kitchen I can actually cook in. Everything else is negotiable.",
    },
    {
      id: "prompt-3",
      question: "You should know that I",
      answer: "Have a very quiet cat named Miso who never scratches furniture.",
    },
  ],
  lifestyle: [
    { id: "pets", label: "Cat owner" },
    { id: "wfh", label: "WFH 2 days" },
    { id: "non-smoker", label: "Non-smoker" },
    { id: "quiet", label: "Quiet hours" },
    { id: "bike", label: "Bike commuter" },
  ],
  neighborhoods: ["Nørrebro", "Inner Nørrebro", "Assistens"],
  maxBudget: 14000,
  currency: "DKK",
  moveInDate: "2026-08-01",
  roommatePreference: "Solo or one roommate",
  completionPercent: 82,
  missingSteps: ["Add a video intro", "Verify income"],
};

export function getMockUserProfile(): UserProfile {
  return MOCK_USER_PROFILE;
}
