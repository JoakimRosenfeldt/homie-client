import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BellIcon, HomeIcon } from "@/components/icons";
import { Text } from "@/components/text";
import { radius, useTheme } from "@/theme/tokens";

export function CreateSheet({
  visible,
  onClose,
  onNewListing,
  onNewAgent,
}: {
  visible: boolean;
  onClose: () => void;
  onNewListing: () => void;
  onNewAgent: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: theme.scrim }}>
        <Pressable accessibilityLabel="Close create menu" onPress={onClose} style={{ flex: 1 }} />

        <View
          style={{
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 32),
            borderTopLeftRadius: radius.cardLg,
            borderTopRightRadius: radius.cardLg,
            borderCurve: "continuous",
            backgroundColor: theme.background,
          }}>
          <View
            style={{
              alignSelf: "center",
              width: 38,
              height: 4,
              marginBottom: 6,
              borderRadius: radius.pill,
              backgroundColor: theme.borderStrong,
            }}
          />

          <Text style={{ paddingBottom: 4, fontSize: 24, lineHeight: 28, fontWeight: "800", color: theme.ink }}>
            What are you creating?
          </Text>

          <CreateOption
            title="A listing"
            description="Put your spare room up and start collecting applicants."
            icon={<HomeIcon color={theme.accent} />}
            onPress={onNewListing}
          />
          <CreateOption
            title="A search agent"
            description="We watch for rooms that fit and notify you the minute one appears."
            icon={<BellIcon color={theme.accent} />}
            onPress={onNewAgent}
          />
        </View>
      </View>
    </Modal>
  );
}

function CreateOption({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: theme.borderSoft,
        backgroundColor: pressed ? theme.hover : theme.card,
      })}>
      <View
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          borderCurve: "continuous",
          backgroundColor: theme.accentSoft,
        }}>
        {icon}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>{title}</Text>
        <Text style={{ fontSize: 12.5, lineHeight: 18, fontWeight: "500", color: theme.muted }}>{description}</Text>
      </View>
    </Pressable>
  );
}
