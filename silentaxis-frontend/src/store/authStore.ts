import { create } from "zustand";

type StaffRole = "ORG_ADMIN" | "ORG_STAFF" | "HR" | "MANAGER" | "REGIONAL_OFFICER";

export type StaffSession = {
  userId: string;
  orgId: string;
  email: string;
  role: StaffRole;
};

type AuthState = {
  anonymousToken: string | null;
  setAnonymousToken: (t: string | null) => void;
  staff: StaffSession | null;
  setStaff: (s: StaffSession | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  anonymousToken: null,
  setAnonymousToken: (t) => set({ anonymousToken: t }),
  staff: null,
  setStaff: (s) => set({ staff: s })
}));

