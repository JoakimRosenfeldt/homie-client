import { Pressable } from "react-native";

import { CountBadge } from "@/components/chip";
import { SearchIcon, SlidersIcon } from "@/components/icons";
import { Text } from "@/components/text";
import { SEARCH_SUMMARY } from "@/features/rooms/data";
import { radius, useTheme } from "@/theme/tokens";

/**
 * The saved-search summary doubles as the entry point to the filter sheet, so
 * both the field and the terracotta button open the same surface.
 */
export function SearchField({
  onPress,
  showIcon = true,
  style,
}: {
  onPress: () => void;
  showIcon?: boolean;
  style?: { flex?: number };
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit search: ${SEARCH_SUMMARY}`}
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
      <Text style={{ fontSize: 13.5, fontWeight: "500", color: theme.faint }}>{SEARCH_SUMMARY}</Text>
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
