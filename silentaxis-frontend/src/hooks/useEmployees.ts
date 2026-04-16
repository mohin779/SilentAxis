import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export type EmployeeRow = {
  id: string;
  org_id: string;
  employee_identifier: string;
  official_email: string;
  created_at: string;
};

export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: ["admin", "employees"],
    enabled,
    queryFn: async () => {
      const r = await api.get<EmployeeRow[]>("/admin/employees");
      return r.data;
    }
  });
}

export function useAddEmployee() {
  return useMutation({
    mutationFn: async (input: { employeeIdentifier: string; officialEmail: string }) => {
      const r = await api.post("/admin/employees", input);
      return r.data;
    }
  });
}

export function useImportEmployeesCsv() {
  return useMutation({
    mutationFn: async (csvText: string) => {
      const r = await api.post<{ status: string; insertedOrUpdated: number; rejected: Array<{ row: number; reason: string }> }>(
        "/admin/employees/import",
        { csvText }
      );
      return r.data;
    }
  });
}

