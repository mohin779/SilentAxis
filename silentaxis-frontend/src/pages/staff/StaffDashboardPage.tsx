import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Select, Badge } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { useAdminComplaints } from "../../hooks/useAdmin";

export function StaffDashboardPage() {
  const staff = useAuthStore((s) => s.staff)!;
  const [category, setCategory] = useState<string>("");
  const [page] = useState(1);

  const q = useAdminComplaints({
    orgId: staff.orgId,
    page,
    limit: 20,
    category: category ? (category as any) : undefined
  });

  const rows = q.data?.data ?? [];
  const summary = useMemo(() => {
    const open = rows.filter((r) => ["SUBMITTED", "UNDER_REVIEW", "INVESTIGATING"].includes(r.complaint_status)).length;
    const closed = rows.length - open;
    return { open, closed };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-slate-600">Organization</div>
          <div className="text-lg font-semibold">{staff.orgId}</div>
        </div>
        <div className="flex gap-2">
          <Badge tone="neutral">Open: {summary.open}</Badge>
          <Badge tone="success">Closed: {summary.closed}</Badge>
        </div>
      </div>

      <Card title="Complaints">
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</div>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              <option value="fraud">Fraud</option>
              <option value="harassment">Harassment</option>
              <option value="safety">Safety</option>
              <option value="corruption">Corruption</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="text-xs text-slate-500 md:col-span-2">
            Note: evidence is stored encrypted; complaint content is encrypted on the backend.
          </div>
        </div>

        {q.isLoading ? (
          <div className="text-sm text-slate-600">Loading…</div>
        ) : q.error ? (
          <div className="text-sm text-rose-700">{(q.error as Error).message}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b">
                  <th className="py-2">Complaint ID</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">
                      <Link className="text-indigo-700 hover:underline" to={`/staff/complaint/${r.id}`}>
                        {r.id}
                      </Link>
                    </td>
                    <td className="capitalize">{r.category}</td>
                    <td>
                      <Badge
                        tone={
                          r.complaint_status === "SUBMITTED"
                            ? "warning"
                            : r.complaint_status === "RESOLVED" || r.complaint_status === "DISMISSED"
                              ? "success"
                              : "neutral"
                        }
                      >
                        {r.complaint_status}
                      </Badge>
                    </td>
                    <td className="text-slate-600">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

