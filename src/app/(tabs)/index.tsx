import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { PillButton } from "@/components/button";
import { SoftPill } from "@/components/chip";
import { DiamondIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useSession } from "@/features/nabo/store";
import { RESULT_COUNT, ROOMS, SEARCH_CHIPS } from "@/features/rooms/data";
import { ExploreMap } from "@/features/rooms/explore-map";
import { FiltersSheet } from "@/features/rooms/filters-sheet";
import { RoomCard } from "@/features/rooms/room-card";
import { FilterButton, SearchField } from "@/features/rooms/search-field";
import { useTheme } from "@/theme/tokens";

export default function ExploreScreen() {
  const theme = useTheme();
  const session = useSession();
  const [mapVisible, setMapVisible] = React.useState(false);
  const [filtersVisible, setFiltersVisible] = React.useState(false);

  const openRoom = (roomId: string) => router.push(`/rooms/${roomId}`);
  const openFilters = () => setFiltersVisible(true);

  if (mapVisible) {
    return (
      <>
        <ExploreMap onOpenFilters={openFilters} onShowList={() => setMapVisible(false)} onOpenRoom={openRoom} />
        <FiltersSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
      </>
    );
  }

  return (
    <>
      <Screen contentStyle={{ gap: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 4,
            gap: 12,
          }}>
          <Text style={{ flex: 1, fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
            {"Rooms in\nKøbenhavn"}
          </Text>
          <PillButton
            label="Map"
            onPress={() => setMapVisible(true)}
            icon={<DiamondIcon color={theme.accent} />}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 9, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
          <SearchField onPress={openFilters} />
          <FilterButton onPress={openFilters} count={session.activeFilterCount} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14 }}>
          {SEARCH_CHIPS.map((chip) => (
            <SoftPill key={chip} label={chip} size="sm" />
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingBottom: 10,
          }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.muted }}>{RESULT_COUNT} rooms</Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.accent }}>Newest first</Text>
        </View>

        <View style={{ gap: 14, paddingHorizontal: 20 }}>
          {ROOMS.map((room) => (
            <RoomCard key={room.id} room={room} onPress={() => openRoom(room.id)} />
          ))}
        </View>
      </Screen>

      <FiltersSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
    </>
  );
}
