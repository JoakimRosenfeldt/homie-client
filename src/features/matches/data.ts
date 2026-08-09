export type ChatMessage = {
  from: "me" | "them";
  text: string;
};

export type Thread = {
  id: string;
  /** Matches `Applicant.name`, which is how a shortlist resolves to a thread. */
  name: string;
  time: string;
  last: string;
  unread: boolean;
  status: string;
  photoUri?: string;
};

export const THREADS: Thread[] = [
  {
    id: "m1",
    name: "Amir",
    time: "12:04",
    last: "Would Thursday 17:30 work for a viewing?",
    unread: true,
    status: "Applied to Jægersborggade 12",
    photoUri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "m2",
    name: "Jonas",
    time: "Yesterday",
    last: "Sent you my references 👍",
    unread: false,
    status: "Applied to Jægersborggade 12",
    photoUri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "m3",
    name: "Wei",
    time: "Mon",
    last: "Thanks! Let me know about the deposit.",
    unread: false,
    status: "Applied to Jægersborggade 12",
    photoUri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  },
];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  m1: [
    { from: "them", text: "Hi! I saw the room on Jægersborggade — is it still free from 1 September?" },
    { from: "me", text: "It is! Three of us live here, all pretty quiet on weekdays." },
    { from: "them", text: "Sounds like a good fit. Would Thursday 17:30 work for a viewing?" },
  ],
  m2: [{ from: "them", text: "Sent you my references 👍" }],
  m3: [{ from: "them", text: "Thanks! Let me know about the deposit." }],
};

export const MATCHED_ON_LABEL = "You matched on 4 Aug";

export function getThread(threadId?: string | string[]) {
  const id = Array.isArray(threadId) ? threadId[0] : threadId;
  return THREADS.find((thread) => thread.id === id);
}

export function findThreadByName(name: string) {
  return THREADS.find((thread) => thread.name === name);
}
