import { TabScreen } from "@/components/tab-screen";

export default function ExploreScreen() {
  return (
    <TabScreen
      summary="Browse a feed of people, places, and opportunities tailored to your next move."
      sections={[
        {
          title: "New agents",
          description: "Fresh assistants and specialists surface here first, with room to compare what each one is best at.",
        },
        {
          title: "Featured listings",
          description: "A curated shortlist keeps the most relevant listings close without making the screen feel busy.",
        },
      ]}
    />
  );
}
