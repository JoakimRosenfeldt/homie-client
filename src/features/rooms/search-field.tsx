import { Pressable } from "react-native";

import { CountBadge } from "@/components/chip";
import { SearchIcon, SlidersIcon } from "@/components/icons";
import { Text } from "@/components/text";
import { radius, useTheme } from "@/theme/tokens";

/**
 * The saved-search summary doubles as the entry point to the filter sheet, so
 * both the field and the terracotta button open the same surface.
 */
export function SearchField({
  onPress,
  summary,
  showIcon = true,
  style,
}: {
  onPress: () => void;
  summary: string;
  showIcon?: boolean;
  style?: { flex?: number };
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit search: ${summary}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: style?.flex ?? 1,
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 14,
        borderRadius: radius.field,
        borderCurve: "continuous",
        backgroundColor: pressed ? theme.hover : theme.card,
        borderWidth: 1,
        borderColor: theme.borderSoft,
      })}>
      {showIcon ? <SearchIcon color={theme.faint} /> : null}
      <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "500", color: theme.faint }}>
        {summary}
      </Text>
    </Pressable>
  );
}

export function FilterButton({ onPress, count }: { onPress: () => void; count: number }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filters, ${count} active`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.field,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.accentPressed : theme.accent,
      })}>
      <SlidersIcon color={theme.onAccent} />
      <CountBadge count={count} />
    </Pressable>
  );
}
