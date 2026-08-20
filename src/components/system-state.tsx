import type { Href } from "expo-router";
import React from "react";
import { ActivityIndicator, type StyleProp, View, type ViewStyle } from "react-native";

import { AccessibleModal } from "@/components/accessible-modal";
import { Button } from "@/components/button";
import { Heading, SelectableText } from "@/components/text";
import { useI18n } from "@/i18n";
import { radius, useTheme } from "@/theme/tokens";

type StateAction =
  | { label: string; href: Href; onPress?: never; replace?: boolean }
  | { label: string; href?: never; onPress: () => void; replace?: never };

type SystemStateProps = {
  kind: "denied" | "empty" | "error" | "loading" | "offline" | "success";
  title?: string;
  message?: string;
  action?: StateAction;
  headingLevel?: 1 | 2 | 3;
  style?: StyleProp<ViewStyle>;
};

export function SystemState({ kind, title, message, action, headingLevel = 2, style }: SystemStateProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const loading = kind === "loading";
  const tone = {
    denied: { foreground: theme.warning, background: theme.warningSoft },
    empty: { foreground: theme.info, background: theme.infoSoft },
    error: { foreground: theme.danger, background: theme.dangerSoft },
    loading: { foreground: theme.info, background: theme.infoSoft },
    offline: { foreground: theme.warning, background: theme.warningSoft },
    success: { foreground: theme.success, background: theme.successSoft },
  }[kind];

  return (
    <View
      accessibilityLiveRegion={loading ? "polite" : kind === "success" || kind === "empty" ? "polite" : "assertive"}
      role={loading || kind === "success" || kind === "empty" ? "status" : "alert"}
      style={[
        {
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
          alignItems: "flex-start",
          gap: 14,
          padding: 20,
          borderRadius: radius.card,
          borderCurve: "continuous",
          backgroundColor: tone.background,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator accessibilityElementsHidden color={tone.foreground} />
      ) : (
        <View
          accessibilityElementsHidden
          style={{ width: 24, height: 5, borderRadius: radius.pill, backgroundColor: tone.foreground }}
        />
      )}
      <View style={{ minWidth: 0, gap: 6 }}>
        <Heading level={headingLevel} style={{ color: tone.foreground }}>
          {title ?? t(`state.${kind}.title`)}
        </Heading>
        <SelectableText style={{ color: theme.body, fontSize: 15, lineHeight: 22 }}>
          {message ?? t(`state.${kind}.message`)}
        </SelectableText>
      </View>
      {action ? (
        <Button {...action} variant="surface" style={{ minWidth: 140, paddingHorizontal: 18 }} />
      ) : null}
    </View>
  );
}

export function DestructiveConfirmation({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <AccessibleModal visible={visible} title={title} onRequestClose={onCancel} closeLabel={cancelLabel}>
      <SelectableText style={{ color: theme.body, fontSize: 15, lineHeight: 22 }}>{message}</SelectableText>
      <View style={{ gap: 10 }}>
        <Button
          disabled={busy}
          label={busy ? t("confirmation.destructive.busy") : confirmLabel}
          onPress={onConfirm}
          variant="destructive"
        />
        <Button disabled={busy} label={cancelLabel} onPress={onCancel} variant="surface" />
      </View>
    </AccessibleModal>
  );
}
