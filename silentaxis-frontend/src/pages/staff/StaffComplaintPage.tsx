import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useAdminAddUpdate,
  useAdminApprovalDecision,
  useAdminComplaintDetail,
  useAdminRequestProof,
  useAdminTimeline
} from "../../hooks/useAdmin";
import { useAuthStore } from "../../store/authStore";
import { Badge, Button, Card, Select, Textarea } from "../../components/ui";

export function StaffComplaintPage() {
  const { id } = useParams();
  const staff = useAuthStore((s) => s.staff)!;
  const timeline = useAdminTimeline(String(id));
  const detail = useAdminComplaintDetail(String(id));
  const addUpdate = useAdminAddUpdate();
  const decide = useAdminApprovalDecision();
  const requestProof = useAdminRequestProof();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>("");
  const [proofRequestMessage, setProofRequestMessage] = useState("");

  const canUpdate = useMemo(() => ["ORG_ADMIN", "ORG_STAFF", "HR"].includes(staff.role), [staff.role]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-5 text-white shadow-lg">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Case Workspace</div>
        <div className="mt-2 text-xl font-semibold tracking-tight">Complaint review, approval and reporter coordination</div>
      </div>
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

      <Card title="Timeline (append-only)" className="bg-gradient-to-b from-white to-indigo-50/20">
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

      <Card title="Approval panel" className="bg-gradient-to-b from-white to-violet-50/20">
        {detail.isLoading ? (
          <div className="text-sm text-slate-600">Loading...</div>
        ) : detail.error ? (
          <div className="text-sm text-rose-700">{(detail.error as Error).message}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge tone={detail.data?.visibility_status === "APPROVED" ? "success" : "warning"}>
                {detail.data?.visibility_status}
              </Badge>
              <Badge tone="neutral">Case: {detail.data?.complaint_status}</Badge>
            </div>
            <div className="space-y-2">
              {(detail.data?.approvals ?? []).map((a) => (
                <div key={a.authority_role} className="rounded border p-2 text-xs">
                  <span className="font-semibold">{a.authority_role}</span>: {a.status}
                </div>
              ))}
            </div>
            {["HR", "MANAGER", "REGIONAL_OFFICER"].includes(staff.role) ? (
              <div className="flex gap-2">
                <Button onClick={() => decide.mutateAsync({ complaintId: String(id), status: "APPROVED" }).then(() => detail.refetch())}>
                  Approve
                </Button>
                <Button variant="secondary" onClick={() => decide.mutateAsync({ complaintId: String(id), status: "REJECTED" }).then(() => detail.refetch())}>
                  Reject
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card title="Complaint content" className="bg-gradient-to-b from-white to-slate-50/70">
        {detail.data?.content_locked ? (
          <div className="text-sm text-amber-700">Content locked until approval.</div>
        ) : (
          <pre className="whitespace-pre-wrap rounded border bg-slate-50 p-3 text-sm">{detail.data?.content?.description ?? ""}</pre>
        )}
      </Card>

      <Card title="Status update" className="bg-gradient-to-b from-white to-cyan-50/20">
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
                <option value="REJECTED">REJECTED</option>
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

      <Card title="Request proof from reporter" className="bg-gradient-to-b from-white to-amber-50/30">
        {["HR", "MANAGER", "REGIONAL_OFFICER"].includes(staff.role) ? (
          <div className="space-y-3">
            <div className="text-xs text-slate-600">
              Ask the reporter for supporting documents or additional context. This request appears on the status page.
            </div>
            <Textarea
              value={proofRequestMessage}
              onChange={(e) => setProofRequestMessage(e.target.value)}
              rows={3}
              placeholder="Please upload any supporting proof (documents, screenshots, recordings) if available."
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  await requestProof.mutateAsync({ complaintId: String(id), message: proofRequestMessage });
                  setProofRequestMessage("");
                  await timeline.refetch();
                }}
                disabled={requestProof.isPending || proofRequestMessage.trim().length < 5}
              >
                {requestProof.isPending ? "Sending..." : "Request proof"}
              </Button>
              {requestProof.error ? <div className="text-sm text-rose-700">{(requestProof.error as Error).message}</div> : null}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">Only approval authorities can request proof.</div>
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

