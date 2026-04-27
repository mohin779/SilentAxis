import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api/client";
import { Badge, Button, Card, Input, Label } from "../components/ui";

const schema = z.object({
  complaintId: z.string().uuid(),
  secretKey: z.string().min(8)
});
type Form = z.infer<typeof schema>;

type TimelineRow = {
  id: string;
  message: string;
  created_at: string;
};

export function StatusPage() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ status: string; visibilityStatus: string; timeline: TimelineRow[] } | null>(null);
  const [proofMessage, setProofMessage] = useState("");
  const [noProofReason, setNoProofReason] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofActionError, setProofActionError] = useState<string | null>(null);
  const [proofActionOk, setProofActionOk] = useState<string | null>(null);
  const [isSendingProof, setIsSendingProof] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { complaintId: "", secretKey: "" }
  });

  const hasProofRequest = (status?.timeline ?? []).some((m) => m.message.startsWith("PROOF_REQUEST:"));

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Reporter Console</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">Track progress and respond to proof requests</div>
        <div className="mt-2 max-w-3xl text-sm text-cyan-50">
          Enter complaint credentials to monitor timeline updates and securely provide additional details when requested.
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Access your complaint" className="bg-gradient-to-b from-white to-cyan-50/30">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (v) => {
            setError(null);
            try {
              const r = await api.get<{ status: string; visibilityStatus: string; timeline: TimelineRow[] }>("/complaints/status", {
                params: { complaintId: v.complaintId, secretKey: v.secretKey }
              });
              setStatus(r.data);
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <div>
            <Label>Complaint ID</Label>
            <Input placeholder="UUID" {...form.register("complaintId")} />
          </div>
          <div>
            <Label>Secret key</Label>
            <Input placeholder="Secret key" {...form.register("secretKey")} />
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
          ) : null}

          <Button type="submit">Open complaint</Button>

          <div className="mt-2 text-xs text-slate-500">
            Security note: this page never asks for your employee ID/email. Only complaint credentials.
          </div>
        </form>
      </Card>

      <Card title="Complaint timeline" className="bg-gradient-to-b from-white to-indigo-50/30">
        {!status ? (
          <div className="text-sm text-slate-600">Use complaint ID + secret key to view status.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge tone="neutral">Status: {status.status}</Badge>
              <Badge tone={status.visibilityStatus === "APPROVED" ? "success" : "warning"}>
                Approval: {status.visibilityStatus}
              </Badge>
            </div>
            <div className="space-y-2">
              {status.timeline.map((m) => (
                <div key={m.id} className="rounded-lg border bg-white p-3">
                  <div className="text-sm text-slate-900">{m.message}</div>
                  <div className="mt-1 text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
            {hasProofRequest ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 text-sm font-semibold text-amber-900">Proof requested by admin</div>
                <div className="mb-3 text-xs text-amber-800">
                  Provide any supporting proof if available. If you do not have any document, mention that in the note.
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Your response</Label>
                    <Input
                      placeholder="Share your response or context"
                      value={proofMessage}
                      onChange={(e) => setProofMessage(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Optional document upload</Label>
                    <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <div>
                    <Label>If no proof available (optional)</Label>
                    <Input
                      placeholder="I do not have additional proof right now."
                      value={noProofReason}
                      onChange={(e) => setNoProofReason(e.target.value)}
                    />
                  </div>
                  {proofActionError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{proofActionError}</div>
                  ) : null}
                  {proofActionOk ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{proofActionOk}</div>
                  ) : null}
                  <Button
                    onClick={async () => {
                      setProofActionError(null);
                      setProofActionOk(null);
                      setIsSendingProof(true);
                      try {
                        const values = form.getValues();
                        const payload: {
                          complaintId: string;
                          secretKey: string;
                          message: string;
                          noProofReason?: string;
                          fileName?: string;
                          fileBase64?: string;
                        } = {
                          complaintId: values.complaintId,
                          secretKey: values.secretKey,
                          message: proofMessage || "Reporter provided proof update",
                          noProofReason: noProofReason || undefined
                        };
                        if (proofFile) {
                          payload.fileName = proofFile.name;
                          payload.fileBase64 = await fileToBase64(proofFile);
                        }
                        await api.post("/complaints/status/proof", payload, { timeout: 30_000 });
                        setProofActionOk("Proof response submitted successfully.");
                        setProofMessage("");
                        setNoProofReason("");
                        setProofFile(null);
                        const refreshed = await api.get<{ status: string; visibilityStatus: string; timeline: TimelineRow[] }>("/complaints/status", {
                          params: { complaintId: values.complaintId, secretKey: values.secretKey }
                        });
                        setStatus(refreshed.data);
                      } catch (e) {
                        setProofActionError((e as Error).message);
                      } finally {
                        setIsSendingProof(false);
                      }
                    }}
                    disabled={isSendingProof || (!proofMessage.trim() && !proofFile && !noProofReason.trim())}
                  >
                    {isSendingProof ? "Submitting..." : "Submit proof response"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                No proof request from admin yet. If requested, you can reply here with document or message.
              </div>
            )}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

