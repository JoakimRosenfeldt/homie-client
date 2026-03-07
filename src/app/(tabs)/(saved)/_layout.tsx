import { Stack } from "expo-router/stack";

export default function SavedStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Saved", headerLargeTitle: true }} />
    </Stack>
  );
}
