import { View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { ChoiceRow, DataRow, FlowCard, StatusBadge } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import { useI18n, type Locale } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export default function YouScreen() {
  const theme = useTheme();
  const flow = useProductFlow();
  const i18n = useI18n();
  const pendingHostApplicants = flow.hostApplicants.filter((applicant) => applicant.status === "pending").length;
  const languageOptions: readonly { value: Locale; label: string }[] = [
    { value: "en", label: i18n.t("you.english") },
    { value: "da", label: i18n.t("you.danish") },
  ];
  const listingCount = i18n.formatNumber(flow.hostListings.length);
  const applicantCount = i18n.formatNumber(pendingHostApplicants);
  const hostingSummaryKey = flow.hostListings.length === 1
    ? "you.hostingSummary.one"
    : "you.hostingSummary.other";

  if (flow.coldOffline) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState headingLevel={1} kind="offline" />
      </Screen>
    );
  }

  if (flow.loading) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState headingLevel={1} kind="loading" message={i18n.t("you.loading")} />
      </Screen>
    );
  }

  return (
    <Screen paddingHorizontal={20} contentStyle={{ gap: 16 }}>
      <View style={{ gap: 6, paddingTop: 10 }}>
        <Heading level={1} style={{ fontSize: 32, lineHeight: 35, fontWeight: "800" }}>
          {i18n.t("you.title")}
        </Heading>
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
          {i18n.t("you.intro")}
        </Text>
      </View>

      <FlowCard>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Heading level={2} style={{ fontSize: 19, fontWeight: "800" }}>
            {i18n.t("you.profileTitle")}
          </Heading>
          <StatusBadge label={flow.profile ? i18n.t("you.ready") : i18n.t("you.notCreated")} accent={Boolean(flow.profile)} />
        </View>
        {flow.profile ? (
          <>
            {flow.profile.kind === "sharedHome" ? <DataRow label={i18n.t("you.name")} value={flow.profile.name} /> : null}
            <DataRow
              label={i18n.t("you.profileType")}
              value={flow.profile.kind === "sharedHome" ? i18n.t("you.sharedHome") : i18n.t("you.privateRental")}
            />
          </>
        ) : (
          <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
            {i18n.t("you.noProfile")}
          </Text>
        )}
        <Button
          label={flow.profile ? i18n.t("you.editProfile") : i18n.t("you.createProfile")}
          variant="surface"
          href="/profile"
        />
      </FlowCard>

      <FlowCard>
        <Heading level={2} style={{ fontSize: 19, fontWeight: "800" }}>
          {i18n.t("you.hosting")}
        </Heading>
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
          {i18n.t(hostingSummaryKey, { listings: listingCount, applicants: applicantCount })}
        </Text>
        <Button label={i18n.t("you.openHostDashboard")} href="/host" />
      </FlowCard>

      <FlowCard>
        <Heading level={2} style={{ fontSize: 19, fontWeight: "800" }}>
          {i18n.t("you.language")}
        </Heading>
        <ChoiceRow label={i18n.t("you.interfaceLanguage")} options={languageOptions} value={i18n.locale} onChange={i18n.setLocale} />
        <Text selectable style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
          {i18n.localeOverride ? i18n.t("you.manualLanguage") : i18n.t("you.deviceLanguage")}
        </Text>
        {i18n.localeOverride ? <Button label={i18n.t("you.useDeviceLanguage")} variant="surface" onPress={i18n.useDeviceLocale} /> : null}
      </FlowCard>

      <FlowCard>
        <Heading level={2} style={{ fontSize: 19, fontWeight: "800" }}>
          {i18n.t("you.privacyTitle")}
        </Heading>
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
          {i18n.t("you.privacyBody")}
        </Text>
        <Button label={i18n.t("you.deleteData")} variant="surface" href="/delete-data" />
      </FlowCard>
    </Screen>
  );
}
