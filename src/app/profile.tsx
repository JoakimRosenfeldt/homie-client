import { useMutation } from "convex/react";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { TextInput, View } from "react-native";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { Photo } from "@/components/photo";
import { SystemState } from "@/components/system-state";
import { Heading, Text } from "@/components/text";
import { ChoiceRow, FlowCard, FlowScreen, LabeledInput } from "@/features/applications/flow-ui";
import { useProductFlow } from "@/features/applications/store";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import { requestProfilePushRegistration } from "@/features/notifications";
import {
  buildProfile,
  profileToDraft,
  validateProfileDraft,
  type ProfileDraft,
  type ProfilePhoto,
  type ProfileValidationField,
} from "@/features/profile/model";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/tokens";

type PushChoice = "enable" | "skip";
type PushWarning = { title: string; message: string };

function isStorageUploadResult(value: unknown): value is { storageId: Id<"_storage"> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "storageId" in value &&
    typeof value.storageId === "string" &&
    value.storageId.length > 0
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const flow = useProductFlow();
  const identity = useDeviceIdentity();
  const registerPushToken = useMutation(api.savedSearches.registerPushToken);
  const generatePhotoUploadUrl = useMutation(api.profiles.generatePhotoUploadUrl);
  const attachPhoto = useMutation(api.profiles.attachPhoto);
  const discardPhotoUpload = useMutation(api.profiles.discardPhotoUpload);
  const removePhoto = useMutation(api.profiles.removePhoto);
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const [draft, setDraft] = React.useState(() => profileToDraft(null));
  const [pushChoice, setPushChoice] = React.useState<PushChoice>("skip");
  const [pushWarning, setPushWarning] = React.useState<PushWarning | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [errorField, setErrorField] = React.useState<ProfileValidationField | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [removingPhotoId, setRemovingPhotoId] = React.useState<Id<"_storage"> | null>(null);
  const initialProfile = React.useRef<typeof flow.profile | undefined>(undefined);
  const nameInput = React.useRef<TextInput>(null);
  const occupationInput = React.useRef<TextInput>(null);
  const moveInDateInput = React.useRef<TextInput>(null);
  const introductionInput = React.useRef<TextInput>(null);
  const expectedStayInput = React.useRef<TextInput>(null);
  const monthlyBudgetInput = React.useRef<TextInput>(null);
  const habitsInput = React.useRef<TextInput>(null);
  const householdSizeInput = React.useRef<TextInput>(null);

  const profileOptions: readonly { value: ProfileDraft["kind"]; label: string }[] = [
    { value: "sharedHome", label: i18n.t("profile.sharedHome") },
    { value: "privateRental", label: i18n.t("profile.privateRental") },
  ];
  const pushOptions: readonly { value: PushChoice; label: string }[] = [
    { value: "enable", label: i18n.t("profile.pushEnable") },
    { value: "skip", label: i18n.t("profile.pushSkip") },
  ];

  React.useEffect(() => {
    if (flow.loading || initialProfile.current !== undefined) return;
    initialProfile.current = flow.profile;
    setDraft(profileToDraft(flow.profile));
  }, [flow.loading, flow.profile]);

  const setDraftField = <Field extends keyof ProfileDraft,>(
    field: Field,
    value: ProfileDraft[Field],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errorField === field || field === "kind") {
      setError(null);
      setErrorField(null);
    }
  };

  const focusField = (field: ProfileValidationField) => {
    switch (field) {
      case "name":
        nameInput.current?.focus();
        break;
      case "occupation":
        occupationInput.current?.focus();
        break;
      case "moveInDate":
        moveInDateInput.current?.focus();
        break;
      case "introduction":
        introductionInput.current?.focus();
        break;
      case "expectedStay":
        expectedStayInput.current?.focus();
        break;
      case "monthlyBudget":
        monthlyBudgetInput.current?.focus();
        break;
      case "habits":
        habitsInput.current?.focus();
        break;
      case "householdSize":
        householdSizeInput.current?.focus();
        break;
    }
  };

  if (flow.profileUnavailableOffline && initialProfile.current === undefined) {
    return (
      <FlowScreen title={i18n.t("profile.title")}>
        <SystemState kind="offline" message={i18n.t("profile.offlineLoad")} />
      </FlowScreen>
    );
  }

  if (flow.loading || initialProfile.current === undefined) {
    return (
      <FlowScreen title={i18n.t("profile.title")}>
        <SystemState kind="loading" message={i18n.t("profile.loading")} />
      </FlowScreen>
    );
  }

  if (flow.identityError) {
    return (
      <FlowScreen title={i18n.t("profile.title")}>
        <SystemState
          kind="denied"
          title={i18n.t("profile.identityUnavailable")}
          message={flow.identityError}
        />
      </FlowScreen>
    );
  }

  const onboarding = initialProfile.current === null;

  const finish = () => {
    if (roomId) router.replace(`/apply/${roomId}`);
    else router.back();
  };

  const uploadPhoto = async () => {
    if (
      identity.kind !== "ready" ||
      uploadingPhoto ||
      draft.kind !== "sharedHome" ||
      draft.photos.length >= 6
    ) {
      return;
    }
    setUploadingPhoto(true);
    setError(null);
    setErrorField(null);
    let uploadToDiscard: {
      uploadSessionId: Id<"fileUploads">;
      storageId: Id<"_storage">;
    } | null = null;
    try {
      if (process.env.EXPO_OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(i18n.t("profile.photoPermission"));
          return;
        }
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.84,
      });
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return;

      const sanitized = await ImageManipulator.manipulateAsync(
        asset.uri,
        asset.width > 1600 ? [{ resize: { width: 1600 } }] : [],
        { compress: 0.84, format: ImageManipulator.SaveFormat.JPEG },
      );
      const fileResponse = await fetch(sanitized.uri);
      if (!fileResponse.ok) throw new Error(i18n.t("profile.photoReadError"));
      const blob = await fileResponse.blob();
      const session = await generatePhotoUploadUrl({ ownerKey: identity.ownerKey });
      const uploadResponse = await fetch(session.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(
          i18n.t("profile.photoUploadError", {
            status: i18n.formatNumber(uploadResponse.status),
          }),
        );
      }
      const uploadResult: unknown = await uploadResponse.json();
      if (!isStorageUploadResult(uploadResult)) {
        throw new Error(i18n.t("profile.photoResponseError"));
      }
      uploadToDiscard = {
        uploadSessionId: session.uploadSessionId,
        storageId: uploadResult.storageId,
      };
      const photo: ProfilePhoto = await attachPhoto({
        ownerKey: identity.ownerKey,
        uploadSessionId: session.uploadSessionId,
        storageId: uploadResult.storageId,
      });
      uploadToDiscard = null;
      setDraft((current) => ({ ...current, photos: [...current.photos, photo] }));
    } catch (photoError) {
      if (uploadToDiscard && identity.kind === "ready") {
        try {
          await discardPhotoUpload({ ownerKey: identity.ownerKey, ...uploadToDiscard });
        } catch {
          // The original upload error is more useful to the user.
        }
      }
      setError(readableBackendError(photoError, i18n));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = async (photo: ProfilePhoto) => {
    if (identity.kind !== "ready" || removingPhotoId) return;
    setRemovingPhotoId(photo.storageId);
    setError(null);
    setErrorField(null);
    try {
      await removePhoto({ ownerKey: identity.ownerKey, storageId: photo.storageId });
      setDraft((current) => ({
        ...current,
        photos: current.photos.filter((item) => item.storageId !== photo.storageId),
      }));
    } catch (photoError) {
      setError(readableBackendError(photoError, i18n));
    } finally {
      setRemovingPhotoId(null);
    }
  };

  const save = async () => {
    if (saving) return;
    if (identity.kind !== "ready") {
      setError(i18n.t("profile.identityUnavailable"));
      setErrorField(null);
      return;
    }
    const validationError = validateProfileDraft(draft, i18n.t);
    if (validationError) {
      setError(validationError.message);
      setErrorField(validationError.field);
      focusField(validationError.field);
      return;
    }
    if (flow.connection === "offline") {
      setError(i18n.t("profile.offline"));
      setErrorField(null);
      return;
    }

    setSaving(true);
    setError(null);
    setErrorField(null);
    setPushWarning(null);
    try {
      await flow.saveProfile(buildProfile(draft));

      if (onboarding && identity.kind === "ready") {
        const pushResult = await requestProfilePushRegistration({
          ownerKey: identity.ownerKey,
          choice: pushChoice,
        });
        if (pushResult.kind === "register") {
          try {
            await registerPushToken(pushResult.registration);
          } catch {
            setPushWarning({
              title: i18n.t("profile.pushWarningTitle"),
              message: i18n.t("profile.pushRegisterError"),
            });
            return;
          }
        } else if (pushChoice === "enable") {
          setPushWarning(
            pushResult.reason === "permissionDenied"
              ? {
                  title: i18n.t("profile.pushWarningTitle"),
                  message: i18n.t("profile.pushPermissionError"),
                }
              : pushResult.reason === "unsupportedPlatform"
                ? {
                    title: i18n.t("profile.pushWarningTitle"),
                    message: i18n.t("profile.pushUnsupported"),
                  }
                : {
                    title: i18n.t("profile.pushWarningTitle"),
                    message: i18n.t("profile.pushRegisterError"),
                  },
          );
          return;
        }
      }

      finish();
    } catch (saveError) {
      setError(readableBackendError(saveError, i18n));
      setErrorField(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowScreen
      title={flow.profile ? i18n.t("profile.editTitle") : i18n.t("profile.createTitle")}
      intro={i18n.t("profile.intro")}>
      {flow.connection === "offline" ? (
        <SystemState kind="offline" message={i18n.t("profile.offline")} />
      ) : null}

      <ChoiceRow
        label={i18n.t("profile.applyingFor")}
        options={profileOptions}
        value={draft.kind}
        onChange={(kind) => setDraftField("kind", kind)}
      />

      {draft.kind === "sharedHome" ? (
        <LabeledInput
          ref={nameInput}
          label={i18n.t("profile.name")}
          value={draft.name}
          onChangeText={(name) => setDraftField("name", name)}
          error={errorField === "name" ? error ?? undefined : undefined}
          maxLength={80}
          autoComplete="name"
        />
      ) : null}
      <LabeledInput
        ref={occupationInput}
        label={i18n.t("profile.workStudy")}
        value={draft.occupation}
        onChangeText={(occupation) => setDraftField("occupation", occupation)}
        error={errorField === "occupation" ? error ?? undefined : undefined}
        maxLength={120}
        placeholder={i18n.t("profile.workPlaceholder")}
      />
      <LabeledInput
        ref={moveInDateInput}
        label={i18n.t("profile.moveIn")}
        value={draft.moveInDate}
        onChangeText={(moveInDate) => setDraftField("moveInDate", moveInDate)}
        error={errorField === "moveInDate" ? error ?? undefined : undefined}
        maxLength={80}
        placeholder={i18n.t("profile.moveInPlaceholder")}
      />

      {draft.kind === "sharedHome" ? (
        <>
          <FlowCard>
            <Heading level={2} style={{ fontSize: 17, fontWeight: "800", color: theme.ink }}>
              {i18n.t("profile.photosTitle")}
            </Heading>
            <Text selectable style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
              {i18n.t("profile.photosBody")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {draft.photos.map((photo, index) => (
                <View key={photo.storageId} style={{ width: 128, gap: 7 }}>
                  <Photo
                    uri={photo.url ?? undefined}
                    accessibilityLabel={i18n.t("profile.photoLabel", {
                      index: i18n.formatNumber(index + 1),
                      count: i18n.formatNumber(draft.photos.length),
                    })}
                    style={{ width: 128, aspectRatio: 1, borderRadius: 14 }}
                  />
                  <Button
                    disabled={removingPhotoId !== null || uploadingPhoto}
                    label={
                      removingPhotoId === photo.storageId
                        ? i18n.t("profile.removingPhoto")
                        : i18n.t("profile.removePhoto", {
                            index: i18n.formatNumber(index + 1),
                          })
                    }
                    variant="surface"
                    onPress={() => void removeProfilePhoto(photo)}
                  />
                </View>
              ))}
            </View>
            <Button
              disabled={
                uploadingPhoto ||
                removingPhotoId !== null ||
                draft.photos.length >= 6 ||
                flow.connection === "offline"
              }
              label={
                uploadingPhoto
                  ? i18n.t("profile.uploadingPhoto")
                  : i18n.t("profile.addPhoto")
              }
              variant="surface"
              onPress={() => void uploadPhoto()}
            />
          </FlowCard>
          <LabeledInput
            ref={introductionInput}
            label={i18n.t("profile.introduction")}
            value={draft.introduction}
            onChangeText={(introduction) => setDraftField("introduction", introduction)}
            error={errorField === "introduction" ? error ?? undefined : undefined}
            maxLength={500}
            multiline
            placeholder={i18n.t("profile.introductionPlaceholder")}
          />
          <LabeledInput
            ref={expectedStayInput}
            label={i18n.t("profile.expectedStay")}
            value={draft.expectedStay}
            onChangeText={(expectedStay) => setDraftField("expectedStay", expectedStay)}
            error={errorField === "expectedStay" ? error ?? undefined : undefined}
            maxLength={80}
            placeholder={i18n.t("profile.expectedStayPlaceholder")}
          />
          <LabeledInput
            ref={monthlyBudgetInput}
            label={i18n.t("profile.monthlyBudget")}
            value={draft.monthlyBudget}
            onChangeText={(monthlyBudget) => setDraftField("monthlyBudget", monthlyBudget)}
            error={errorField === "monthlyBudget" ? error ?? undefined : undefined}
            maxLength={40}
            keyboardType="number-pad"
            placeholder={i18n.t("profile.budgetPlaceholder")}
          />
          <LabeledInput
            ref={habitsInput}
            label={i18n.t("profile.habits")}
            value={draft.habits}
            onChangeText={(habits) => setDraftField("habits", habits)}
            error={errorField === "habits" ? error ?? undefined : undefined}
            maxLength={300}
            multiline
            placeholder={i18n.t("profile.habitsPlaceholder")}
          />
        </>
      ) : (
        <>
          <LabeledInput
            ref={householdSizeInput}
            label={i18n.t("profile.householdSize")}
            value={draft.householdSize}
            onChangeText={(householdSize) => setDraftField("householdSize", householdSize)}
            error={errorField === "householdSize" ? error ?? undefined : undefined}
            maxLength={3}
            keyboardType="number-pad"
          />
          <LabeledInput
            label={i18n.t("profile.incomeRange")}
            value={draft.incomeRange}
            onChangeText={(incomeRange) => setDraftField("incomeRange", incomeRange)}
            maxLength={80}
            hint={i18n.t("profile.incomeHint")}
          />
          <LabeledInput
            label={i18n.t("profile.note")}
            value={draft.note}
            onChangeText={(note) => setDraftField("note", note)}
            maxLength={500}
            multiline
          />
        </>
      )}

      {onboarding ? (
        <FlowCard>
          <ChoiceRow
            label={i18n.t("profile.pushLabel")}
            options={pushOptions}
            value={pushChoice}
            onChange={setPushChoice}
          />
          <Text selectable style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
            {i18n.t("profile.pushBody")}
          </Text>
        </FlowCard>
      ) : null}

      {error && !errorField ? (
        <FlowCard>
          <Text accessibilityRole="alert" selectable style={{ color: theme.danger }}>{error}</Text>
        </FlowCard>
      ) : null}

      {pushWarning ? (
        <SystemState
          kind="denied"
          title={pushWarning.title}
          message={pushWarning.message}
          action={{ label: i18n.t("common.continue"), onPress: finish }}
        />
      ) : (
        <Button
          disabled={saving || flow.connection === "offline"}
          label={
            saving
              ? i18n.t("profile.saving")
              : flow.profile
                ? i18n.t("profile.save")
                : i18n.t("profile.create")
          }
          onPress={() => void save()}
        />
      )}
    </FlowScreen>
  );
}
