import React from "react";
import {
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from "react-native";

import type { ProfilePhoto } from "@/features/profile/model";
import type { ProfilePhotoPagerHandle, ProfilePhotoPagerProps } from "@/features/profile/photo-pager-types";

export const ProfilePhotoPager = React.forwardRef<ProfilePhotoPagerHandle, ProfilePhotoPagerProps>(
  function ProfilePhotoPager({ photos, onIndexChange, renderSlide }, ref) {
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

          listRef.current?.scrollToIndex({ index, animated: true });
          onIndexChange(index);
        },
      }),
      [onIndexChange, photos.length],
    );

    return (
      <View style={{ flex: 1 }} onLayout={handleLayout}>
        {pageWidth > 0 ? (
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
              <View style={{ width: pageWidth, height: "100%" }}>{renderSlide(item)}</View>
            )}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    );
  },
);
