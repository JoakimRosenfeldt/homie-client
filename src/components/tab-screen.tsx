import React from "react";
import { ScrollView, Text, useColorScheme, View } from "react-native";

import { getHomieColors, homieRadii, homieSpacing } from "@/theme/homie";
import { homieType } from "@/theme/typography";

type TabScreenProps = {
  summary: string;
  sections: {
    title: string;
    description: string;
  }[];
};

export function TabScreen({ summary, sections }: TabScreenProps) {
  const isDark = useColorScheme() === "dark";
  const colors = getHomieColors(isDark ? "dark" : "light");

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: homieSpacing.page,
        paddingTop: homieSpacing.page,
        paddingBottom: 32,
        gap: homieSpacing.section,
      }}>
      <Text selectable style={[homieType.body, { fontSize: 17, lineHeight: 24, color: colors.body }]}>{summary}</Text>

      {sections.map((section) => (
        <View
          key={section.title}
          style={{
            backgroundColor: colors.card,
            borderRadius: homieRadii.card,
            borderCurve: "continuous",
            padding: 18,
            gap: 8,
            borderWidth: 0,
          }}>
          <Text selectable style={[homieType.headlineSection, { fontSize: 20, lineHeight: 24, color: colors.title }]}>
            {section.title}
          </Text>
          <Text selectable style={[homieType.body, { color: colors.body }]}>{section.description}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
