import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { useFocusRing } from "@/components/interaction";
import { Screen } from "@/components/screen";
import { SystemState } from "@/components/system-state";
import { Text } from "@/components/text";
import { applicationStatusCopy, type Application } from "@/features/applications/model";
import { EmptyState, FlowCard, StatusBadge } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export default function ApplicationsScreen() {
  const theme = useTheme();
  const flow = useProductFlow();
  const { t } = useI18n();

  if (flow.applicationsUnavailableOffline) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="offline" message={t("applications.offlineLoad")} />
      </Screen>
    );
  }

  if (flow.loading) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="loading" message={t("applications.loading")} />
      </Screen>
    );
  }

  if (flow.identityError) {
    return (
      <Screen paddingHorizontal={20} contentStyle={{ justifyContent: "center" }}>
        <SystemState kind="denied" title={t("applications.unavailable")} message={flow.identityError} />
      </Screen>
    );
  }

  return (
    <Screen paddingHorizontal={20} contentStyle={{ gap: 16 }}>
      <View style={{ gap: 6, paddingTop: 10 }}>
        <Text accessibilityRole="header" selectable style={{ fontSize: 32, lineHeight: 35, fontWeight: "800", color: theme.ink }}>
          {t("applications.title")}
        </Text>
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
          {t("applications.intro")}
        </Text>
      </View>

      {flow.connection === "offline" ? (
        <SystemState kind="offline" message={t("applications.offline")} />
      ) : null}

      {flow.applications.length === 0 ? (
        <EmptyState
          title={t("applications.emptyTitle")}
          body={t("applications.emptyBody")}
          action={{ label: t("applications.explore"), href: "/" }}
        />
      ) : flow.applications.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </Screen>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const i18n = useI18n();
  const status = applicationStatusCopy(application.status, i18n.t);

  return (
    <Link
      href={{
        pathname: "/applications/[applicationId]",
        params: { applicationId: application.id },
      }}
      asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={i18n.t("applications.openLabel", {
          listing: application.listingTitle,
          status: status.label,
        })}
        onBlur={focus.onBlur}
        onFocus={focus.onFocus}
        style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }, focus.focusStyle]}>
        <FlowCard>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <Text selectable style={{ fontSize: 18, lineHeight: 23, fontWeight: "800", color: theme.ink }}>
                {application.listingTitle}
              </Text>
              <Text selectable style={{ fontSize: 12, color: theme.muted }}>
                {i18n.t("applications.sent", {
                  date: i18n.formatDate(application.submittedAt, { dateStyle: "medium" }),
                })}
              </Text>
              {application.listingLocation ? (
                <Text selectable numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>
                  {application.listingLocation}
                </Text>
              ) : null}
            </View>
            <StatusBadge label={status.label} accent={status.tone === "accent"} />
          </View>
          <Text selectable style={{ fontSize: 14, lineHeight: 20, color: theme.body }}>
            {status.detail}
          </Text>
        </FlowCard>
      </Pressable>
    </Link>
  );
}
