import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import React from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Application } from "@/features/applications/model";
import {
  type BackendConnectionKind,
  useBackendConnection,
} from "@/features/backend/convex-provider";
import { readableBackendError } from "@/features/backend/errors";
import { useDeviceIdentity } from "@/features/device/device-identity";
import type { HostApplicant, HostListing, HostListingStatus } from "@/features/host/model";
import type { Conversation, Message } from "@/features/inbox/model";
import type { ProfilePhoto, SeekerProfile } from "@/features/profile/model";
import type { ReportReason } from "@/features/trust/model";
import { useI18n } from "@/i18n";

type BackendProfile = FunctionArgs<typeof api.profiles.upsert>["profile"];
type BackendApplication = FunctionReturnType<typeof api.applications.listMine>[number];
type HostBackendApplication = FunctionReturnType<typeof api.applications.listForHost>[number];
type BackendListing = FunctionReturnType<typeof api.listings.listMine>[number];

type LastHostReview = {
  applicantId: Id<"applications">;
  createdConversationId: Id<"conversations"> | null;
};

type FlowState = {
  profile: SeekerProfile | null;
  applications: Application[];
  conversations: Conversation[];
  hostListings: HostListing[];
  hostApplicants: HostApplicant[];
  reports: [];
  lastHostReview: LastHostReview | null;
  loading: boolean;
  coldOffline: boolean;
  profileUnavailableOffline: boolean;
  applicationsUnavailableOffline: boolean;
  conversationsUnavailableOffline: boolean;
  identityError: string | null;
  connection: BackendConnectionKind;
};

type SubmitApplicationResult =
  | { kind: "created"; applicationId: Id<"applications"> }
  | { kind: "duplicate"; applicationId: Id<"applications"> }
  | { kind: "missingProfile" };

type ReviewHostApplicantResult =
  | { kind: "reviewed"; conversationId: Id<"conversations"> | null }
  | { kind: "notPending" }
  | { kind: "notFound" };

type SendMessageResult =
  | { kind: "sent" }
  | { kind: "empty" }
  | { kind: "blocked" }
  | { kind: "notFound" };

type ReportTarget =
  | { kind: "listing"; listingId: Id<"listings"> }
  | { kind: "conversation"; conversationId: Id<"conversations"> };

type FlowValue = FlowState & {
  saveProfile: (profile: SeekerProfile) => Promise<void>;
  submitApplication: (input: {
    listingId: Id<"listings">;
    listingTitle: string;
    note: string;
  }) => Promise<SubmitApplicationResult>;
  withdrawApplication: (applicationId: Id<"applications">) => Promise<boolean>;
  reviewHostApplicant: (
    applicantId: Id<"applications">,
    decision: "shortlisted" | "declined",
  ) => Promise<ReviewHostApplicantResult>;
  undoHostReview: () => Promise<boolean>;
  markConversationRead: (conversationId: Id<"conversations">) => Promise<void>;
  sendMessage: (conversationId: Id<"conversations">, body: string) => Promise<SendMessageResult>;
  blockConversation: (conversationId: Id<"conversations">) => Promise<boolean>;
  unblockConversation: (conversationId: Id<"conversations">) => Promise<boolean>;
  submitReport: (input: {
    target: ReportTarget;
    reason: ReportReason;
    details: string;
  }) => Promise<void>;
  publishListing: (listing: Omit<HostListing, "id" | "status">) => Promise<Id<"listings">>;
  setHostListingStatus: (
    listingId: Id<"listings">,
    status: HostListingStatus,
  ) => Promise<boolean>;
  deleteMyData: () => Promise<void>;
};

function numberFromDisplayValue(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  return Number(normalized);
}

function splitHabits(value: string) {
  return value
    .split(/[,;\n]/)
    .map((habit) => habit.trim())
    .filter(Boolean);
}

