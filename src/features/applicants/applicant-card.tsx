import { View } from "react-native";

import { SoftPill } from "@/components/chip";
import { Photo } from "@/components/photo";
import { Text } from "@/components/text";
import type { Applicant } from "@/features/applicants/data";
import { radius, useTheme } from "@/theme/tokens";

/**
 * One person at a time, one big name — the warm counterpart to the dense,
 * face-free property cards on Explore.
 */
export function ApplicantCard({ applicant }: { applicant: Applicant }) {
  const theme = useTheme();

  return (
    <>
      <Photo
        uri={applicant.photoUri}
        label="applicant photo"
        style={{
          height: "56%",
          borderTopLeftRadius: radius.cardLg,
          borderTopRightRadius: radius.cardLg,
        }}>
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

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 16, gap: 9 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: theme.ink }}>{applicant.name}</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.muted }}>{applicant.age}</Text>
        </View>

        <Text style={{ fontSize: 12.5, fontWeight: "500", color: theme.muted }}>{applicant.role}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {applicant.tags.map((tag) => (
            <SoftPill key={tag} label={tag} />
          ))}
        </View>

        <Text numberOfLines={4} style={{ marginTop: 2, fontSize: 13, lineHeight: 20, color: theme.body }}>
          {applicant.bio}
        </Text>

        <View
          style={{
            marginTop: "auto",
            flexDirection: "row",
            gap: 16,
            paddingTop: 11,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}>
          <Stat label="BUDGET" value={applicant.budget} />
          <Stat label="MOVE-IN" value={applicant.moveIn} />
          <Stat label="STAY" value={applicant.stay} />
        </View>
      </View>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View>
      <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, color: theme.faint }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.ink }}>{value}</Text>
    </View>
  );
}
