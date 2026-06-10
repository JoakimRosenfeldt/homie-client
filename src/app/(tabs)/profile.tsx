import { Text, useWindowDimensions, View } from "react-native";

import { ListingScreen, useListingColors } from "@/features/listings/components";
import {
  EditProfileButton,
  PreviewProfileButton,
  ProfileCompletionBanner,
  ProfileKeyFigure,
  ProfilePhotoCarousel,
  ProfilePill,
  ProfilePromptCard,
  VerifiedBadge,
} from "@/features/profile/components";
import { formatBudget, formatMoveInDate, formatNeighborhoods } from "@/features/profile/format";
import { getMockUserProfile } from "@/features/profile/mock-profile";

export default function ProfileScreen() {
  const colors = useListingColors();
  const profile = getMockUserProfile();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  return (
    <ListingScreen footer={<EditProfileButton />}>
      <View style={{ gap: 6, paddingTop: 8, paddingBottom: 4 }}>
        <Text
          style={{
            fontSize: 34,
            lineHeight: 39,
            fontWeight: "800",
            color: colors.title,
          }}>
          My profile
        </Text>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 22,
            color: colors.body,
          }}>
          How landlords see you when you express interest.
        </Text>
      </View>

      <ProfileCompletionBanner percent={profile.completionPercent} missingSteps={profile.missingSteps} />

      <PreviewProfileButton />

      <ProfilePhotoCarousel photos={profile.photos} displayName={profile.displayName} age={profile.age} />

      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 18,
            lineHeight: 24,
            fontWeight: "700",
            color: colors.body,
          }}>
          {profile.headline}
        </Text>
        {profile.verified ? <VerifiedBadge /> : null}
      </View>

      <View
        style={{
          flexDirection: isWide ? "row" : "column",
          gap: 12,
        }}>
        <ProfileKeyFigure label="Budget" value={formatBudget(profile.maxBudget, profile.currency)} />
        <ProfileKeyFigure label="Move-in" value={formatMoveInDate(profile.moveInDate)} />
        <ProfileKeyFigure label="Areas" value={formatNeighborhoods(profile.neighborhoods)} />
      </View>

      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 20,
            lineHeight: 25,
            fontWeight: "800",
            color: colors.title,
          }}>
          About me
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 23,
            color: colors.body,
          }}>
          {profile.bio}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: colors.body,
          }}>
          {profile.occupation}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontSize: 20,
            lineHeight: 25,
            fontWeight: "800",
            color: colors.title,
          }}>
          Lifestyle
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {profile.lifestyle.map((tag) => (
            <ProfilePill key={tag.id} label={tag.label} />
          ))}
          <ProfilePill label={profile.roommatePreference} />
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Text
          style={{
            fontSize: 20,
            lineHeight: 25,
            fontWeight: "800",
            color: colors.title,
          }}>
          Prompts
        </Text>
        {profile.prompts.map((prompt) => (
          <ProfilePromptCard key={prompt.id} prompt={prompt} />
        ))}
      </View>
    </ListingScreen>
  );
}
