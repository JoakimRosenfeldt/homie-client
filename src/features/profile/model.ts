import type { Id } from "../../../convex/_generated/dataModel";

import { english, type TranslationKey } from "@/i18n/dictionaries";

export type ProfilePhoto = {
  storageId: Id<"_storage">;
  url: string | null;
};

export type SharedHomeProfile = {
  kind: "sharedHome";
  name: string;
  photos: ProfilePhoto[];
  introduction: string;
  occupation: string;
  moveInDate: string;
  expectedStay: string;
  monthlyBudget: string;
  habits: string;
};

export type PrivateRentalProfile = {
  kind: "privateRental";
  name: string;
  householdSize: string;
  occupation: string;
  incomeRange: string;
  moveInDate: string;
  note: string;
};

export type SeekerProfile = SharedHomeProfile | PrivateRentalProfile;

export type ProfileDraft = {
  kind: SeekerProfile["kind"];
  name: string;
  introduction: string;
  occupation: string;
  moveInDate: string;
  expectedStay: string;
  monthlyBudget: string;
  habits: string;
  householdSize: string;
  incomeRange: string;
  note: string;
  photos: ProfilePhoto[];
};

export const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  kind: "sharedHome",
  name: "",
  introduction: "",
  occupation: "",
  moveInDate: "",
  expectedStay: "",
  monthlyBudget: "",
  habits: "",
  householdSize: "",
  incomeRange: "",
  note: "",
  photos: [],
};

export function buildProfile(draft: ProfileDraft): SeekerProfile {
  if (draft.kind === "sharedHome") {
    return {
      kind: draft.kind,
      name: draft.name.trim(),
      photos: draft.photos,
      introduction: draft.introduction.trim(),
      occupation: draft.occupation.trim(),
      moveInDate: draft.moveInDate.trim(),
      expectedStay: draft.expectedStay.trim(),
      monthlyBudget: draft.monthlyBudget.trim(),
      habits: draft.habits.trim(),
    };
  }

  return {
    kind: draft.kind,
    name: "Private rental household",
    householdSize: draft.householdSize.trim(),
    occupation: draft.occupation.trim(),
    incomeRange: draft.incomeRange.trim(),
    moveInDate: draft.moveInDate.trim(),
    note: draft.note.trim(),
  };
}

export function profileToDraft(profile: SeekerProfile | null): ProfileDraft {
  if (!profile) return { ...EMPTY_PROFILE_DRAFT };

  if (profile.kind === "sharedHome") {
    return {
      ...EMPTY_PROFILE_DRAFT,
      ...profile,
    };
  }

  return {
    ...EMPTY_PROFILE_DRAFT,
    ...profile,
  };
}

type Translate = (key: TranslationKey) => string;

export type ProfileValidationField =
  | "name"
  | "occupation"
  | "moveInDate"
  | "introduction"
  | "expectedStay"
  | "monthlyBudget"
  | "habits"
  | "householdSize";

export type ProfileValidationError = {
  field: ProfileValidationField;
  message: string;
};

export function validateProfileDraft(
  draft: ProfileDraft,
  translate?: Translate,
): ProfileValidationError | null {
  const t = translate ?? ((key: TranslationKey) => english[key]);

  if (draft.kind === "sharedHome") {
    if (!draft.name.trim()) {
      return { field: "name", message: t("profile.validation.name") };
    }
    if (!draft.occupation.trim()) {
      return { field: "occupation", message: t("profile.validation.occupation") };
    }
    if (!draft.moveInDate.trim()) {
      return { field: "moveInDate", message: t("profile.validation.moveIn") };
    }
    if (!draft.introduction.trim()) {
      return { field: "introduction", message: t("profile.validation.introduction") };
    }
    if (!draft.expectedStay.trim()) {
      return { field: "expectedStay", message: t("profile.validation.stay") };
    }
    if (!draft.monthlyBudget.trim()) {
      return { field: "monthlyBudget", message: t("profile.validation.budget") };
    }
    if (Number(draft.monthlyBudget.replace(/[^0-9]/g, "")) <= 0) {
      return { field: "monthlyBudget", message: t("profile.validation.budgetPositive") };
    }
    if (!draft.habits.trim()) {
      return { field: "habits", message: t("profile.validation.habits") };
    }
    return null;
  }

  if (!draft.occupation.trim()) {
    return { field: "occupation", message: t("profile.validation.occupation") };
  }
  if (!draft.moveInDate.trim()) {
    return { field: "moveInDate", message: t("profile.validation.moveIn") };
  }
  if (!draft.householdSize.trim()) {
    return { field: "householdSize", message: t("profile.validation.household") };
  }
  const householdSize = Number(draft.householdSize);
  if (!Number.isInteger(householdSize) || householdSize < 1) {
    return { field: "householdSize", message: t("profile.validation.householdPositive") };
  }
  return null;
}

export function profileRows(
  profile: SeekerProfile,
  translate?: Translate,
  formatCurrency?: (value: number) => string,
): { label: string; value: string }[] {
  const t = translate ?? ((key: TranslationKey) => english[key]);
  if (profile.kind === "sharedHome") {
    const numericBudget = Number(profile.monthlyBudget.replace(/[^0-9]/g, ""));
    return [
      { label: t("profile.row.introduction"), value: profile.introduction },
      { label: t("profile.row.workStudy"), value: profile.occupation },
      { label: t("profile.row.moveIn"), value: profile.moveInDate },
      { label: t("profile.row.expectedStay"), value: profile.expectedStay },
      {
        label: t("profile.row.monthlyBudget"),
        value: formatCurrency && numericBudget > 0
          ? formatCurrency(numericBudget)
          : profile.monthlyBudget,
      },
      { label: t("profile.row.habits"), value: profile.habits },
    ];
  }

  return [
    { label: t("profile.row.householdSize"), value: profile.householdSize },
    { label: t("profile.row.workStudy"), value: profile.occupation },
    { label: t("profile.row.incomeRange"), value: profile.incomeRange || t("profile.notProvided") },
    { label: t("profile.row.moveIn"), value: profile.moveInDate },
    { label: t("profile.row.note"), value: profile.note || t("profile.noNote") },
  ];
}
