import React, { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Input, Label, Select, Textarea } from "../components/ui";
import { api } from "../api/client";
import DOMPurify from "dompurify";

const schema = z.object({
  category: z.enum(["fraud", "harassment", "safety", "corruption", "other"]),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(10_000),
  location: z.string().max(120).optional().or(z.literal(""))
});
type Form = z.infer<typeof schema>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

export function ReportPage() {
  const [result, setResult] = useState<{ complaintId: string; secretKey?: string; hash?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<File | null>(null);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "other",
      title: "",
      description: "",
      location: ""
    }
  });

  const watchedTitle = useWatch({ control: form.control, name: "title" });
  const watchedDescription = useWatch({ control: form.control, name: "description" });

  const sanitizedPreview = useMemo(() => {
    const title = DOMPurify.sanitize(watchedTitle || "");
    const desc = DOMPurify.sanitize(watchedDescription || "");
    return { title, desc };
  }, [watchedTitle, watchedDescription]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Submit anonymous complaint">
        <div className="mb-4 rounded-xl border bg-amber-50 p-4 text-sm text-amber-900">
          You are verified anonymously. <span className="font-semibold">Do not include personal identifiers</span> in
          your text.
        </div>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (v) => {
            setError(null);
            setResult(null);
            try {
              const encryptedComplaint = btoa(
                JSON.stringify({
                  title: v.title,
                  description: v.description,
                  location: v.location || null,
                  createdAt: new Date().toISOString()
                })
              );
              const payload = {
                encryptedComplaint,
                category: v.category
              };

              const r = await api.post<{ complaintId: string; hash: string }>("/complaints", payload, {
                headers: { "x-requires-anon-token": "1" }
              });

              // Evidence upload (optional) uses a separate endpoint in the backend.
              if (evidence) {
                const base64 = await fileToBase64(evidence);
                await api.post(
                  `/complaints/${r.data.complaintId}/evidence`,
                  {
                    fileName: evidence.name,
                    encryptedFileBase64: base64,
                    encryptedKey: "client_encrypted_key_placeholder"
                  },
                  { headers: { "x-requires-anon-token": "1" } }
                );
              }

              setResult({ complaintId: r.data.complaintId, hash: r.data.hash });
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select {...form.register("category")}>
                <option value="fraud">Fraud</option>
                <option value="harassment">Harassment</option>
                <option value="safety">Safety</option>
                <option value="corruption">Corruption</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Optional location</Label>
              <Input placeholder="Site / region (optional)" {...form.register("location")} />
            </div>
          </div>

          <div>
            <Label>Title</Label>
            <Input {...form.register("title")} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={6} {...form.register("description")} />
          </div>

          <div>
            <Label>Evidence upload (optional)</Label>
            <input
              type="file"
              className="mt-1 block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 5 * 1024 * 1024) {
                  setError("Evidence file too large (max 5MB)");
                  setEvidence(null);
                  return;
                }
                setEvidence(f);
              }}
            />
            <div className="mt-1 text-xs text-slate-500">
              The backend stores evidence encrypted; this UI currently sends the file bytes as a placeholder “encrypted”
              payload. For production, encrypt client-side and send ciphertext.
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Automatic privacy proof</div>
            <div className="mt-1 text-xs text-slate-600">
              ZK bundle is generated automatically by the backend in local auto mode. Users do not need to paste Merkle
              root, nullifier hash, or proof JSON manually.
            </div>
          </div>

          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}

          <Button type="submit">Submit complaint</Button>

          {result ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-semibold">Complaint submitted</div>
              <div className="mt-2 grid gap-1">
                <div>
                  <span className="font-semibold">Complaint ID:</span>{" "}
                  <span className="font-mono text-xs">{result.complaintId}</span>
                </div>
                <div>
                  <span className="font-semibold">Hash:</span>{" "}
                  <span className="font-mono text-xs">{result.hash}</span>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-xs text-slate-700">
                Save your complaint access credentials. In this backend build, reporter access is established via the
                reporter session API (complaint ID + secret), which must be created/managed separately.
              </div>
            </div>
          ) : null}
        </form>
      </Card>

      <Card title="Sanitized preview">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500">Title (sanitized)</div>
            <div className="mt-1 rounded-lg border bg-white p-3 text-sm">{sanitizedPreview.title || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Description (sanitized)</div>
            <div className="mt-1 whitespace-pre-wrap rounded-lg border bg-white p-3 text-sm">
              {sanitizedPreview.desc || "—"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

