import React from "react";

import { APPLICANTS, type Applicant } from "@/features/applicants/data";
import { INITIAL_MESSAGES, THREADS, type ChatMessage } from "@/features/matches/data";
import {
  DEFAULT_PROFILE_TAGS,
  DEFAULT_SEARCH_AGENTS,
  OWNER_PROFILE,
  type SearchAgent,
} from "@/features/profile/data";

export const ROOM_TYPES = ["Room", "Studio", "Apartment", "House"] as const;
export const RENTAL_ARRANGEMENTS = ["Standard rental", "Sublease"] as const;
export const AVAILABILITY_MONTHS = ["Sep 2026", "Oct 2026", "Nov 2026"] as const;

export const PROPERTY_TYPE_BY_LABEL = {
  Room: "room",
  Studio: "studio",
  Apartment: "apartment",
  House: "house",
} satisfies Record<(typeof ROOM_TYPES)[number], "room" | "studio" | "apartment" | "house">;

export const RENTAL_ARRANGEMENT_BY_LABEL = {
  "Standard rental": "standard",
  Sublease: "sublease",
} satisfies Record<(typeof RENTAL_ARRANGEMENTS)[number], "standard" | "sublease">;

export const AVAILABILITY_PREFIX_BY_LABEL = {
  "Sep 2026": "2026-09",
  "Oct 2026": "2026-10",
  "Nov 2026": "2026-11",
} satisfies Record<(typeof AVAILABILITY_MONTHS)[number], string>;

export const RENT_RANGE = { min: 4000, max: 18000, step: 500 };

export type RoomTypeLabel = (typeof ROOM_TYPES)[number];
export type RentalArrangementLabel = (typeof RENTAL_ARRANGEMENTS)[number];
export type AvailabilityMonth = (typeof AVAILABILITY_MONTHS)[number];

export type Filters = {
  maxRent: number;
  types: Partial<Record<RoomTypeLabel, boolean>>;
  arrangements: Partial<Record<RentalArrangementLabel, boolean>>;
  availability: AvailabilityMonth | "";
};

const DEFAULT_FILTERS: Filters = {
  maxRent: RENT_RANGE.max,
  types: {},
  arrangements: {},
  availability: "",
};

type SessionState = {
  applied: Record<string, boolean>;
  deckIndex: number;
  shortlisted: string[];
  matchWith: string | null;
  messages: Record<string, ChatMessage[]>;
  readThreads: Record<string, boolean>;
  filters: Filters;
  profileTags: Record<string, boolean>;
  bio: string;
  agents: SearchAgent[];
  privateNotes: Record<string, string>;
  toast: string;
};

const INITIAL_STATE: SessionState = {
  applied: {},
  deckIndex: 0,
  shortlisted: [],
  matchWith: null,
  messages: INITIAL_MESSAGES,
  readThreads: {},
  filters: DEFAULT_FILTERS,
  profileTags: Object.fromEntries(DEFAULT_PROFILE_TAGS.map((tag) => [tag, true])),
  bio: OWNER_PROFILE.defaultBio,
  agents: DEFAULT_SEARCH_AGENTS,
  privateNotes: {},
  toast: "",
};

type SessionValue = SessionState & {
  /** Applicant currently on top of the deck; the queue loops. */
  topApplicant: Applicant;
  remainingApplicants: number;
  activeFilterCount: number;
  pickedProfileTags: string[];
  applyToRoom: (roomId: string) => void;
  reviewApplicant: (shortlisted: boolean) => void;
  dismissMatch: () => void;
  sendMessage: (threadId: string, text: string) => void;
  markThreadRead: (threadId: string) => void;
  isThreadUnread: (threadId: string) => boolean;
  setMaxRent: (value: number) => void;
  toggleRoomType: (value: RoomTypeLabel) => void;
  toggleRentalArrangement: (value: RentalArrangementLabel) => void;
  setAvailability: (value: AvailabilityMonth) => void;
  resetFilters: () => void;
  toggleProfileTag: (value: string) => void;
  setBio: (value: string) => void;
  addAgent: (agent: SearchAgent) => void;
  setPrivateNote: (applicantId: string, note: string) => void;
  notify: (message: string) => void;
};

