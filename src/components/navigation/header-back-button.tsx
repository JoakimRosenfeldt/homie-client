import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

export function HeaderBackButton({
  fallbackHref,
  accessibilityLabel = "Back",
}: {
  fallbackHref: string;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace(fallbackHref as never);
      }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
      })}>
      <View
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 18,
        }}>
        <Image
          source="sf:chevron.left"
          style={{
            width: 15,
            height: 15,
            tintColor: theme.colors.primary,
          }}
        />
      </View>
    </Pressable>
  );
}

