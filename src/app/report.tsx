import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { SystemState } from "@/components/system-state";
import { Text } from "@/components/text";
import { ChoiceRow, FlowCard, FlowScreen, LabeledInput } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import { REPORT_REASONS, type ReportReason } from "@/features/trust/model";
import { useI18n, type TranslationKey } from "@/i18n";
import { useTheme } from "@/theme/tokens";

const REASON_KEYS = {
  Scam: "report.reason.scam",
  Inaccurate: "report.reason.inaccurate",
  Unavailable: "report.reason.unavailable",
  Discriminatory: "report.reason.discriminatory",
  Other: "report.reason.other",
} satisfies Record<ReportReason, TranslationKey>;

export default function ReportScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const flow = useProductFlow();
  const params = useLocalSearchParams<{
    listingId?: Id<"listings"> | Id<"listings">[];
    conversationId?: Id<"conversations"> | Id<"conversations">[];
    targetLabel?: string | string[];
  }>();
  const listingId = Array.isArray(params.listingId) ? params.listingId[0] : params.listingId;
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const targetLabel = Array.isArray(params.targetLabel) ? params.targetLabel[0] : params.targetLabel;
  const [reason, setReason] = React.useState<ReportReason>("Scam");
  const [details, setDetails] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reasonOptions = REPORT_REASONS.map((value) => ({
    value,
    label: i18n.t(REASON_KEYS[value]),
  }));

  if ((!listingId && !conversationId) || !targetLabel) {
    return (
      <FlowScreen title={i18n.t("report.missingTitle")} intro={i18n.t("report.missingBody")}>
        <Button label={i18n.t("report.back")} onPress={() => router.back()} />
      </FlowScreen>
    );
  }

  if (submitted) {
    return (
      <FlowScreen title={i18n.t("report.sentTitle")} intro={i18n.t("report.sentBody")}>
        <FlowCard>
          <Text accessibilityRole="alert" selectable style={{ fontSize: 15, lineHeight: 22, color: theme.body }}>
            {i18n.t("report.thanks", {
              target: targetLabel,
              reason: i18n.t(REASON_KEYS[reason]).toLocaleLowerCase(i18n.locale),
            })}
          </Text>
          <Button label={i18n.t("report.back")} onPress={() => router.back()} />
        </FlowCard>
      </FlowScreen>
    );
  }

  const submit = async () => {
    if (submitting) return;
    if (flow.connection === "offline") {
      setError(i18n.t("report.offlineError"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (listingId) {
        await flow.submitReport({ target: { kind: "listing", listingId }, reason, details });
      } else if (conversationId) {
        await flow.submitReport({
          target: { kind: "conversation", conversationId },
          reason,
          details,
        });
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : i18n.t("report.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlowScreen title={i18n.t("report.title", { target: targetLabel })} intro={i18n.t("report.intro")}>
      {flow.connection === "offline" ? (
        <SystemState kind="offline" message={i18n.t("report.offline")} />
      ) : null}
      <ChoiceRow label={i18n.t("report.reason")} options={reasonOptions} value={reason} onChange={setReason} />
      <LabeledInput
        label={i18n.t("report.details")}
        value={details}
        onChangeText={setDetails}
        maxLength={1000}
        multiline
        hint={i18n.t("report.detailsHint", {
          count: i18n.formatNumber(details.length),
          max: i18n.formatNumber(1000),
        })}
      />
      {error ? <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>{error}</Text> : null}
      <Button
        disabled={submitting || flow.connection === "offline"}
        label={submitting ? i18n.t("report.sending") : i18n.t("report.send")}
        onPress={() => void submit()}
      />
    </FlowScreen>
  );
}
