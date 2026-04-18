import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";

import {
  LISTING_AMENITY_OPTIONS,
  LISTING_STEP_META,
  type ListingCompletionItem,
  type ListingExploreItem,
  type ListingMineItem,
  type ListingStepKey,
} from "@/features/listings/model";
import {
  formatCurrency,
  formatDate,
  formatSize,
  getAmenityLabel,
  getAvailabilityLabel,
  getPropertyTypeLabel,
  getRentalArrangementLabel,
} from "@/features/listings/format";
import { getListingDetailRoute } from "@/features/listings/navigation";
import { getHomieColors, homieAmbientShadow, homieRadii, homieSpacing } from "@/theme/homie";
import { homieFontFamily, homieType } from "@/theme/typography";

export function useListingColors() {
  const isDark = useColorScheme() === "dark";
  return getHomieColors(isDark ? "dark" : "light");
}

export function ListingScreen({
  children,
  footer,
}: React.PropsWithChildren<{ footer?: React.ReactNode }>) {
  const colors = useListingColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{
          alignSelf: "center",
          width: "100%",
          maxWidth: 980,
          paddingHorizontal: isWide ? 28 : homieSpacing.page,
          paddingTop: homieSpacing.page,
          paddingBottom: footer ? 124 : 40,
          gap: homieSpacing.section,
        }}>
        {children}
      </ScrollView>

      {footer ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: isWide ? 28 : homieSpacing.page,
            paddingTop: 12,
            paddingBottom: 20,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 980 }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: React.PropsWithChildren<{
  title?: string;
  description?: string;
}>) {
  const colors = useListingColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: homieRadii.card,
        borderCurve: "continuous",
        padding: 18,
        gap: 14,
        borderWidth: 0,
      }}>
      {title ? (
        <View style={{ gap: 4 }}>
          <Text selectable style={[homieType.headlineSection, { fontSize: 20, lineHeight: 24, color: colors.title }]}>
            {title}
          </Text>
          {description ? (
            <Text selectable style={[homieType.bodySmall, { color: colors.body }]}>{description}</Text>
          ) : null}
        </View>
      ) : null}

      {children}
    </View>
  );
}