const SessionContext = React.createContext<SessionValue | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = React.useState<SessionState>(INITIAL_STATE);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
  }, []);

  const flash = React.useCallback((message: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setState((current) => ({ ...current, toast: message }));
    toastTimer.current = setTimeout(() => {
      setState((current) => ({ ...current, toast: "" }));
    }, 3200);
  }, []);

  const value = React.useMemo<SessionValue>(() => {
    const topApplicant = APPLICANTS[state.deckIndex % APPLICANTS.length];

    const countSelected = (record: Record<string, boolean>) => Object.values(record).filter(Boolean).length;

    return {
      ...state,
      topApplicant,
      remainingApplicants: APPLICANTS.length - (state.deckIndex % APPLICANTS.length),
      activeFilterCount:
        countSelected(state.filters.types) +
        countSelected(state.filters.arrangements) +
        (state.filters.availability ? 1 : 0) +
        (state.filters.maxRent < RENT_RANGE.max ? 1 : 0),
      pickedProfileTags: Object.keys(state.profileTags).filter((tag) => state.profileTags[tag]),

      applyToRoom: (roomId) =>
        setState((current) => ({ ...current, applied: { ...current.applied, [roomId]: true } })),

      reviewApplicant: (shortlisted) =>
        setState((current) => {
          const reviewed = APPLICANTS[current.deckIndex % APPLICANTS.length];

          return {
            ...current,
            deckIndex: current.deckIndex + 1,
            shortlisted: shortlisted ? [...current.shortlisted, reviewed.id] : current.shortlisted,
            matchWith: shortlisted && reviewed.match ? reviewed.name : null,
          };
        }),

      dismissMatch: () => setState((current) => ({ ...current, matchWith: null })),

      sendMessage: (threadId, text) => {
        const trimmed = text.trim();
        if (!trimmed) {
          return;
        }

        setState((current) => ({
          ...current,
          messages: {
            ...current.messages,
            [threadId]: [...(current.messages[threadId] ?? []), { from: "me", text: trimmed }],
          },
        }));
      },

      markThreadRead: (threadId) =>
        setState((current) =>
          current.readThreads[threadId]
            ? current
            : { ...current, readThreads: { ...current.readThreads, [threadId]: true } },
        ),

      isThreadUnread: (threadId) =>
        (THREADS.find((thread) => thread.id === threadId)?.unread ?? false) && !state.readThreads[threadId],

      setMaxRent: (maxRent) => setState((current) => ({ ...current, filters: { ...current.filters, maxRent } })),
      toggleRoomType: (roomType) =>
        setState((current) => ({
          ...current,
          filters: {
            ...current.filters,
            types: { ...current.filters.types, [roomType]: !current.filters.types[roomType] },
          },
        })),
      toggleRentalArrangement: (arrangement) =>
        setState((current) => ({
          ...current,
          filters: {
            ...current.filters,
            arrangements: {
              ...current.filters.arrangements,
              [arrangement]: !current.filters.arrangements[arrangement],
            },
          },
        })),
      setAvailability: (availability) =>
        setState((current) => ({
          ...current,
          filters: {
            ...current.filters,
            availability: current.filters.availability === availability ? "" : availability,
          },
        })),
      resetFilters: () => setState((current) => ({ ...current, filters: DEFAULT_FILTERS })),

      toggleProfileTag: (tag) =>
        setState((current) => ({
          ...current,
          profileTags: { ...current.profileTags, [tag]: !current.profileTags[tag] },
        })),

      setBio: (bio) => setState((current) => ({ ...current, bio })),

      addAgent: (agent) => {
        setState((current) => ({ ...current, agents: [...current.agents, agent] }));
        flash("Agent on. We will notify you the moment a match appears.");
      },

      setPrivateNote: (applicantId, note) =>
        setState((current) => ({
          ...current,
          privateNotes: { ...current.privateNotes, [applicantId]: note.trim() },
        })),

      notify: flash,
    };
  }, [flash, state]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = React.useContext(SessionContext);

  if (!value) {
    throw new Error("useSession must be used inside a SessionProvider");
  }

  return value;
}
