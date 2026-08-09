import { Modal, Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { Button } from "@/components/button";
import { SectionLabel, SelectChip } from "@/components/chip";
import { Slider } from "@/components/slider";
import { Text } from "@/components/text";
import {
  HOUSE_RULES,
  MOVE_IN_DATES,
  RENT_HISTOGRAM,
  RENT_RANGE,
  ROOM_TYPES,
  useSession,
} from "@/features/nabo/store";
import { formatKr, RESULT_COUNT } from "@/features/rooms/data";
import { radius, useTheme } from "@/theme/tokens";

/** Rent covered by one histogram bar, so bars can light up with the slider. */
const BAR_STEP = 700;

export function FiltersSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const session = useSession();
  const { filters } = session;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.scrim, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel="Close filters" onPress={onClose} style={{ flex: 1 }} />

        <View
          style={{
            maxHeight: "88%",
            backgroundColor: theme.background,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            borderCurve: "continuous",
          }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}>
            <Pressable accessibilityRole="button" onPress={session.resetFilters}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.faint }}>Reset</Text>
            </Pressable>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.ink }}>Filters</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.accent }}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30, gap: 22 }}>
            <View style={{ gap: 11 }}>
              <SectionLabel label="MONTHLY RENT" />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>{formatKr(3500)}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>{formatKr(filters.maxRent)}</Text>
              </View>

              <Slider
                accessibilityLabel="Maximum monthly rent"
                min={RENT_RANGE.min}
                max={RENT_RANGE.max}
                step={RENT_RANGE.step}
                value={filters.maxRent}
                onChange={session.setMaxRent}
              />

              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 34 }}>
                {RENT_HISTOGRAM.map((height, index) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 2,
                      backgroundColor:
                        RENT_RANGE.min + index * BAR_STEP <= filters.maxRent ? theme.accent : theme.borderStrong,
                    }}
                  />
                ))}
              </View>
            </View>

            <ChipGroup
              label="ROOM TYPE"
              options={ROOM_TYPES}
              isSelected={(option) => Boolean(filters.types[option])}
              onToggle={session.toggleRoomType}
            />

            <ChipGroup
              label="FLATMATES & HOUSE RULES"
              options={HOUSE_RULES}
              isSelected={(option) => Boolean(filters.rules[option])}
              onToggle={session.toggleHouseRule}
            />

            <ChipGroup
              label="MOVE-IN"
              options={MOVE_IN_DATES}
              isSelected={(option) => filters.moveIn === option}
              onToggle={session.setMoveIn}
            />

            <Button label={`Show ${RESULT_COUNT} rooms`} variant="inverse" onPress={onClose} />

            <Text style={{ textAlign: "center", fontSize: 12.5, fontWeight: "600", color: theme.accent }}>
              Save this search &amp; alert me
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ChipGroup({
  label,
  options,
  isSelected,
  onToggle,
}: {
  label: string;
  options: string[];
  isSelected: (option: string) => boolean;
  onToggle: (option: string) => void;
}) {
  return (
    <View style={{ gap: 11 }}>
      <SectionLabel label={label} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => (
          <SelectChip key={option} label={option} selected={isSelected(option)} onPress={() => onToggle(option)} />
        ))}
      </View>
    </View>
  );
}
