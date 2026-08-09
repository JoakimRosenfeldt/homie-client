import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { BellIcon } from "@/components/icons";
import { Avatar } from "@/components/photo";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useSession } from "@/features/nabo/store";
import { OWNER_PROFILE, PROFILE_SETTINGS } from "@/features/profile/data";
import { radius, useTheme } from "@/theme/tokens";

export default function YouScreen() {
  const theme = useTheme();
  const session = useSession();

  return (
    <Screen paddingHorizontal={20} contentStyle={{ gap: 0 }}>
      <Text style={{ paddingTop: 10, paddingBottom: 16, fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
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
          marginTop: 16,
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
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginTop: 22,
        }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>Search agents</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/search-agent")} hitSlop={8}>
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: theme.accent }}>+ New agent</Text>
        </Pressable>
      </View>

      <View style={{ gap: 10, marginTop: 10 }}>
        {session.agents.map((agent, index) => (
          <View
            key={`${agent.name}-${index}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: radius.card,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}>
            <View
              style={{
                width: 38,
                height: 38,
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                borderCurve: "continuous",
                backgroundColor: theme.accentSoft,
              }}>
              <BellIcon color={theme.accent} size={17} />
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "600", color: theme.ink }}>
                {agent.name}
              </Text>
              <Text style={{ fontSize: 11.5, fontWeight: "500", color: theme.faint }}>{agent.meta}</Text>
            </View>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor: agent.hits ? theme.accent : theme.hover,
              }}>
              <Text style={{ fontSize: 10.5, fontWeight: "700", color: agent.hits ? theme.onAccent : theme.muted }}>
                {agent.hits ? `${agent.hits} new` : "Watching"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: 16,
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
