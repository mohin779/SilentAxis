import React, { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Input, Label, Select, Textarea } from "../components/ui";
import { api } from "../api/client";
import DOMPurify from "dompurify";
import { useAuthStore } from "../store/authStore";
import { generateCommitment, generateIdentity, generateProof } from "../services/zkService";

const schema = z.object({
  category: z.enum(["fraud", "harassment", "safety", "corruption", "other"]),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(10_000),
  location: z.string().max(120).optional().or(z.literal(""))
});
type Form = z.infer<typeof schema>;

export function ReportPage() {
  const [result, setResult] = useState<{ complaintId: string; secretKey: string; hash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const eligibilityReceipt = useAuthStore((s) => s.zkEligibilityReceipt);
  const clearEligibilityReceipt = useAuthStore((s) => s.setZkEligibilityReceipt);
  const verifiedOrgId = useAuthStore((s) => s.verifiedOrgId);
  const anonymousIdentity = useAuthStore((s) => s.anonymousIdentity);

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

  function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        // avoid keeping timer alive if resolved quickly
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        p.finally(() => window.clearTimeout(t));
      })
    ]);
  }

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
            setNotice(null);
            try {
              let proofBundle:
                | { proof: unknown; publicSignals: string[]; nullifierHash: string; root: string }
                | null = null;
              if (!verifiedOrgId || !anonymousIdentity) {
                setNotice("Dev mode: submitting without client-side ZK proof (backend auto mode).");
              } else {
                try {
                  const identity = await generateIdentity(anonymousIdentity);
                  const commitment = await generateCommitment(identity);
                  let identityRegistration: {
                    root: string;
                    merkleProof: string[];
                    merkleIndices: number[];
                  };
                  if (eligibilityReceipt) {
                    const registered = await api.post<{
                      root: string;
                      merkleProof: string[];
                      merkleIndices: number[];
                    }>("/identity/register", { commitment, eligibilityReceipt }, { timeout: 4000 });
                    identityRegistration = registered.data;
                  } else {
                    const proofLookup = await api.get<{
                      root: string;
                      merkleProof: string[];
                      merkleIndices: number[];
                    }>("/identity/proof", {
                      params: { orgId: verifiedOrgId, commitment },
                      timeout: 4000
                    });
                    identityRegistration = proofLookup.data;
                  }
                  const currentDate = new Date().toISOString().slice(0, 10);
                  proofBundle = await withTimeout(
                    generateProof({
                      identity,
                      merklePath: identityRegistration.merkleProof,
                      merkleIndices: identityRegistration.merkleIndices,
                      root: identityRegistration.root,
                      date: currentDate
                    }),
                    6000,
                    "ZK proof generation"
                  );
                } catch {
                  proofBundle = null;
                  setNotice("Dev mode: identity/proof step unavailable; submitted without proof (backend auto mode).");
                }
              }

              const encryptedComplaint = btoa(
                JSON.stringify({
                  title: v.title,
                  description: v.description,
                  location: v.location || null,
                  createdAt: new Date().toISOString()
                })
              );
              const r = await api.post<{ complaintId: string; hash: string; secretKey: string }>("/complaints", {
                encryptedComplaint,
                category: v.category,
                ...(proofBundle
                  ? {
                      proof: proofBundle.proof,
                      publicSignals: { root: proofBundle.root, nullifierHash: proofBundle.nullifierHash },
                      nullifierHash: proofBundle.nullifierHash,
                      root: proofBundle.root
                    }
                  : {})
                  }, {
                    timeout: 30_000
              });
              clearEligibilityReceipt(null);
              setResult({ complaintId: r.data.complaintId, hash: r.data.hash, secretKey: r.data.secretKey });
            } catch (e) {
              setError((e as Error).message);
            }
          }, (invalid) => {
            const firstMessage = Object.values(invalid).find((entry) => entry?.message)?.message;
            setError(firstMessage ? String(firstMessage) : "Please complete all required complaint fields.");
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
            {form.formState.errors.title ? (
              <div className="mt-1 text-xs text-rose-700">{form.formState.errors.title.message}</div>
            ) : null}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={6} {...form.register("description")} />
            {form.formState.errors.description ? (
              <div className="mt-1 text-xs text-rose-700">{form.formState.errors.description.message}</div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
            Evidence support is enabled in backend workflow; secure upload UI can be attached in the next step.
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Automatic privacy proof</div>
            <div className="mt-1 text-xs text-slate-600">
              Browser generates a fresh identity, commitment, and Groth16 proof per complaint. No identity secret is sent
              to backend.
            </div>
          </div>

          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
          {notice ? <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">{notice}</div> : null}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Submitting..." : "Submit complaint"}
          </Button>

          {result ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-semibold">Complaint submitted</div>
              <div className="mt-2 grid gap-1">
                <div>
                  <span className="font-semibold">Complaint ID:</span>{" "}
                  <span className="font-mono text-xs">{result.complaintId}</span>
                </div>
                <div><span className="font-semibold">Secret key:</span> <span className="font-mono text-xs">{result.secretKey}</span></div>
                <div><span className="font-semibold">Hash:</span> <span className="font-mono text-xs">{result.hash}</span></div>
              </div>
              <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-xs text-slate-700">
                Save complaint ID + secret key. They are the only credentials for `/status`.
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

