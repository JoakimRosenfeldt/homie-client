import { TabScreen } from "@/components/tab-screen";

export default function ProfileScreen() {
  return (
    <TabScreen
      summary="Your preferences, personal details, and activity all live here with a more native account-style layout."
      sections={[
        {
          title: "Account",
          description: "Review personal information, connected services, and the details tied to your presence in the app.",
        },
        {
          title: "Preferences",
          description: "Adjust the experience around notifications, saved content, and how the app works for you day to day.",
        },
      ]}
    />
  );
}
