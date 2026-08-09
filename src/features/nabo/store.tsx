import React from "react";

import { APPLICANTS, type Applicant } from "@/features/applicants/data";
import { INITIAL_MESSAGES, THREADS, type ChatMessage } from "@/features/matches/data";
import {
  DEFAULT_PROFILE_TAGS,
  DEFAULT_SEARCH_AGENTS,
  OWNER_PROFILE,
  type SearchAgent,
} from "@/features/profile/data";

export const ROOM_TYPES = ["Room", "Studio", "Whole flat", "Shared room"];
export const HOUSE_RULES = ["Non-smoking", "Pets ok", "Couple ok", "Female flatmates", "Furnished"];
export const MOVE_IN_DATES = ["Now", "1 Sep", "1 Oct"];

export const RENT_RANGE = { min: 4000, max: 12000, step: 500 };

/** Distribution behind the rent slider, one bar per 700 kr from 4.000. */
export const RENT_HISTOGRAM = [3, 6, 11, 18, 26, 34, 30, 22, 16, 11, 7, 4];

export type Filters = {
  maxRent: number;
  types: Record<string, boolean>;
  rules: Record<string, boolean>;
  moveIn: string;
};

const DEFAULT_FILTERS: Filters = {
  maxRent: 7000,
  types: { Room: true },
  rules: { "Non-smoking": true },
  moveIn: "1 Sep",
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
  toggleRoomType: (value: string) => void;
  toggleHouseRule: (value: string) => void;
  setMoveIn: (value: string) => void;
  resetFilters: () => void;
  toggleProfileTag: (value: string) => void;
  setBio: (value: string) => void;
  addAgent: (agent: SearchAgent) => void;
  publishListing: () => void;
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

    const toggleIn = (key: "types" | "rules") => (value: string) =>
      setState((current) => ({
        ...current,
        filters: {
          ...current.filters,
          [key]: { ...current.filters[key], [value]: !current.filters[key][value] },
        },
      }));

    const countSelected = (record: Record<string, boolean>) => Object.values(record).filter(Boolean).length;

    return {
      ...state,
      topApplicant,
      remainingApplicants: APPLICANTS.length - (state.deckIndex % APPLICANTS.length),
      activeFilterCount:
        countSelected(state.filters.types) + countSelected(state.filters.rules) + (state.filters.moveIn ? 1 : 0),
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
      toggleRoomType: toggleIn("types"),
      toggleHouseRule: toggleIn("rules"),
      setMoveIn: (moveIn) => setState((current) => ({ ...current, filters: { ...current.filters, moveIn } })),
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

      publishListing: () => flash("Listing is live. Applicants will show up in your deck."),
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
