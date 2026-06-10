import { Image } from "expo-image";
import React from "react";
import {
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Pressable as GesturePressable } from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";

import { useListingColors } from "@/features/listings/components";
import type { ProfilePhoto, ProfilePrompt, UserProfile } from "@/features/profile/model";

function ProfilePhotoSlide({
  photo,
  canGoPrevious,
  canGoNext,
  onTapPrevious,
  onTapNext,
}: {
  photo: ProfilePhoto;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onTapPrevious: () => void;
  onTapNext: () => void;
}) {
  return (
    <View style={{ flex: 1, width: "100%", height: "100%" }}>
      <Image
        source={photo.url}
        contentFit="cover"
        transition={180}
        style={{ width: "100%", height: "100%" }}
      />

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          flexDirection: "row",
        }}>
        <GesturePressable
          accessibilityRole="button"
          accessibilityLabel="Previous photo"
          accessibilityState={{ disabled: !canGoPrevious }}
          disabled={!canGoPrevious}
          onPress={onTapPrevious}
          style={{ flex: 1 }}
        />
        <GesturePressable
          accessibilityRole="button"
          accessibilityLabel="Next photo"
          accessibilityState={{ disabled: !canGoNext }}
          disabled={!canGoNext}
          onPress={onTapNext}
          style={{ flex: 1 }}
        />
      </View>

      {photo.caption ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            borderRadius: 999,
            borderCurve: "continuous",
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 17,
              fontWeight: "700",
              color: "#FFFFFF",
            }}>
            {photo.caption}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type ProfilePhotoPagerHandle = {
  goToPage: (index: number) => void;
};

const ProfilePhotoPager = React.forwardRef<
  ProfilePhotoPagerHandle,
  {
    photos: UserProfile["photos"];
    activeIndex: number;
    onIndexChange: (index: number) => void;
    onTapPrevious: () => void;
    onTapNext: () => void;
  }
>(function ProfilePhotoPager({ photos, activeIndex, onIndexChange, onTapPrevious, onTapNext }, ref) {
  const pagerRef = React.useRef<PagerView>(null);
  const listRef = React.useRef<FlatList<ProfilePhoto>>(null);
  const [pageWidth, setPageWidth] = React.useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);

    if (nextWidth > 0 && nextWidth !== pageWidth) {
      setPageWidth(nextWidth);
    }
  };

  React.useImperativeHandle(
    ref,
    () => ({
      goToPage: (index: number) => {
        if (index < 0 || index >= photos.length) {
          return;
        }

        if (Platform.OS === "web") {
          listRef.current?.scrollToIndex({ index, animated: true });
          onIndexChange(index);
          return;
        }

        pagerRef.current?.setPage(index);
      },
    }),
    [onIndexChange, photos.length],
  );

  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < photos.length - 1;

  const slideProps = {
    canGoPrevious,
    canGoNext,
    onTapPrevious,
    onTapNext,
  };

  const pagerContent =
    Platform.OS === "web" ? (
      pageWidth > 0 ? (
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="normal"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(photo) => photo.id}
          getItemLayout={(_, index) => ({
            length: pageWidth,
            offset: pageWidth * index,
            index,
          })}
          onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
            onIndexChange(nextIndex);
          }}
          onScrollToIndexFailed={() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }}
          renderItem={({ item }) => (
            <View style={{ width: pageWidth, height: "100%" }}>
              <ProfilePhotoSlide photo={item} {...slideProps} />
            </View>
          )}
          style={{ flex: 1 }}
        />
      ) : null
    ) : (
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        overdrag={false}
        onPageSelected={(event) => onIndexChange(event.nativeEvent.position)}>
        {photos.map((photo) => (
          <View key={photo.id} collapsable={false} style={{ flex: 1 }}>
            <ProfilePhotoSlide photo={photo} {...slideProps} />
          </View>
        ))}
      </PagerView>
    );

  return (
    <View style={{ flex: 1 }} onLayout={handleLayout}>
      {pagerContent}
    </View>
  );
});

function ProfilePhotoIndicators({
  photos,
  activeIndex,
}: {
  photos: UserProfile["photos"];
  activeIndex: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        top: 14,
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
      }}>
      {photos.map((photo, index) => (
        <View
          key={photo.id}
          style={{
            width: index === activeIndex ? 18 : 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: index === activeIndex ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)",
          }}
        />
      ))}
    </View>
  );
}

