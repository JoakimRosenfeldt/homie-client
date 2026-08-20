import type { Id } from "../../../convex/_generated/dataModel";

export type Message = {
  id: Id<"messages">;
  from: "me" | "them";
  body: string;
  sentAt: number;
};

export type Conversation = {
  id: Id<"conversations">;
  participantName: string;
  participantDeleted: boolean;
  listingTitle: string;
  listingLocation?: string;
  applicationId: Id<"applications">;
  blockState: "none" | "blockedByMe" | "blockedByThem" | "mutual";
  canSend: boolean;
  unread: boolean;
  unreadCount: number;
  lastMessagePreview?: string;
  messages: Message[];
};
