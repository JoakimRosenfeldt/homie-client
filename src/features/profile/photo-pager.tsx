import React from "react";
import { View } from "react-native";
import PagerView from "react-native-pager-view";

import type { ProfilePhotoPagerHandle, ProfilePhotoPagerProps } from "@/features/profile/photo-pager-types";

export const ProfilePhotoPager = React.forwardRef<ProfilePhotoPagerHandle, ProfilePhotoPagerProps>(
  function ProfilePhotoPager({ photos, onIndexChange, renderSlide }, ref) {
    const pagerRef = React.useRef<PagerView>(null);

    React.useImperativeHandle(
      ref,
      () => ({
        goToPage: (index: number) => {
          if (index < 0 || index >= photos.length) {
            return;
          }

          pagerRef.current?.setPage(index);
        },
      }),
      [photos.length],
    );

    return (
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        overdrag={false}
        onPageSelected={(event) => onIndexChange(event.nativeEvent.position)}>
        {photos.map((photo) => (
          <View key={photo.id} collapsable={false} style={{ flex: 1 }}>
            {renderSlide(photo)}
          </View>
        ))}
      </PagerView>
    );
  },
);