export function ProfilePhotoCarousel({
  photos,
  displayName,
  age,
}: {
  photos: UserProfile["photos"];
  displayName: string;
  age: number;
}) {
  const colors = useListingColors();
  const pagerRef = React.useRef<ProfilePhotoPagerHandle>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const goToPreviousPhoto = () => {
    if (activeIndex <= 0) {
      return;
    }

    pagerRef.current?.goToPage(activeIndex - 1);
  };

  const goToNextPhoto = () => {
    if (activeIndex >= photos.length - 1) {
      return;
    }

    pagerRef.current?.goToPage(activeIndex + 1);
  };

  if (photos.length === 0) {
    return (
      <View
        style={{
          width: "100%",
          aspectRatio: 0.75,
          borderRadius: 24,
          borderCurve: "continuous",
          backgroundColor: colors.cardSecondary,
          alignItems: "center",
          justifyContent: "center",
        }}>
        <Text style={{ fontSize: 15, color: colors.body }}>
          Add photos to stand out
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          width: "100%",
          aspectRatio: 0.75,
          overflow: "hidden",
          borderRadius: 24,
          borderCurve: "continuous",
          backgroundColor: colors.cardSecondary,
        }}>
        <ProfilePhotoPager
          ref={pagerRef}
          photos={photos}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
          onTapPrevious={goToPreviousPhoto}
          onTapNext={goToNextPhoto}
        />
        <ProfilePhotoIndicators photos={photos} activeIndex={activeIndex} />
      </View>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text
            style={{
              fontSize: 30,
              lineHeight: 36,
              fontWeight: "800",
              color: colors.title,
            }}>
            {displayName}
          </Text>
          <Text
            style={{
              fontSize: 26,
              lineHeight: 32,
              fontWeight: "600",
              color: colors.title,
            }}>
            {age}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ProfileCompletionBanner({
  percent,
  missingSteps,
}: {
  percent: number;
  missingSteps: string[];
}) {
  const colors = useListingColors();

  if (percent >= 100) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Profile ${percent} percent complete`}
      onPress={() => {}}
      style={({ pressed }) => ({
        borderRadius: 20,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.accent,
        backgroundColor: colors.accentSoft,
        padding: 16,
        gap: 10,
        opacity: pressed ? 0.88 : 1,
      })}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 20,
            fontWeight: "800",
            color: colors.title,
          }}>
          Complete your profile
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 20,
            fontWeight: "800",
            color: colors.accent,
          }}>
          {percent}%
        </Text>
      </View>

      <View
        style={{
          height: 6,
          borderRadius: 999,
          backgroundColor: colors.border,
          overflow: "hidden",
        }}>
        <View
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor: colors.accent,
          }}
        />
      </View>

      {missingSteps.length > 0 ? (
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: colors.body,
          }}>
          Next up: {missingSteps[0]}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ProfileKeyFigure({ label, value }: { label: string; value: string }) {
  const colors = useListingColors();

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 14,
        gap: 4,
      }}>
      <Text
        style={{
          fontSize: 13,
          lineHeight: 17,
          color: colors.body,
        }}>
        {label}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          fontSize: 17,
          lineHeight: 22,
          fontWeight: "800",
          color: colors.title,
        }}>
        {value}
      </Text>
    </View>
  );
}

export function ProfilePill({ label }: { label: string }) {
  const colors = useListingColors();

  return (
    <View
      style={{
        borderRadius: 999,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}>
      <Text
        style={{
          fontSize: 13,
          lineHeight: 16,
          fontWeight: "700",
          color: colors.title,
        }}>
        {label}
      </Text>
    </View>
  );
}

export function ProfilePromptCard({ prompt }: { prompt: ProfilePrompt }) {
  const colors = useListingColors();

  return (
    <View
      style={{
        borderRadius: 22,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 18,
        gap: 10,
      }}>
      <Text
        style={{
          fontSize: 14,
          lineHeight: 19,
          fontWeight: "700",
          color: colors.accent,
        }}>
        {prompt.question}
      </Text>
      <Text
        style={{
          fontSize: 18,
          lineHeight: 26,
          fontWeight: "800",
          color: colors.title,
        }}>
        {prompt.answer}
      </Text>
    </View>
  );
}

export function VerifiedBadge() {
  const colors = useListingColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        borderRadius: 999,
        borderCurve: "continuous",
        backgroundColor: colors.accentSoft,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}>
      <Text style={{ fontSize: 13, lineHeight: 16, fontWeight: "800", color: colors.accent }}>
        Verified tenant
      </Text>
    </View>
  );
}

export function EditProfileButton({ onPress }: { onPress?: () => void }) {
  const colors = useListingColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit profile"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 58,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: colors.accent,
        opacity: pressed ? 0.84 : 1,
      })}>
      <Text
        style={{
          fontSize: 17,
          lineHeight: 22,
          fontWeight: "800",
          color: "#FFFFFF",
        }}>
        Edit profile
      </Text>
    </Pressable>
  );
}

export function PreviewProfileButton({ onPress }: { onPress?: () => void }) {
  const colors = useListingColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Preview profile as landlords see it"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 58,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        opacity: pressed ? 0.84 : 1,
      })}>
      <Text
        style={{
          fontSize: 17,
          lineHeight: 22,
          fontWeight: "800",
          color: colors.title,
        }}>
        Preview as landlord
      </Text>
    </Pressable>
  );
}
