import React from "react";
import { ScrollView, Text, useColorScheme, View } from "react-native";

type TabScreenProps = {
  summary: string;
  sections: {
    title: string;
    description: string;
  }[];
};

export function TabScreen({ summary, sections }: TabScreenProps) {
  const isDark = useColorScheme() === "dark";

  const colors = {
    background: isDark ? "#000000" : "#F2F2F7",
    card: isDark ? "#1C1C1E" : "#FFFFFF",
    title: isDark ? "#FFFFFF" : "#111111",
    body: isDark ? "#A1A1A6" : "#6D6D72",
    border: isDark ? "#2C2C2E" : "#E5E5EA",
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
        gap: 16,
      }}>
      <Text
        selectable
        style={{
          fontSize: 17,
          lineHeight: 24,
          color: colors.body,
        }}>
        {summary}
      </Text>

      {sections.map((section) => (
        <View
          key={section.title}
          style={{
            backgroundColor: colors.card,
            borderRadius: 22,
            borderCurve: "continuous",
            padding: 18,
            gap: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Text
            selectable
            style={{
              fontSize: 20,
              lineHeight: 24,
              fontWeight: "600",
              color: colors.title,
            }}>
            {section.title}
          </Text>
          <Text
            selectable
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: colors.body,
            }}>
            {section.description}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
