import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { SectionLabel, SelectChip } from "@/components/chip";
import { Overlay } from "@/components/screen";
import { Text } from "@/components/text";
import { useSession } from "@/features/nabo/store";
import { LISTING_FIELDS, LISTING_RULES } from "@/features/profile/data";
import { useTheme } from "@/theme/tokens";

export default function NewListingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [rules, setRules] = React.useState<Record<string, boolean>>({ "Non-smoking": true });

  const publish = () => {
    session.publishListing();
    router.back();
  };

  return (
    <Overlay>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.faint }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>New listing</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}>
        <View style={{ gap: 10 }}>
          {[0, 1].map((row) => (
            <View key={row} style={{ flexDirection: "row", gap: 10 }}>
              {[0, 1, 2].map((column) => {
                const index = row * 3 + column;
                return (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      aspectRatio: 3 / 4,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 18,
                      borderCurve: "continuous",
                      borderWidth: 1.5,
                      borderStyle: "dashed",
                      borderColor: theme.borderDashed,
                      backgroundColor: theme.card,
                    }}>
                    {index === 0 ? <Text style={{ fontSize: 12, fontWeight: "600", color: theme.faint }}>+ add</Text> : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {LISTING_FIELDS.map((field) => (
          <View
            key={field.label}
            style={{
              gap: 3,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 22,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: theme.borderSoft,
              backgroundColor: theme.card,
            }}>
            <Text style={{ fontSize: 10.5, fontWeight: "600", letterSpacing: 0.74, color: theme.faint }}>{field.label}</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.ink }}>{field.value}</Text>
          </View>
        ))}

        <View style={{ gap: 11 }}>
          <SectionLabel label="HOUSE RULES" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LISTING_RULES.map((rule) => (
              <SelectChip
                key={rule}
                label={rule}
                selected={Boolean(rules[rule])}
                onPress={() => setRules((current) => ({ ...current, [rule]: !current[rule] }))}
              />
            ))}
          </View>
        </View>

        <Text style={{ fontSize: 12.5, lineHeight: 19, fontWeight: "500", color: theme.faint }}>
          Once it is live, everyone who applies lands in your Applicants deck.
        </Text>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 14) + 12,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.card,
        }}>
        <Button label="Publish listing" onPress={publish} />
      </View>
    </Overlay>
  );
}
