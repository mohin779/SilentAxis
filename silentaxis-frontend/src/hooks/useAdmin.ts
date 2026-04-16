import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export type ComplaintRow = {
  id: string;
  org_id: string;
  encrypted_data: string;
  encrypted_key: string | null;
  category: "fraud" | "harassment" | "safety" | "corruption" | "other";
  complaint_status: "SUBMITTED" | "UNDER_REVIEW" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  created_at: string;
};

export function useAdminComplaints(input: {
  orgId: string;
  page: number;
  limit: number;
  category?: ComplaintRow["category"];
}) {
  return useQuery({
    queryKey: ["admin", "complaints", input],
    queryFn: async () => {
      const r = await api.get<{ page: number; limit: number; data: ComplaintRow[] }>(
        `/org/${input.orgId}/complaints`,
        {
          params: {
            page: input.page,
            limit: input.limit,
            category: input.category
          }
        }
      );
      return r.data;
    }
  });
}

export type ComplaintTimelineItem = {
  id: string;
  complaint_id: string;
  message: string;
  created_at: string;
};

export function useAdminTimeline(complaintId: string) {
  return useQuery({
    queryKey: ["admin", "timeline", complaintId],
    queryFn: async () => {
      const r = await api.get<ComplaintTimelineItem[]>(`/complaints/${complaintId}/timeline`);
      return r.data;
    }
  });
}

export function useAdminAddUpdate() {
  return useMutation({
    mutationFn: async (input: { complaintId: string; message: string; status?: string }) => {
      const r = await api.post(`/complaints/${input.complaintId}/update`, {
        message: input.message,
        status: input.status
      });
      return r.data;
    }
  });
}

export type AdminStats = {
  perCategory: { category: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  averageResolutionHours: number | null;
  medianResolutionHours: number | null;
  complaintsPerInvestigator: { investigator_id: string; handled: number }[];
  caseState: { open_cases: number; closed_cases: number };
};

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const r = await api.get<AdminStats>("/admin/stats");
      return r.data;
    }
  });
}

