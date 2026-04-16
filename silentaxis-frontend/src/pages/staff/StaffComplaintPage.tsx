import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAdminAddUpdate, useAdminTimeline } from "../../hooks/useAdmin";
import { useAuthStore } from "../../store/authStore";
import { Badge, Button, Card, Select, Textarea } from "../../components/ui";

export function StaffComplaintPage() {
  const { id } = useParams();
  const staff = useAuthStore((s) => s.staff)!;
  const timeline = useAdminTimeline(String(id));
  const addUpdate = useAdminAddUpdate();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>("");

  const canUpdate = useMemo(() => ["ORG_ADMIN", "ORG_STAFF", "HR"].includes(staff.role), [staff.role]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-600">Complaint</div>
          <div className="font-mono text-xs text-slate-900">{id}</div>
        </div>
        <div className="flex gap-2">
          <Badge tone={canUpdate ? "success" : "neutral"}>{canUpdate ? "Can update status" : "Read-only"}</Badge>
          <Badge tone="neutral">Role: {staff.role}</Badge>
        </div>
      </div>

      <Card title="Timeline (append-only)">
        {timeline.isLoading ? (
          <div className="text-sm text-slate-600">Loading…</div>
        ) : timeline.error ? (
          <div className="text-sm text-rose-700">{(timeline.error as Error).message}</div>
        ) : (
          <div className="space-y-3">
            {(timeline.data ?? []).map((t) => {
              const autoEsc = /auto-escalation|System escalation/i.test(t.message);
              return (
                <div key={t.id} className="rounded-lg border bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-900">{t.message}</div>
                    <div className="flex items-center gap-2">
                      {autoEsc ? <Badge tone="warning">AUTO ESCALATED</Badge> : null}
                      <div className="text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-xs text-slate-500">
          Bias protection: system-triggered escalation entries are added automatically to prevent suppression.
        </div>
      </Card>

      <Card title="Status update">
        {!canUpdate ? (
          <div className="text-sm text-slate-600">Your role is read-only for complaint updates.</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">New status (optional)</div>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">No status change</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="DISMISSED">DISMISSED</option>
              </Select>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Update message</div>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  await addUpdate.mutateAsync({ complaintId: String(id), message, status: status || undefined });
                  setMessage("");
                  setStatus("");
                  await timeline.refetch();
                }}
                disabled={addUpdate.isPending || !message.trim()}
              >
                {addUpdate.isPending ? "Saving…" : "Add update"}
              </Button>
              {addUpdate.error ? <div className="text-sm text-rose-700">{(addUpdate.error as Error).message}</div> : null}
            </div>
          </div>
        )}
      </Card>

      <Card title="Audit & tamper detection (UI note)">
        <div className="text-sm text-slate-700">
          This backend stores a hash chain in <span className="font-mono text-xs">org_audit_logs</span>. A full audit
          timeline endpoint is not exposed yet; when it is, this page should render (action, timestamp, hash,
          previous_hash) and verify continuity client-side.
        </div>
      </Card>
    </div>
  );
}

