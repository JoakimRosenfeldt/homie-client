import { Stack } from "expo-router/stack";

export default function ProfileStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Profile", headerLargeTitle: true }} />
    </Stack>
  );
}
