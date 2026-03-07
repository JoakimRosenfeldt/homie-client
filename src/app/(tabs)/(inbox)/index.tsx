import { TabScreen } from "@/components/tab-screen";

export default function InboxScreen() {
  return (
    <TabScreen
      summary="Messages, updates, and important follow-ups stay organized here in a calmer, more focused view."
      sections={[
        {
          title: "Recent activity",
          description: "See the latest replies, alerts, and reminders without jumping between different parts of the app.",
        },
        {
          title: "Priority updates",
          description: "Important conversations and time-sensitive changes can sit near the top for faster action.",
        },
      ]}
    />
  );
}
