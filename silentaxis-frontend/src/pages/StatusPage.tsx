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

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { complaintId: "", secretKey: "" }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Access your complaint">
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

      <Card title="Complaint timeline">
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
          </div>
        )}
      </Card>
    </div>
  );
}

