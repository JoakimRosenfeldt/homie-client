import { TabScreen } from "@/components/tab-screen";

export default function SavedScreen() {
  return (
    <TabScreen
      summary="Keep your top picks nearby so it is easy to come back, compare, and decide later."
      sections={[
        {
          title: "Pinned agents",
          description: "Save the assistants you want to return to when you are ready to start a task or conversation.",
        },
        {
          title: "Bookmarked listings",
          description: "Collect standout listings in one place before you follow up or share them with someone else.",
        },
      ]}
    />
  );
}
