export type Applicant = {
  id: string;
  name: string;
  age: number;
  role: string;
  verified: string;
  tags: string[];
  bio: string;
  budget: string;
  moveIn: string;
  stay: string;
  photoUri?: string;
  /** Whether shortlisting this applicant produces a mutual match. */
  match: boolean;
};

export const APPLICANTS: Applicant[] = [
  {
    id: "a1",
    name: "Amir",
    age: 26,
    role: "Junior architect at Cobe",
    verified: "ID + income verified",
    tags: ["Tidy", "Cooks a lot", "Non-smoker"],
    bio: "Moving from Aarhus for work. I keep normal hours, cook most evenings and would happily take over the plant situation.",
    budget: "5.000–6.000",
    moveIn: "1 Sep",
    stay: "1+ year",
    photoUri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
    match: true,
  },
  {
    id: "a2",
    name: "Freja",
    age: 23,
    role: "MSc student, KU",
    verified: "Student verified",
    tags: ["Quiet", "Home late", "Has a cat"],
    bio: "Third year of my masters, mostly at the library. I have a very calm cat called Sild who sleeps 20 hours a day.",
    budget: "4.500–5.500",
    moveIn: "15 Aug",
    stay: "2 years",
    photoUri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    match: false,
  },
  {
    id: "a3",
    name: "Jonas",
    age: 29,
    role: "Nurse, Rigshospitalet",
    verified: "ID + income verified",
    tags: ["Shift work", "Social", "Non-smoker"],
    bio: "Nights every other week, so the flat gets a quiet flatmate half the month. I am the one who fixes things.",
    budget: "5.500–6.500",
    moveIn: "1 Sep",
    stay: "1 year",
    photoUri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    match: true,
  },
  {
    id: "a4",
    name: "Wei",
    age: 31,
    role: "Product designer, freelance",
    verified: "ID verified",
    tags: ["Works from home", "Vegetarian", "Tidy"],
    bio: "Home three days a week with headphones on. Previous flatmates can vouch — happy to share references.",
    budget: "6.000–7.000",
    moveIn: "1 Oct",
    stay: "6 months+",
    photoUri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
    match: false,
  },
];

/** Outstanding applications on the user's own listing, shown on the tab badge. */
export const OPEN_APPLICATION_COUNT = 12;
