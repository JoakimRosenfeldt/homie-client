import { router, type Href } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { useCompositeItemKeyboard, useFocusRing } from "@/components/interaction";
import { Heading, Text } from "@/components/text";
import { useI18n } from "@/i18n";
import { fontFamilyForWeight } from "@/theme/fonts";
import { radius, useTheme } from "@/theme/tokens";

export function FlowScreen({
  title,
  intro,
  children,
  backLabel,
}: React.PropsWithChildren<{ title: string; intro?: string; backLabel?: string | null }>) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();
  const backFocus = useFocusRing(theme);
  const resolvedBackLabel = backLabel === undefined ? t("common.back") : backLabel;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
          gap: 18,
          paddingHorizontal: 20,
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}>
        {resolvedBackLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={resolvedBackLabel}
            onBlur={backFocus.onBlur}
            onFocus={backFocus.onFocus}
            onPress={() => router.back()}
            style={({ pressed }) => [
              {
                minWidth: 44,
                minHeight: 44,
                alignSelf: "flex-start",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              },
              backFocus.focusStyle,
            ]}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.accent }}>‹ {resolvedBackLabel}</Text>
          </Pressable>
        ) : null}

        <View style={{ gap: 7 }}>
          <Heading level={1} style={{ fontSize: 31, lineHeight: 35, fontWeight: "800" }}>
            {title}
          </Heading>
          {intro ? (
            <Text selectable style={{ maxWidth: 580, fontSize: 14, lineHeight: 21, color: theme.muted }}>
              {intro}
            </Text>
          ) : null}
        </View>

        {children}
      </ScrollView>
    </View>
  );
}

export function FlowCard({ children, style }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          minWidth: 0,
          gap: 11,
          padding: 18,
          borderRadius: radius.card,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

type LabeledInputProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export const LabeledInput = React.forwardRef<TextInput, LabeledInputProps>(function LabeledInput(
  { label, hint, error, multiline, style, onBlur, onFocus, ...props },
  ref,
) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const inputId = React.useId();
  const labelId = `${inputId}-label`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const descriptionId = error ? errorId : hint ? hintId : undefined;
  const webAccessibility = {
    "aria-describedby": descriptionId,
    "aria-errormessage": error ? errorId : undefined,
    "aria-invalid": Boolean(error),
  };

  return (
    <View style={{ gap: 7 }}>
      <Text nativeID={labelId} style={{ fontSize: 12, fontWeight: "700", color: theme.body }}>
        {label}
      </Text>
      <TextInput
        {...webAccessibility}
        ref={ref}
        accessibilityHint={error ?? hint}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        aria-labelledby={labelId}
        multiline={multiline}
        onBlur={(event) => {
          focus.onBlur();
          onBlur?.(event);
        }}
        onFocus={(event) => {
          focus.onFocus();
          onFocus?.(event);
        }}
        placeholderTextColor={theme.faint}
        style={[
          {
            minHeight: multiline ? 92 : 48,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: radius.field,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: error ? theme.danger : theme.borderStrong,
            backgroundColor: theme.card,
            color: theme.ink,
            fontFamily: fontFamilyForWeight("500"),
            fontSize: 16,
            lineHeight: 22,
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
          focus.focusStyle,
        ]}
        {...props}
      />
      {error ? (
        <Text nativeID={errorId} role="alert" selectable style={{ fontSize: 12, lineHeight: 18, color: theme.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text nativeID={hintId} selectable style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const labelId = React.useId();
  return (
    <View
      accessibilityLabelledBy={labelId}
      accessibilityRole="radiogroup"
      aria-labelledby={labelId}
      role="radiogroup"
      style={{ gap: 8 }}>
      <Text nativeID={labelId} style={{ fontSize: 12, fontWeight: "700", color: theme.body }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option, index) => {
          const selected = option.value === value;
          const previousIndex = (index - 1 + options.length) % options.length;
          const nextIndex = (index + 1) % options.length;
          return (
            <ChoiceOption
              key={option.value}
              id={`${labelId}-option-${index}`}
              label={option.label}
              selected={selected}
              onPress={() => onChange(option.value)}
              previous={{
                id: `${labelId}-option-${previousIndex}`,
                onPress: () => onChange(options[previousIndex].value),
              }}
              next={{
                id: `${labelId}-option-${nextIndex}`,
                onPress: () => onChange(options[nextIndex].value),
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function ChoiceOption({
  id,
  label,
  selected,
  onPress,
  previous,
  next,
}: {
  id: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  previous: { id: string; onPress: () => void };
  next: { id: string; onPress: () => void };
}) {
  const theme = useTheme();
  const focus = useFocusRing(theme);
  const keyboard = useCompositeItemKeyboard({ id, selected, onPress, previous, next });

  return (
    <Pressable
      {...keyboard}
      aria-checked={selected}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 15,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? theme.accent : theme.borderStrong,
          backgroundColor: selected ? theme.accentSoft : pressed ? theme.hover : theme.card,
        },
        focus.focusStyle,
      ]}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: selected ? theme.accent : theme.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StatusBadge({ label, accent = false }: { label: string; accent?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: accent ? theme.accentSoft : theme.hover,
      }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: accent ? theme.accent : theme.body }}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?:
    | { label: string; href: Href; onPress?: never; replace?: boolean }
    | { label: string; href?: never; onPress: () => void; replace?: never };
}) {
  const theme = useTheme();
  return (
    <FlowCard style={{ paddingVertical: 30 }}>
      <Heading level={2} style={{ fontSize: 20, fontWeight: "800" }}>
        {title}
      </Heading>
      <Text selectable style={{ maxWidth: 500, fontSize: 14, lineHeight: 21, color: theme.muted }}>
        {body}
      </Text>
      {action ? <Button {...action} style={{ alignSelf: "stretch" }} /> : null}
    </FlowCard>
  );
}

export function DataRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ minWidth: 0, gap: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted }}>{label.toUpperCase()}</Text>
      <Text selectable style={{ fontSize: 15, lineHeight: 21, color: theme.ink }}>
        {value}
      </Text>
    </View>
  );
}
