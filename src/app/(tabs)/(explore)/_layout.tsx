import { Stack } from "expo-router/stack";

export default function ExploreStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Explore", headerLargeTitle: true }} />
    </Stack>
  );
}
