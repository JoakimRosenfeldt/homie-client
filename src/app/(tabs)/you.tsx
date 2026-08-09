import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/photo";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { OWNER_PROFILE, PROFILE_SETTINGS } from "@/features/profile/data";
import { radius, useTheme } from "@/theme/tokens";

export default function YouScreen() {
  const theme = useTheme();

  return (
    <Screen paddingHorizontal={20} contentStyle={{ gap: 16 }}>
      <Text style={{ paddingTop: 10, fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
        Your profile
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 18,
          backgroundColor: theme.card,
          borderRadius: radius.card,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: theme.border,
        }}>
        <Avatar uri={OWNER_PROFILE.photoUri} size={64} />
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: theme.ink }}>{OWNER_PROFILE.name}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: "500", color: theme.muted }}>{OWNER_PROFILE.subtitle}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Profile strength ${OWNER_PROFILE.strengthPercent} percent. Tap to edit your profile.`}
        onPress={() => router.push("/onboarding")}
        style={({ pressed }) => ({
          gap: 6,
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderRadius: radius.card,
          borderCurve: "continuous",
          backgroundColor: theme.accentSoft,
          opacity: pressed ? 0.9 : 1,
        })}>
        <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.88, color: theme.accent }}>
          PROFILE STRENGTH · {OWNER_PROFILE.strengthPercent}% · TAP TO EDIT
        </Text>

        <View style={{ height: 6, borderRadius: 99, backgroundColor: theme.accentTrack, overflow: "hidden" }}>
          <View style={{ width: `${OWNER_PROFILE.strengthPercent}%`, height: 6, backgroundColor: theme.accent }} />
        </View>

        <Text style={{ fontSize: 12, lineHeight: 18, fontWeight: "500", color: theme.accent }}>
          {OWNER_PROFILE.strengthHint}
        </Text>
      </Pressable>

      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: radius.card,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: theme.border,
          overflow: "hidden",
        }}>
        {PROFILE_SETTINGS.map((setting, index) => (
          <View
            key={setting.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 18,
              paddingVertical: 15,
              borderBottomWidth: index === PROFILE_SETTINGS.length - 1 ? 0 : 1,
              borderBottomColor: theme.divider,
            }}>
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: theme.ink }}>{setting.label}</Text>
            <Text style={{ fontSize: 12.5, fontWeight: "500", color: theme.faint }}>{setting.value}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
