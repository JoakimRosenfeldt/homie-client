import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { Button, CircleButton } from "@/components/button";
import { SoftPill } from "@/components/chip";
import { ChevronLeftIcon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { APPLICANTS } from "@/features/applicants/data";
import { useSession } from "@/features/nabo/store";
import { radius, useTheme } from "@/theme/tokens";

export default function ApplicantDetailScreen() {
  const theme = useTheme();
  const session = useSession();
  const params = useLocalSearchParams<{ applicantId?: string | string[] }>();
  const applicantId = Array.isArray(params.applicantId) ? params.applicantId[0] : params.applicantId;
  const applicant = APPLICANTS.find((candidate) => candidate.id === applicantId);

  if (!applicant) {
    return (
      <Screen contentStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: theme.ink }}>Profile not found</Text>
        <Button label="Back to applicants" onPress={() => router.back()} style={{ paddingHorizontal: 24 }} />
      </Screen>
    );
  }

  const canReview = session.topApplicant.id === applicant.id;
  const review = (shortlisted: boolean) => {
    if (!canReview) return;
    session.reviewApplicant(shortlisted);
    router.back();
  };

  return (
    <Screen contentStyle={{ gap: 18, paddingHorizontal: 20, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <CircleButton accessibilityLabel="Back" size={44} onPress={() => router.back()}>
          <ChevronLeftIcon color={theme.ink} size={20} />
        </CircleButton>
        <Text style={{ fontSize: 14, fontWeight: "700", color: theme.ink }}>Applicant profile</Text>
      </View>

      <Photo
        uri={applicant.photoUri}
        label={`${applicant.name}'s photo`}
        accessibilityLabel={`${applicant.name}'s profile photo`}
        style={{ width: "100%", height: 360, borderRadius: radius.cardLg }}>
        <View
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: theme.glass,
          }}>
          <Text style={{ fontSize: 10.5, fontWeight: "700", color: theme.accent }}>{applicant.verified}</Text>
        </View>
      </Photo>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ fontSize: 32, lineHeight: 36, fontWeight: "800", color: theme.ink }}>{applicant.name}</Text>
          <Text style={{ fontSize: 17, fontWeight: "600", color: theme.muted }}>{applicant.age}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "500", color: theme.muted }}>{applicant.role}</Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {applicant.tags.map((tag) => <SoftPill key={tag} label={tag} />)}
      </View>

      <Text style={{ fontSize: 14, lineHeight: 22, color: theme.body }}>{applicant.bio}</Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
          padding: 16,
          borderRadius: radius.card,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
        <ProfileStat label="BUDGET" value={applicant.budget} />
        <ProfileStat label="MOVE-IN" value={applicant.moveIn} />
        <ProfileStat label="STAY" value={applicant.stay} />
      </View>

      {canReview ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Pass" variant="surface" onPress={() => review(false)} style={{ flex: 1 }} />
          <Button label="Shortlist" onPress={() => review(true)} style={{ flex: 1 }} />
        </View>
      ) : null}
    </Screen>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, color: theme.faint }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.ink }}>{value}</Text>
    </View>
  );
}
