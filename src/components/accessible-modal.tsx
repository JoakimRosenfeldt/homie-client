import React from "react";
import { Modal, type ModalProps, type StyleProp, View, type ViewStyle } from "react-native";

import { CircleButton } from "@/components/button";
import { CloseIcon } from "@/components/icons";
import { Heading, SelectableText } from "@/components/text";
import { useI18n } from "@/i18n";
import { radius, useTheme } from "@/theme/tokens";

const useIsomorphicLayoutEffect =
  process.env.EXPO_OS === "web" && typeof window !== "undefined"
    ? React.useLayoutEffect
    : React.useEffect;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true",
  );
}

type AccessibleModalProps = React.PropsWithChildren<{
  visible: boolean;
  title: string;
  onRequestClose: () => void;
  description?: string;
  closeLabel?: string;
  presentation?: "dialog" | "sheet";
  animationType?: ModalProps["animationType"];
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AccessibleModal({
  visible,
  title,
  onRequestClose,
  description,
  closeLabel,
  presentation = "dialog",
  animationType = presentation === "sheet" ? "slide" : "fade",
  contentStyle,
  children,
}: AccessibleModalProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const dialogId = React.useId();
  const sheet = presentation === "sheet";
  const closeCallback = React.useRef(onRequestClose);
  const trigger = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    closeCallback.current = onRequestClose;
  }, [onRequestClose]);

  useIsomorphicLayoutEffect(() => {
    if (process.env.EXPO_OS !== "web" || !visible || typeof document === "undefined") {
      return;
    }

    const dialog = document.getElementById(dialogId);
    if (!dialog) return;

    if (document.activeElement instanceof HTMLElement && !dialog.contains(document.activeElement)) {
      trigger.current = document.activeElement;
    }

    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert ?? false;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden") ?? null;
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }

    const focusable = getFocusableElements(dialog);
    (focusable[0] ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const elements = getFocusableElements(dialog);
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeCallback.current();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      if (appRoot) {
        appRoot.inert = previousInert;
        if (previousAriaHidden === null) appRoot.removeAttribute("aria-hidden");
        else appRoot.setAttribute("aria-hidden", previousAriaHidden);
      }
    };
  }, [dialogId, visible]);

  const restoreTrigger = React.useCallback(() => {
    if (process.env.EXPO_OS !== "web") return;
    const element = trigger.current;
    trigger.current = null;
    if (element?.isConnected) element.focus();
  }, []);

  return (
    <Modal
      animationType={animationType}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal
      onDismiss={restoreTrigger}
      onRequestClose={onRequestClose}
      role="dialog"
      statusBarTranslucent
      transparent
      visible={visible}>
      <View
        accessibilityViewIsModal
        importantForAccessibility="yes"
        onAccessibilityEscape={onRequestClose}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: sheet ? "flex-end" : "center",
          padding: sheet ? 0 : 20,
          backgroundColor: theme.scrim,
        }}>
        <View
          nativeID={dialogId}
          tabIndex={-1}
          style={[
            {
              width: "100%",
              maxWidth: sheet ? 760 : 520,
              maxHeight: "90%",
              gap: 20,
              padding: 20,
              paddingBottom: sheet ? 28 : 20,
              borderTopLeftRadius: sheet ? radius.sheet : radius.card,
              borderTopRightRadius: sheet ? radius.sheet : radius.card,
              borderBottomLeftRadius: sheet ? 0 : radius.card,
              borderBottomRightRadius: sheet ? 0 : radius.card,
              borderCurve: "continuous",
              backgroundColor: theme.card,
            },
            contentStyle,
          ]}>
          <View style={{ minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ minWidth: 0, flex: 1, gap: 6 }}>
              <Heading nativeID={titleId} level={2} style={{ fontSize: 22, lineHeight: 27 }}>
                {title}
              </Heading>
              {description ? (
                <SelectableText nativeID={descriptionId} style={{ color: theme.muted, fontSize: 15, lineHeight: 22 }}>
                  {description}
                </SelectableText>
              ) : null}
            </View>
            <CircleButton
              accessibilityLabel={closeLabel ?? t("common.close")}
              onPress={onRequestClose}
              size={44}>
              <CloseIcon color={theme.ink} size={17} />
            </CircleButton>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
