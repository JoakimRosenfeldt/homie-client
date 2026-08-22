import { Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { Button } from "@/components/button";
import { SectionLabel, SelectChip } from "@/components/chip";
import { SheetModal } from "@/components/sheet-modal";
import { Slider } from "@/components/slider";
import { Text } from "@/components/text";
import {
  AVAILABILITY_MONTHS,
  RENT_RANGE,
  RENTAL_ARRANGEMENTS,
  ROOM_TYPES,
  useSession,
} from "@/features/nabo/store";
import { formatKr } from "@/features/rooms/data";
import { radius, useTheme } from "@/theme/tokens";

const HISTOGRAM_BARS = 12;
const BAR_STEP = (RENT_RANGE.max - RENT_RANGE.min) / (HISTOGRAM_BARS - 1);

export function FiltersSheet({
  visible,
  onClose,
  onCreateAgent,
  resultCount,
  rents,
}: {
  visible: boolean;
  onClose: () => void;
  onCreateAgent: () => void;
  resultCount: number;
  rents: number[];
}) {
  const theme = useTheme();
  const session = useSession();
  const { filters } = session;
  const histogram = makeRentHistogram(rents);

  return (
    <SheetModal
      visible={visible}
      onRequestClose={onClose}
      closeLabel="Close filters"
      sheetStyle={{
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
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.ink }}>{formatKr(RENT_RANGE.min)}</Text>
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
            {histogram.map((height, index) => (
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
          label="PROPERTY TYPE"
          options={ROOM_TYPES}
          isSelected={(option) => Boolean(filters.types[option])}
          onToggle={session.toggleRoomType}
        />

        <ChipGroup
          label="RENTAL ARRANGEMENT"
          options={RENTAL_ARRANGEMENTS}
          isSelected={(option) => Boolean(filters.arrangements[option])}
          onToggle={session.toggleRentalArrangement}
        />

        <ChipGroup
          label="AVAILABLE FROM"
          options={AVAILABILITY_MONTHS}
          isSelected={(option) => filters.availability === option}
          onToggle={session.setAvailability}
        />

        <Button label={`Show ${resultCount} homes`} variant="inverse" onPress={onClose} />

        {session.activeFilterCount > 0 ? (
          <Button
            label="Create agent from this search"
            variant="surface"
            onPress={() => {
              onClose();
              onCreateAgent();
            }}
          />
        ) : null}
      </ScrollView>
    </SheetModal>
  );
}

function ChipGroup<Option extends string>({
  label,
  options,
  isSelected,
  onToggle,
}: {
  label: string;
  options: readonly Option[];
  isSelected: (option: Option) => boolean;
  onToggle: (option: Option) => void;
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

function makeRentHistogram(rents: number[]) {
  const counts = Array.from({ length: HISTOGRAM_BARS }, () => 0);

  rents.forEach((rent) => {
    const position = (rent - RENT_RANGE.min) / (RENT_RANGE.max - RENT_RANGE.min);
    const index = Math.round(Math.min(1, Math.max(0, position)) * (HISTOGRAM_BARS - 1));
    counts[index] += 1;
  });

  const maximum = Math.max(...counts, 1);
  return counts.map((count) => 4 + Math.round((count / maximum) * 30));
}
