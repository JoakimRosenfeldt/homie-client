import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import { BellIcon } from "@/components/icons";
import { Avatar } from "@/components/photo";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useProductFlow } from "@/features/applications/store";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import { useSession } from "@/features/nabo/store";
import { requestProfilePushRegistration } from "@/features/notifications";
import { OWNER_PROFILE } from "@/features/profile/data";
import { radius, useTheme } from "@/theme/tokens";

export default function YouScreen() {
  const theme = useTheme();
  const session = useSession();
  const flow = useProductFlow();
  const identity = useDeviceIdentity();
  const savedSearches = useQuery(
    api.savedSearches.listMine,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const pushStatus = useQuery(
    api.savedSearches.getPushStatus,
    identity.kind === "ready" ? { ownerKey: identity.ownerKey } : "skip",
  );
  const registerPushToken = useMutation(api.savedSearches.registerPushToken);
  const [enablingNotifications, setEnablingNotifications] = React.useState(false);
  const agents = savedSearches?.length
    ? savedSearches.map((search) => ({
        id: search._id,
        name: search.name,
        meta: [
          search.area ?? "Any area",
          search.maximumRent ? `up to ${search.maximumRent.toLocaleString("da-DK")} kr` : "any rent",
        ].join(" · "),
        hits: 0,
      }))
    : session.agents.map((agent) => ({ ...agent, id: undefined }));
  const enableNotifications = async () => {
    if (pushStatus?.hasGrantedToken) {
      session.notify("Push notifications are already enabled.");
      return;
    }
    if (identity.kind !== "ready" || enablingNotifications) return;

    setEnablingNotifications(true);
    try {
      const result = await requestProfilePushRegistration({ ownerKey: identity.ownerKey, choice: "enable" });
      if (result.kind === "register") {
        await registerPushToken(result.registration);
        session.notify("Push notifications enabled.");
      } else {
        session.notify("Push notifications are unavailable on this device.");
      }
    } catch (error) {
      session.notify(readableBackendError(error));
    } finally {
      setEnablingNotifications(false);
    }
  };
  const settings = [
    {
      label: "Your listings",
      value: flow.hostListings.length ? `${flow.hostListings.length} active` : "Create or manage",
      onPress: () => router.push("/host"),
    },
    {
      label: "Your applications",
      value: flow.applications.length ? `${flow.applications.length} active` : "View activity",
      onPress: () => router.push("/applications"),
    },
    { label: "Profile details", value: "Edit", onPress: () => router.push("/profile") },
    {
      label: "Notifications",
      value: enablingNotifications ? "Enabling…" : pushStatus?.hasGrantedToken ? "Push on" : "Tap to enable",
      onPress: () => void enableNotifications(),
    },
  ];

  return (
    <Screen paddingHorizontal={20} contentStyle={{ gap: 0 }}>
      <Text style={{ paddingTop: 10, paddingBottom: 16, fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
        Your profile
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit your profile"
        onPress={() => router.push("/profile")}
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
        <Avatar size={64} />
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: theme.ink }}>{OWNER_PROFILE.name}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: "500", color: theme.muted }}>{OWNER_PROFILE.subtitle}</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Profile strength ${OWNER_PROFILE.strengthPercent} percent. Tap to edit your profile.`}
        onPress={() => router.push("/profile")}
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
        {agents.map((agent, index) => (
          <Pressable
            key={`${agent.name}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Edit search agent ${agent.name}`}
            onPress={() =>
              router.push({
                pathname: "/search-agent",
                params: agent.id ? { savedSearchId: agent.id } : {},
              })
            }
            style={({ pressed }) => ({
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
              opacity: pressed ? 0.86 : 1,
            })}>
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
          </Pressable>
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
        {settings.map((setting, index) => (
          <Pressable
            key={setting.label}
            accessibilityRole="button"
            accessibilityLabel={`${setting.label}. ${setting.value}`}
            onPress={setting.onPress}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 18,
              paddingVertical: 15,
              borderBottomWidth: index === settings.length - 1 ? 0 : 1,
              borderBottomColor: theme.divider,
              backgroundColor: pressed ? theme.hover : theme.card,
            })}>
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: theme.ink }}>{setting.label}</Text>
            <Text style={{ fontSize: 12.5, fontWeight: "500", color: theme.faint }}>{setting.value}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