function toBackendProfile(profile: SeekerProfile): BackendProfile {
  if (profile.kind === "sharedHome") {
    return {
      kind: "sharedHome",
      name: profile.name,
      photoStorageIds: profile.photos.map((photo) => photo.storageId),
      introduction: profile.introduction,
      occupationOrStudy: profile.occupation,
      moveInDate: profile.moveInDate,
      expectedStay: profile.expectedStay,
      budget: numberFromDisplayValue(profile.monthlyBudget),
      householdHabits: splitHabits(profile.habits),
    };
  }

  return {
    kind: "privateRental",
    householdSize: numberFromDisplayValue(profile.householdSize),
    employmentOrStudy: profile.occupation,
    incomeRangeUnverified: profile.incomeRange || undefined,
    moveInDate: profile.moveInDate,
    note: profile.note || undefined,
  };
}

function fromBackendProfile(
  profile: BackendProfile | HostBackendApplication["profileSnapshot"],
  photos: ProfilePhoto[] = [],
  privateHouseholdName = "Private rental household",
): SeekerProfile {
  if (profile.kind === "sharedHome") {
    return {
      kind: "sharedHome",
      name: profile.name,
      photos,
      introduction: profile.introduction,
      occupation: profile.occupationOrStudy,
      moveInDate: profile.moveInDate,
      expectedStay: profile.expectedStay,
      monthlyBudget: String(profile.budget),
      habits: profile.householdHabits.join(", "),
    };
  }

  return {
    kind: "privateRental",
    name: privateHouseholdName,
    householdSize: String(profile.householdSize),
    occupation: profile.employmentOrStudy,
    incomeRange: profile.incomeRangeUnverified ?? "",
    moveInDate: profile.moveInDate,
    note: profile.note ?? "",
  };
}

function toApplication(application: BackendApplication, privateHouseholdName: string): Application {
  return {
    id: application._id,
    listingId: application.listingId,
    listingTitle: application.listingSnapshot.title,
    listingLocation: application.listingSnapshot.locationLabel,
    note: application.note ?? "",
    profileSnapshot: fromBackendProfile(
      application.profileSnapshot,
      application.profilePhotos,
      privateHouseholdName,
    ),
    status: application.status,
    submittedAt: application.submittedAt,
  };
}

function toHostApplication(
  application: HostBackendApplication,
  privateHouseholdName: string,
): Application {
  return {
    id: application._id,
    listingId: application.listingId,
    listingTitle: application.listingSnapshot.title,
    listingLocation: application.listingSnapshot.locationLabel,
    note: application.note ?? "",
    profileSnapshot: fromBackendProfile(
      application.profileSnapshot,
      [],
      privateHouseholdName,
    ),
    status: application.status,
    submittedAt: application.submittedAt,
  };
}

