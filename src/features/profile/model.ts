export type ProfilePhoto = {
  id: string;
  url: string;
  caption?: string;
};

export type ProfilePrompt = {
  id: string;
  question: string;
  answer: string;
};

export type ProfileLifestyleTag = {
  id: string;
  label: string;
};

export type UserProfile = {
  id: string;
  displayName: string;
  age: number;
  headline: string;
  bio: string;
  occupation: string;
  verified: boolean;
  photos: ProfilePhoto[];
  prompts: ProfilePrompt[];
  lifestyle: ProfileLifestyleTag[];
  neighborhoods: string[];
  maxBudget: number;
  currency: string;
  moveInDate: string;
  roommatePreference: string;
  completionPercent: number;
  missingSteps: string[];
};
