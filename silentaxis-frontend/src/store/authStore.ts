import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type StaffRole = "ORG_ADMIN" | "ORG_STAFF" | "HR" | "MANAGER" | "REGIONAL_OFFICER";

export type StaffSession = {
  userId: string;
  orgId: string;
  email: string;
  role: StaffRole;
};

type AuthState = {
  zkEligibilityReceipt: string | null;
  setZkEligibilityReceipt: (t: string | null) => void;
  verifiedOrgId: string | null;
  setVerifiedOrgId: (orgId: string | null) => void;
  anonymousIdentity: {
    identityNullifier: string;
    identityTrapdoor: string;
    commitment: string;
  } | null;
  setAnonymousIdentity: (identity: { identityNullifier: string; identityTrapdoor: string; commitment: string } | null) => void;
  staff: StaffSession | null;
  setStaff: (s: StaffSession | null) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      zkEligibilityReceipt: null,
      setZkEligibilityReceipt: (t) => set({ zkEligibilityReceipt: t }),
      verifiedOrgId: null,
      setVerifiedOrgId: (orgId) => set({ verifiedOrgId: orgId }),
      anonymousIdentity: null,
      setAnonymousIdentity: (identity) => set({ anonymousIdentity: identity }),
      staff: null,
      setStaff: (s) => set({ staff: s })
    }),
    {
      name: "silentaxis-auth-store",
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);