function hostListingStatus(status: BackendListing["status"]): HostListingStatus | null {
  switch (status) {
    case "published":
      return "live";
    case "paused":
    case "rented":
    case "archived":
      return status;
    case "draft":
      return null;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function createClientMessageId() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random number generation is unavailable on this device.");
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function reportReason(reason: ReportReason) {
  switch (reason) {
    case "Scam":
      return "scam" as const;
    case "Inaccurate":
      return "inaccurate" as const;
    case "Unavailable":
      return "unavailable" as const;
    case "Discriminatory":
      return "discriminatory" as const;
    case "Other":
      return "other" as const;
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function mutationError(error: unknown): never {
  throw new Error(readableBackendError(error));
}

const FlowContext = React.createContext<FlowValue | null>(null);

export function ProductFlowProvider({ children }: React.PropsWithChildren) {
  const { t } = useI18n();
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
  const ownerKey = identity.kind === "ready" ? identity.ownerKey : null;

  const profileRecord = useQuery(api.profiles.getMine, ownerKey ? { ownerKey } : "skip");
  const applicationRecords = useQuery(api.applications.listMine, ownerKey ? { ownerKey } : "skip");
  const hostApplicationRecords = useQuery(
    api.applications.listForHost,
    ownerKey ? { ownerKey } : "skip",
  );
  const conversationRecords = useQuery(api.conversations.listMine, ownerKey ? { ownerKey } : "skip");
  const hostListingRecords = useQuery(api.listings.listMine, ownerKey ? { ownerKey } : "skip");

  const upsertProfile = useMutation(api.profiles.upsert);
  const submitApplicationMutation = useMutation(api.applications.submit);
  const withdrawApplicationMutation = useMutation(api.applications.withdraw);
  const decideApplication = useMutation(api.applications.decide);
  const undoApplicationDecision = useMutation(api.applications.undoDecision);
  const markReadMutation = useMutation(api.conversations.markRead);
  const sendMessageMutation = useMutation(api.conversations.sendMessage);
  const blockConversationMutation = useMutation(api.trust.blockConversation);
  const unblockConversationMutation = useMutation(api.trust.unblockConversation);
  const createReport = useMutation(api.trust.createReport);
  const setListingLifecycle = useMutation(api.listings.setLifecycle);
  const deleteDataMutation = useMutation(api.privacy.deleteMyData);

  const [lastHostReview, setLastHostReview] = React.useState<LastHostReview | null>(null);
  const submittingListings = React.useRef(new Set<Id<"listings">>());

  const ownerResults = [
    profileRecord,
    applicationRecords,
    hostApplicationRecords,
    conversationRecords,
    hostListingRecords,
  ];
  const coldOffline =
    connection === "offline" &&
    (identity.kind === "loading" ||
      (identity.kind === "ready" && ownerResults.some((result) => result === undefined)));
  const profileUnavailableOffline =
    connection === "offline" &&
    (identity.kind === "loading" ||
      (identity.kind === "ready" && profileRecord === undefined));
  const applicationsUnavailableOffline =
    connection === "offline" &&
    (identity.kind === "loading" ||
      (identity.kind === "ready" && applicationRecords === undefined));
  const conversationsUnavailableOffline =
    connection === "offline" &&
    (identity.kind === "loading" ||
      (identity.kind === "ready" && conversationRecords === undefined));
  const loading =
    identity.kind === "loading" ||
    (connection !== "offline" &&
      identity.kind === "ready" &&
      ownerResults.some((result) => result === undefined));
  const identityError = identity.kind === "error" ? identity.error : null;

  const privateHouseholdName = t("profile.privateHouseholdName");
  const profile = profileRecord
    ? fromBackendProfile(profileRecord.profile, profileRecord.profilePhotos, privateHouseholdName)
    : null;
  const applications = (applicationRecords ?? []).map((application) =>
    toApplication(application, privateHouseholdName),
  );
  const hostApplications = (hostApplicationRecords ?? []).map((application) =>
    toHostApplication(application, privateHouseholdName),
  );
  const hostListings = (hostListingRecords ?? []).flatMap((listing): HostListing[] => {
    const status = hostListingStatus(listing.status);
    if (!status) return [];
    return [
      {
        id: listing._id,
        title: listing.title,
        area: listing.publicLocationLabel ?? "Area not provided",
        monthlyRent: listing.monthlyRent ?? 0,
        kind: listing.propertyType ?? "room",
        status,
      },
    ];
  });
  const hostApplicants = hostApplications.flatMap((application): HostApplicant[] => {
    if (application.status === "withdrawn") return [];
    return [
      {
        id: application.id,
        listingId: application.listingId,
        profile: application.profileSnapshot,
        note: application.note,
        status: application.status,
      },
    ];
  });
  const conversations = (conversationRecords ?? []).map((conversation): Conversation => {
    const hostApplication = hostApplications.find(
      (application) => application.id === conversation.applicationId,
    );
    const participantName = conversation.participantDeleted
      ? t("inbox.deletedParticipant")
      : conversation.role === "host"
        ? hostApplication?.profileSnapshot.kind === "sharedHome"
          ? hostApplication.profileSnapshot.name
          : hostApplication?.profileSnapshot.kind === "privateRental"
            ? t("hostApplications.householdOf", {
                count: hostApplication.profileSnapshot.householdSize,
              })
            : t("inbox.applicant")
        : t("inbox.host");
    return {
      id: conversation._id,
      participantName,
      participantDeleted: conversation.participantDeleted,
      listingTitle: conversation.listingSnapshot.title,
      listingLocation: conversation.listingSnapshot.locationLabel,
      applicationId: conversation.applicationId,
      blockState: conversation.blockState,
      canSend: conversation.canSend,
      unread: conversation.unread,
      unreadCount: conversation.unreadCount,
      lastMessagePreview: conversation.lastMessagePreview,
      messages: [],
    };
  });

  const getOwnerKey = React.useCallback(() => {
    if (identity.kind === "ready") return identity.ownerKey;
    throw new Error(identity.kind === "error" ? identity.error : "Device identity is still loading.");
  }, [identity]);

  const value = React.useMemo<FlowValue>(
    () => ({
      profile,
      applications,
      conversations,
      hostListings,
      hostApplicants,
      reports: [],
      lastHostReview,
      loading,
      coldOffline,
      profileUnavailableOffline,
      applicationsUnavailableOffline,
      conversationsUnavailableOffline,
      identityError,
      connection,

      saveProfile: async (nextProfile) => {
        try {
          await upsertProfile({ ownerKey: getOwnerKey(), profile: toBackendProfile(nextProfile) });
        } catch (error) {
          mutationError(error);
        }
      },

      submitApplication: async ({ listingId, note }) => {
        const duplicate = applications.find((application) => application.listingId === listingId);
        if (duplicate) return { kind: "duplicate", applicationId: duplicate.id };
        if (!profile) return { kind: "missingProfile" };
        if (submittingListings.current.has(listingId)) {
          throw new Error("This application is already being sent.");
        }

        submittingListings.current.add(listingId);
        try {
          const result = await submitApplicationMutation({
            listingId,
            ownerKey: getOwnerKey(),
            note: note.trim() || undefined,
          });
          return { kind: "created", applicationId: result.applicationId };
        } catch (error) {
          mutationError(error);
        } finally {
          submittingListings.current.delete(listingId);
        }
      },

      withdrawApplication: async (applicationId) => {
        const application = applications.find((item) => item.id === applicationId);
        if (!application || (application.status !== "pending" && application.status !== "shortlisted")) {
          return false;
        }
        try {
          await withdrawApplicationMutation({ applicationId, ownerKey: getOwnerKey() });
          return true;
        } catch (error) {
          mutationError(error);
        }
      },

      reviewHostApplicant: async (applicantId, decision) => {
        const applicant = hostApplicants.find((item) => item.id === applicantId);
        if (!applicant) return { kind: "notFound" };
        if (applicant.status !== "pending") return { kind: "notPending" };
        try {
          const result = await decideApplication({
            applicationId: applicantId,
            ownerKey: getOwnerKey(),
            decision,
          });
          const conversationId = result.conversationId ?? null;
          setLastHostReview({ applicantId, createdConversationId: conversationId });
          return { kind: "reviewed", conversationId };
        } catch (error) {
          mutationError(error);
        }
      },

      undoHostReview: async () => {
        if (!lastHostReview) return false;
        try {
          await undoApplicationDecision({
            applicationId: lastHostReview.applicantId,
            ownerKey: getOwnerKey(),
          });
          setLastHostReview(null);
          return true;
        } catch (error) {
          mutationError(error);
        }
      },

      markConversationRead: async (conversationId) => {
        try {
          await markReadMutation({ conversationId, ownerKey: getOwnerKey() });
        } catch (error) {
          mutationError(error);
        }
      },

      sendMessage: async (conversationId, body) => {
        const trimmed = body.trim();
        if (!trimmed) return { kind: "empty" };
        const conversation = conversations.find((item) => item.id === conversationId);
        if (!conversation) return { kind: "notFound" };
        if (conversation.participantDeleted) return { kind: "notFound" };
        if (!conversation.canSend) return { kind: "blocked" };
        try {
          await sendMessageMutation({
            conversationId,
            ownerKey: getOwnerKey(),
            clientMessageId: createClientMessageId(),
            body: trimmed,
          });
          return { kind: "sent" };
        } catch (error) {
          const message = readableBackendError(error);
          if (message.toLocaleLowerCase().includes("blocked")) {
            return { kind: "blocked" };
          }
          throw new Error(message);
        }
      },

      blockConversation: async (conversationId) => {
        const conversation = conversations.find((item) => item.id === conversationId);
        if (
          !conversation ||
          conversation.blockState === "blockedByMe" ||
          conversation.blockState === "mutual" ||
          conversation.participantDeleted
        ) {
          return false;
        }
        try {
          await blockConversationMutation({ conversationId, ownerKey: getOwnerKey() });
          return true;
        } catch (error) {
          mutationError(error);
        }
      },

      unblockConversation: async (conversationId) => {
        const conversation = conversations.find((item) => item.id === conversationId);
        if (
          !conversation ||
          (conversation.blockState !== "blockedByMe" && conversation.blockState !== "mutual")
        ) {
          return false;
        }
        try {
          await unblockConversationMutation({ conversationId, ownerKey: getOwnerKey() });
          return true;
        } catch (error) {
          mutationError(error);
        }
      },

      submitReport: async ({ target, reason, details }) => {
        try {
          await createReport({
            ownerKey: getOwnerKey(),
            target,
            reason: reportReason(reason),
            details: details.trim() || undefined,
          });
        } catch (error) {
          mutationError(error);
        }
      },

      publishListing: async () => {
        throw new Error("Complete the full listing form before publishing to Convex.");
      },

      setHostListingStatus: async (listingId, status) => {
        try {
          await setListingLifecycle({
            listingId,
            ownerKey: getOwnerKey(),
            status: status === "live" ? "published" : status,
          });
          return true;
        } catch (error) {
          mutationError(error);
        }
      },

      deleteMyData: async () => {
        try {
          await deleteDataMutation({ ownerKey: getOwnerKey(), confirmation: "DELETE" });
          await identity.rotate();
          setLastHostReview(null);
        } catch (error) {
          mutationError(error);
        }
      },
    }),
    [
      applications,
      blockConversationMutation,
      connection,
      conversations,
      coldOffline,
      profileUnavailableOffline,
      applicationsUnavailableOffline,
      conversationsUnavailableOffline,
      createReport,
      decideApplication,
      deleteDataMutation,
      getOwnerKey,
      hostApplicants,
      hostListings,
      identity,
      identityError,
      lastHostReview,
      loading,
      markReadMutation,
      profile,
      sendMessageMutation,
      setListingLifecycle,
      submitApplicationMutation,
      undoApplicationDecision,
      unblockConversationMutation,
      upsertProfile,
      withdrawApplicationMutation,
    ],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useProductFlow() {
  const value = React.use(FlowContext);
  if (!value) throw new Error("useProductFlow must be used inside ProductFlowProvider");
  return value;
}

export function useConversationMessages(conversationId: Id<"conversations"> | null) {
  const identity = useDeviceIdentity();
  const connection = useBackendConnection();
  const ownerKey = identity.kind === "ready" ? identity.ownerKey : null;
  const records = useQuery(
    api.conversations.listMessages,
    conversationId && ownerKey ? { conversationId, ownerKey } : "skip",
  );

  const messages: Message[] = (records ?? []).map((message) => ({
    id: message._id,
    from: message.isMine ? "me" : "them",
    body: message.body,
    sentAt: message.createdAt,
  }));
  const waitingForRecords = Boolean(conversationId && ownerKey && records === undefined);
  return {
    messages,
    loading: waitingForRecords,
    coldOffline: connection === "offline" && waitingForRecords,
  };
}
