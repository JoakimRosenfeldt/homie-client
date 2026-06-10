import type React from "react";

import type { ProfilePhoto, UserProfile } from "@/features/profile/model";

export type ProfilePhotoPagerHandle = {
  goToPage: (index: number) => void;
};

export type ProfilePhotoPagerProps = {
  photos: UserProfile["photos"];
  onIndexChange: (index: number) => void;
  renderSlide: (photo: ProfilePhoto) => React.ReactNode;
};
