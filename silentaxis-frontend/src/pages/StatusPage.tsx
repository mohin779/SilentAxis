import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api/client";
import { Badge, Button, Card, Input, Label, Textarea } from "../components/ui";

const schema = z.object({
  complaintId: z.string().uuid(),
  secret: z.string().min(8),
  message: z.string().max(5000).optional().or(z.literal(""))
});
type Form = z.infer<typeof schema>;

type MessageRow = {
  id: string;
  complaint_id: string;
  sender_type: "reporter" | "investigator";
  encrypted_message: string;
  created_at: string;
};

export function StatusPage() {
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { complaintId: "", secret: "", message: "" }
  });

  async function refresh(complaintId: string) {
    const r = await api.get<MessageRow[]>(`/reporter/messages/${complaintId}`);
    setMessages(r.data);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Access your complaint">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (v) => {
            setError(null);
            try {
              await api.post("/reporter/login", { complaintId: v.complaintId, secret: v.secret });
              await api.post("/reporter/session", { complaintId: v.complaintId, secret: v.secret });
              setLoggedIn(true);
              await refresh(v.complaintId);
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
            <Input placeholder="Secret" {...form.register("secret")} />
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

      <Card title="Messages (anonymous)">
        {!loggedIn ? (
          <div className="text-sm text-slate-600">Login with complaint ID + secret key to view messages.</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
              Messages are stored encrypted in the backend. This UI shows ciphertext (backend does not expose plaintext
              decryption for reporters).
            </div>
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <Badge tone={m.sender_type === "investigator" ? "neutral" : "success"}>{m.sender_type}</Badge>
                    <div className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-slate-700 break-all">{m.encrypted_message}</div>
                </div>
              ))}
            </div>

            <form
              className="space-y-2"
              onSubmit={form.handleSubmit(async (v) => {
                setError(null);
                try {
                  if (!v.message?.trim()) return;
                  await api.post("/reporter/message", {
                    complaintId: v.complaintId,
                    senderType: "reporter",
                    message: v.message
                  });
                  form.setValue("message", "");
                  await refresh(v.complaintId);
                } catch (e) {
                  setError((e as Error).message);
                }
              })}
            >
              <div>
                <Label>Reply (anonymous)</Label>
                <Textarea rows={3} {...form.register("message")} />
              </div>
              <Button type="submit">Send reply</Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}

