import React from "react";

import { Button } from "@/components/button";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { DataRow, FlowCard, FlowScreen } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

type DeletePhase = "review" | "confirm" | "deleting" | "success";

export default function DeleteDataScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const flow = useProductFlow();
  const [phase, setPhase] = React.useState<DeletePhase>("review");
  const [error, setError] = React.useState<string | null>(null);

  const remove = async () => {
    if (phase === "deleting") return;
    if (flow.connection === "offline") {
      setError(i18n.t("deleteData.offlineError"));
      return;
    }

    setPhase("deleting");
    setError(null);
    try {
      await flow.deleteMyData();
      setPhase("success");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : i18n.t("deleteData.submitError"));
      setPhase("confirm");
    }
  };

  if (flow.coldOffline && phase !== "success") {
    return (
      <FlowScreen title={i18n.t("deleteData.title")}>
        <SystemState kind="offline" message={i18n.t("deleteData.reconnect")} />
      </FlowScreen>
    );
  }

  if (flow.loading && phase !== "success") {
    return (
      <FlowScreen title={i18n.t("deleteData.title")}>
        <SystemState kind="loading" message={i18n.t("deleteData.loading")} />
      </FlowScreen>
    );
  }

  if (phase === "success") {
    return (
      <FlowScreen
        title={i18n.t("deleteData.startedTitle")}
        intro={i18n.t("deleteData.startedBody")}
        backLabel={null}>
        <Button label={i18n.t("deleteData.returnExplore")} href="/" replace />
      </FlowScreen>
    );
  }

  return (
    <FlowScreen title={i18n.t("deleteData.title")} intro={i18n.t("deleteData.intro")}>
      {flow.connection === "offline" ? (
        <SystemState kind="offline" message={i18n.t("deleteData.connectionRequired")} />
      ) : null}

      <FlowCard>
        <DataRow
          label={i18n.t("deleteData.profile")}
          value={flow.profile
            ? i18n.t("deleteData.profile.one", { count: i18n.formatNumber(1) })
            : i18n.t("deleteData.profile.none")}
        />
        <DataRow label={i18n.t("deleteData.applications")} value={i18n.formatNumber(flow.applications.length)} />
        <DataRow label={i18n.t("deleteData.conversations")} value={i18n.formatNumber(flow.conversations.length)} />
        <DataRow label={i18n.t("deleteData.hostedListings")} value={i18n.formatNumber(flow.hostListings.length)} />
      </FlowCard>

      <FlowCard>
        <Heading level={2} style={{ fontSize: 18, fontWeight: "800" }}>
          {i18n.t("deleteData.warningTitle")}
        </Heading>
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: theme.muted }}>
          {i18n.t("deleteData.warningBody")}
        </Text>

        {phase === "review" ? <Button label={i18n.t("deleteData.continue")} variant="surface" onPress={() => setPhase("confirm")} /> : null}
        {phase === "confirm" ? (
          <>
            <Button label={i18n.t("common.cancel")} variant="surface" onPress={() => setPhase("review")} />
            <Button
              disabled={flow.connection === "offline"}
              label={i18n.t("deleteData.permanent")}
              variant="destructive"
              onPress={() => void remove()}
            />
          </>
        ) : null}
        {phase === "deleting" ? (
          <SystemState kind="loading" message={i18n.t("deleteData.deleting")} />
        ) : null}
        {error ? <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>{error}</Text> : null}
      </FlowCard>
    </FlowScreen>
  );
}
