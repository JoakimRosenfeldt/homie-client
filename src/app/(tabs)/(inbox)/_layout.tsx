import { Stack } from "expo-router/stack";

export default function InboxStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Inbox", headerLargeTitle: true }} />
    </Stack>
  );
}
