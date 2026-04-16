import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { StaffSession } from "../store/authStore";

export function useStaffLogin() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      await api.post("/staff-auth/login", input);
      const me = await api.get<StaffSession>("/staff-auth/me");
      return me.data;
    }
  });
}

export function useStaffMe(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["staff", "me"],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const r = await api.get<StaffSession>("/staff-auth/me");
      return r.data;
    }
  });
}

export function useStaffLogout() {
  return useMutation({
    mutationFn: async () => {
      await api.post("/staff-auth/logout");
    }
  });
}