export function MessageCard({
  title,
  description,
  tone = "default",
  actionLabel,
  onActionPress,
}: {
  title: string;
  description: string;
  tone?: "default" | "warning" | "danger" | "success";
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  const colors = useListingColors();
  const accent =
    tone === "danger" ? colors.danger : tone === "warning" ? colors.warning : tone === "success" ? colors.success : colors.accent;
  const edgeColor = tone === "default" ? colors.border : accent;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: homieRadii.card,
        borderCurve: "continuous",
        padding: 16,
        gap: 10,
        borderLeftWidth: 4,
        borderLeftColor: edgeColor,
      }}>
      <Text selectable style={[homieType.headlineCard, { color: colors.title }]}>{title}</Text>
      <Text selectable style={[homieType.bodySmall, { color: colors.body }]}>{description}</Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress}>
          <Text
            selectable
            style={{
              fontSize: 14,
              lineHeight: 18,
              fontWeight: "700",
              color: accent,
            }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadingCard({ label }: { label: string }) {
  const colors = useListingColors();

  return (
    <SectionCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <ActivityIndicator color={colors.accent} />
        <Text
          selectable
          style={{
            fontSize: 15,
            lineHeight: 20,
            color: colors.body,
          }}>
          {label}
        </Text>
      </View>
    </SectionCard>
  );
}

export function StepProgress({
  currentStep,
  completedSteps,
}: {
  currentStep: ListingStepKey;
  completedSteps: string[];
}) {
  const colors = useListingColors();

  return (
    <SectionCard>
      <View style={{ gap: 10 }}>
        <Text
          selectable
          style={{
            fontSize: 13,
            lineHeight: 16,
            fontWeight: "700",
            textTransform: "uppercase",
            color: colors.body,
          }}>
          Listing draft
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LISTING_STEP_META.map((step, index) => {
            const isCurrent = step.key === currentStep;
            const isComplete = completedSteps.includes(step.key);
            return (
              <View
                key={step.key}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: homieRadii.full,
                  borderCurve: "continuous",
                  backgroundColor: isCurrent ? colors.accent : isComplete ? colors.accentSoft : colors.cardSecondary,
                  borderWidth: 0,
                }}>
                <Text
                  selectable
                  style={{
                    fontSize: 13,
                    lineHeight: 16,
                    fontWeight: "700",
                    color: isCurrent ? colors.onAccent : colors.title,
                  }}>
                  {index + 1}. {step.shortTitle}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </SectionCard>
  );
}

export function ResponsiveColumns({ children }: React.PropsWithChildren) {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const items = React.Children.toArray(children);

  return (
    <View style={{ flexDirection: isWide ? "row" : "column", gap: 12 }}>
      {items.map((child, index) => (
        <View key={index} style={{ flex: 1, minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

function FieldLabel({
  label,
  helperText,
  required,
}: {
  label: string;
  helperText?: string;
  required?: boolean;
}) {
  const colors = useListingColors();

  return (
    <View style={{ gap: 4 }}>
      <Text
        selectable
        style={{
          fontSize: 15,
          lineHeight: 20,
          fontWeight: "700",
          color: colors.title,
        }}>
        {label}
        {required ? " *" : ""}
      </Text>
      {helperText ? (
        <Text
          selectable
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: colors.body,
          }}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  required,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "number-pad";
}) {
  const colors = useListingColors();

  return (
    <View style={{ gap: 8 }}>
      <FieldLabel label={label} helperText={helperText} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.body}
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          minHeight: multiline ? 132 : 54,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 16 : 14,
          textAlignVertical: multiline ? "top" : "center",
          borderRadius: homieRadii.control,
          borderCurve: "continuous",
          borderWidth: 0,
          color: colors.title,
          backgroundColor: colors.cardSecondary,
          fontSize: 16,
          lineHeight: 22,
        }}
      />
    </View>
  );
}

export function ToggleField({
  label,
  helperText,
  value,
  onValueChange,
}: {
  label: string;
  helperText: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const colors = useListingColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: homieRadii.control,
        borderCurve: "continuous",
        borderWidth: 0,
        backgroundColor: colors.cardSecondary,
      }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          selectable
          style={{
            fontSize: 15,
            lineHeight: 20,
            fontWeight: "700",
            color: colors.title,
          }}>
          {label}
        </Text>
        <Text
          selectable
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: colors.body,
          }}>
          {helperText}
        </Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function ChoiceGrid<TValue extends string>({
  options,
  selectedValue,
  onSelect,
}: {
  options: readonly { value: TValue; label: string; description?: string }[];
  selectedValue?: TValue;
  onSelect: (value: TValue) => void;
}) {
  const colors = useListingColors();

  return (
    <View style={{ gap: 10 }}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={{
              borderRadius: homieRadii.control,
              borderCurve: "continuous",
              borderWidth: 0,
              backgroundColor: isSelected ? colors.accentSoft : colors.cardSecondary,
              padding: 16,
              gap: 4,
            }}>
            <Text
              selectable
              style={{
                fontSize: 15,
                lineHeight: 20,
                fontWeight: "700",
                color: colors.title,
              }}>
              {option.label}
            </Text>
            {option.description ? (
              <Text
                selectable
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  color: colors.body,
                }}>
                {option.description}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function AmenityGrid({
  selectedAmenities,
  onToggle,
}: {
  selectedAmenities: string[];
  onToggle: (amenity: string) => void;
}) {
  const colors = useListingColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {LISTING_AMENITY_OPTIONS.map((amenity) => {
        const isSelected = selectedAmenities.includes(amenity.value);
        return (
          <Pressable
            key={amenity.value}
            onPress={() => onToggle(amenity.value)}
            style={{
              width: isWide ? "48.8%" : "100%",
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderRadius: homieRadii.control,
              borderCurve: "continuous",
              borderWidth: 0,
              backgroundColor: isSelected ? colors.accentSoft : colors.cardSecondary,
            }}>
            <Text
              selectable
              style={{
                fontSize: 15,
                lineHeight: 20,
                fontWeight: "700",
                color: colors.title,
              }}>
              {amenity.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  helperText,
  required,
}: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
  helperText?: string;
  required?: boolean;
}) {
  const colors = useListingColors();
  const [isOpen, setIsOpen] = useState(false);
  const parsed = value ? new Date(value) : new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setIsOpen(false);
      return;
    }

    if (selectedDate) {
      onChange(selectedDate.toISOString().slice(0, 10));
    }

    setIsOpen(false);
  };

  return (
    <View style={{ gap: 8 }}>
      <FieldLabel label={label} helperText={helperText} required={required} />
      <Pressable
        onPress={() => setIsOpen(true)}
        style={{
          minHeight: 54,
          justifyContent: "center",
          paddingHorizontal: 16,
          borderRadius: homieRadii.control,
          borderCurve: "continuous",
          borderWidth: 0,
          backgroundColor: colors.cardSecondary,
        }}>
        <Text
          selectable
          style={{
            fontSize: 16,
            lineHeight: 22,
            color: value ? colors.title : colors.body,
          }}>
          {value ? formatDate(value) : "Choose a date"}
        </Text>
      </Pressable>
      {isOpen ? <DateTimePicker value={parsed} mode="date" onChange={handleChange} /> : null}
    </View>
  );
}

export function FooterActions({
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  primaryDisabled,
  secondaryDisabled,
}: {
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
}) {
  const colors = useListingColors();

  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {secondaryLabel && onSecondaryPress ? (
        <Pressable
          disabled={secondaryDisabled}
          onPress={onSecondaryPress}
          style={{
            flex: 1,
            minHeight: 54,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: homieRadii.control,
            borderCurve: "continuous",
            backgroundColor: colors.cardSecondary,
            borderWidth: 0,
            opacity: secondaryDisabled ? 0.5 : 1,
          }}>
          <Text
            selectable
            style={{
              fontSize: 16,
              lineHeight: 20,
              fontWeight: "700",
              color: colors.title,
            }}>
            {secondaryLabel}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        disabled={primaryDisabled}
        onPress={onPrimaryPress}
        style={{
          flex: 1.2,
          minHeight: 54,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: homieRadii.control,
          borderCurve: "continuous",
          backgroundColor: colors.accent,
          opacity: primaryDisabled ? 0.45 : 1,
        }}>
        <Text
          selectable
          style={{
            fontSize: 16,
            lineHeight: 20,
            fontWeight: "700",
            color: colors.onAccent,
          }}>
          {primaryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function ChecklistCard({
  checklist,
}: {
  checklist: ListingCompletionItem[];
}) {
  const colors = useListingColors();

  return (
    <SectionCard title="Publish checklist" description="Publish is blocked until every required field is complete.">
      <View style={{ gap: 10 }}>
        {checklist.map((item) => (
          <View
            key={`${item.step}-${item.key}`}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: homieRadii.control,
              borderCurve: "continuous",
              backgroundColor: colors.cardSecondary,
            }}>
            <View
              style={{
                marginTop: 2,
                width: 18,
                height: 18,
                borderRadius: homieRadii.full,
                backgroundColor: item.complete ? colors.success : colors.border,
              }}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                selectable
                style={{
                  fontSize: 15,
                  lineHeight: 20,
                  fontWeight: "700",
                  color: colors.title,
                }}>
                {item.label}
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  color: colors.body,
                }}>
                {item.complete ? "Ready" : `Finish this in ${item.step}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

export function ListingSummaryCard({
  listing,
  action,
}: {
  listing: ListingMineItem;
  action?: React.ReactNode;
}) {
  const colors = useListingColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: homieRadii.card,
        borderCurve: "continuous",
        padding: 16,
        gap: 12,
        borderWidth: 0,
        boxShadow: colors.isDark ? homieAmbientShadow.dark : homieAmbientShadow.light,
      }}>
      {listing.coverUrl ? (
        <Image
          source={listing.coverUrl}
          contentFit="cover"
          style={{
            width: "100%",
            aspectRatio: 1.6,
            borderRadius: homieRadii.control,
            backgroundColor: colors.cardSecondary,
          }}
        />
      ) : null}

      <View style={{ gap: 4 }}>
        <Text
          selectable
          numberOfLines={2}
          style={{
            fontSize: 18,
            lineHeight: 22,
            fontWeight: "700",
            color: colors.title,
          }}>
          {listing.title.trim() || "Untitled listing"}
        </Text>
        <Text
          selectable
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: colors.body,
          }}>
          {formatCurrency(listing.monthlyRent, listing.currency)} · {listing.publicLocationLabel ?? "Private location"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Tag label={listing.status === "draft" ? "Draft" : "Published"} />
        <Tag label={`${listing.photoCount} photo${listing.photoCount === 1 ? "" : "s"}`} />
        <Tag label={`Edited ${formatDate(new Date(listing.lastEditedAt).toISOString().slice(0, 10))}`} />
      </View>

      {action ? <View style={{ alignItems: "flex-start" }}>{action}</View> : null}
    </View>
  );
}

export function PublicListingCard({
  listing,
  isSaved = false,
  isSavePending = false,
  isSaveDisabled = false,
  onToggleSaved,
}: {
  listing: ListingExploreItem;
  isSaved?: boolean;
  isSavePending?: boolean;
  isSaveDisabled?: boolean;
  onToggleSaved?: () => void;
}) {
  const colors = useListingColors();
  const rentLabel =
    typeof listing.monthlyRent === "number" ? `${formatCurrency(listing.monthlyRent, listing.currency)}/mo` : "Rent TBD";

  return (
    <Pressable
      onPress={() => router.push(getListingDetailRoute(listing._id) as never)}
      style={{ gap: 14 }}>
      <View
        style={{
          borderRadius: homieRadii.card,
          borderCurve: "continuous",
          overflow: "hidden",
          backgroundColor: colors.cardSecondary,
          boxShadow: colors.isDark ? homieAmbientShadow.dark : homieAmbientShadow.light,
        }}>
        <View style={{ width: "100%", aspectRatio: 16 / 9 }}>
          {listing.coverUrl ? (
            <Image source={listing.coverUrl} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.cardSecondary }]} />
          )}

          {typeof listing.monthlyRent === "number" ? (
            <View
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                borderCurve: "continuous",
                backgroundColor: colors.accent,
              }}>
              <Text
                style={{
                  fontFamily: homieFontFamily.bodyBold,
                  fontSize: 14,
                  lineHeight: 18,
                  color: colors.onAccent,
                }}>
                {rentLabel}
              </Text>
            </View>
          ) : null}

          {onToggleSaved ? (
            <View style={{ position: "absolute", top: 12, right: 12 }} pointerEvents="box-none">
              <ListingSaveButton
                variant="icon"
                isSaved={isSaved}
                isPending={isSavePending}
                disabled={isSaveDisabled}
                onPress={(event) => {
                  event.stopPropagation();
                  onToggleSaved();
                }}
              />
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: 4, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <Text
            selectable
            numberOfLines={2}
            style={[homieType.headlineCard, { flex: 1, color: colors.title }]}>
            {listing.title.trim() || "Untitled listing"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Image source="sf:location.fill" style={{ width: 16, height: 16, tintColor: colors.body }} />
          <Text selectable numberOfLines={2} style={[homieType.bodySmall, { flex: 1, color: colors.body }]}>
            {listing.publicLocationLabel ?? "Location coming soon"}
          </Text>
        </View>

        {listing.summary?.trim() ? (
          <Text selectable numberOfLines={2} style={[homieType.bodySmall, { color: colors.body }]}>
            {listing.summary.trim()}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: homieSpacing.chip }}>
          <Tag label={getPropertyTypeLabel(listing.propertyType)} />
          <Tag label={getRentalArrangementLabel(listing.rentalArrangement)} />
          <Tag label={getAvailabilityLabel(listing)} />
          <Tag label={`${listing.photoCount} photo${listing.photoCount === 1 ? "" : "s"}`} />
        </View>

        {typeof listing.sizeSqm === "number" ? (
          <Text selectable style={[homieType.caption, { color: colors.title }]}>
            {formatSize(listing.sizeSqm)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ListingSaveButton({
  isSaved,
  isPending = false,
  disabled = false,
  onPress,
  variant = "pill",
  style,
}: {
  isSaved: boolean;
  isPending?: boolean;
  disabled?: boolean;
  onPress: (event: GestureResponderEvent) => void;
  variant?: "pill" | "icon";
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useListingColors();

  if (variant === "icon") {
    return (
      <Pressable
        disabled={isPending || disabled}
        onPress={onPress}
        hitSlop={12}
        style={[
          {
            width: 44,
            height: 44,
            borderRadius: 22,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.22)",
            opacity: isPending || disabled ? 0.55 : 1,
          },
          style,
        ]}>
        {isPending ? (
          <ActivityIndicator color={colors.onAccent} size="small" />
        ) : (
          <Image
            source={isSaved ? "sf:heart.fill" : "sf:heart"}
            style={{ width: 22, height: 22, tintColor: colors.onAccent }}
          />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isPending || disabled}
      onPress={onPress}
      style={[
        {
          minHeight: 40,
          minWidth: 78,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 14,
          borderRadius: homieRadii.full,
          borderCurve: "continuous",
          borderWidth: 0,
          backgroundColor: isSaved ? colors.secondarySoft : colors.cardSecondary,
          opacity: isPending || disabled ? 0.6 : 1,
        },
        style,
      ]}>
      <Text
        selectable
        style={[
          homieType.label,
          {
            color: isSaved ? colors.secondary : colors.title,
          },
        ]}>
        {isPending ? "Saving..." : isSaved ? "Saved" : "Save"}
      </Text>
    </Pressable>
  );
}

export function Tag({ label }: { label: string }) {
  const colors = useListingColors();

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: homieRadii.full,
        borderCurve: "continuous",
        backgroundColor: colors.secondarySoft,
        borderWidth: 0,
      }}>
      <Text selectable style={[homieType.label, { fontSize: 11, letterSpacing: 0.3, color: colors.secondary }]}>
        {label}
      </Text>
    </View>
  );
}

export function PhotoTile({
  url,
  label,
  actions,
}: {
  url?: string | null;
  label: string;
  actions?: React.ReactNode;
}) {
  const colors = useListingColors();

  return (
    <View
      style={{
        gap: 10,
        padding: 12,
        borderRadius: homieRadii.control,
        borderCurve: "continuous",
        backgroundColor: colors.cardSecondary,
        borderWidth: 0,
      }}>
      <View
        style={{
          width: "100%",
          aspectRatio: 1.15,
          borderRadius: 16,
          borderCurve: "continuous",
          overflow: "hidden",
          backgroundColor: colors.border,
        }}>
        {url ? <Image source={url} contentFit="cover" style={{ flex: 1 }} /> : null}
      </View>
      <Text
        selectable
        style={{
          fontSize: 14,
          lineHeight: 18,
          fontWeight: "700",
          color: colors.title,
        }}>
        {label}
      </Text>
      {actions}
    </View>
  );
}

export function MiniButton({
  label,
  onPress,
  tone = "default",
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  const colors = useListingColors();
  const textColor = tone === "danger" ? colors.danger : colors.accent;

  return (
    <Pressable disabled={disabled} onPress={onPress}>
      <Text
        selectable
        style={{
          fontSize: 13,
          lineHeight: 18,
          fontWeight: "700",
          color: disabled ? colors.body : textColor,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const colors = useListingColors();

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        padding: 14,
        borderRadius: homieRadii.control,
        borderCurve: "continuous",
        backgroundColor: colors.cardSecondary,
      }}>
      <Text
        selectable
        style={{
          fontSize: 12,
          lineHeight: 16,
          fontWeight: "700",
          textTransform: "uppercase",
          color: colors.body,
        }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          marginTop: 6,
          fontSize: 17,
          lineHeight: 22,
          fontWeight: "700",
          color: colors.title,
        }}>
        {value}
      </Text>
    </View>
  );
}

export function AmenityTags({
  amenities,
}: {
  amenities: (
    | "parking"
    | "laundry"
    | "dishwasher"
    | "balcony"
    | "elevator"
    | "internetIncluded"
    | "petsAllowed"
    | "smokingAllowed"
  )[];
}) {
  if (amenities.length === 0) {
    return null;
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {amenities.map((amenity) => (
        <Tag key={amenity} label={getAmenityLabel(amenity)} />
      ))}
    </View>
  );
}
