import { Stack } from "expo-router";

export default function ListingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="new/index" options={{ title: "New Listing" }} />
      <Stack.Screen name="new/[listingId]/basics" options={{ title: "Listing Basics" }} />
      <Stack.Screen name="new/[listingId]/details" options={{ title: "Rental Details" }} />
      <Stack.Screen name="new/[listingId]/features" options={{ title: "Features" }} />
      <Stack.Screen name="new/[listingId]/location" options={{ title: "Location" }} />
      <Stack.Screen name="new/[listingId]/photos" options={{ title: "Photos" }} />
      <Stack.Screen name="new/[listingId]/review" options={{ title: "Review & Publish" }} />
      <Stack.Screen name="[listingId]" options={{ title: "Listing" }} />
    </Stack>
  );
}
