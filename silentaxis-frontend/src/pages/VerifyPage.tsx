import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api/client";
import { Button, Card, Input, Label } from "../components/ui";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

const startSchema = z.object({
  orgId: z.string().uuid(),
  employeeIdentifier: z.string().min(3).max(320)
});
type StartForm = z.infer<typeof startSchema>;

const otpSchema = z.object({
  otp: z.string().regex(/^[0-9]{6}$/)
});
type OtpForm = z.infer<typeof otpSchema>;

export function VerifyPage() {
  const nav = useNavigate();
  const setAnon = useAuthStore((s) => s.setAnonymousToken);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startForm = useForm<StartForm>({
    resolver: zodResolver(startSchema),
    defaultValues: {
      orgId: "11111111-1111-1111-1111-111111111111",
      employeeIdentifier: ""
    }
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" }
  });

  const explanation = useMemo(
    () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Anonymous verification</p>
        <p>
          We verify you are a real employee via OTP routed to your organization email.
          After verification, the system issues an <span className="font-semibold">anonymous access token</span> and
          immediately removes the identity linkage.
        </p>
        <p className="text-xs text-slate-500">
          Security rule: the anonymous token is stored only in memory (not localStorage, not cookies).
        </p>
      </div>
    ),
    []
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Verify employee identity">
        {!challengeId ? (
          <form
            className="space-y-4"
            onSubmit={startForm.handleSubmit(async (v) => {
              setError(null);
              setStatus(null);
              try {
                const r = await api.post<{ challengeId: string }>("/auth/verify-employee", v);
                setChallengeId(r.data.challengeId);
                setStatus("OTP sent. Check your official email.");
              } catch (e) {
                setError((e as Error).message);
              }
            })}
          >
            <div>
              <Label>Organization ID</Label>
              <Input {...startForm.register("orgId")} />
              {startForm.formState.errors.orgId ? (
                <div className="mt-1 text-xs text-rose-700">{startForm.formState.errors.orgId.message}</div>
              ) : null}
            </div>
            <div>
              <Label>Employee ID or email</Label>
              <Input placeholder="employee123 or employee123@company.com" {...startForm.register("employeeIdentifier")} />
              {startForm.formState.errors.employeeIdentifier ? (
                <div className="mt-1 text-xs text-rose-700">
                  {startForm.formState.errors.employeeIdentifier.message}
                </div>
              ) : null}
            </div>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
            {status ? <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">{status}</div> : null}
            <Button type="submit">Send OTP</Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={otpForm.handleSubmit(async (v) => {
              setError(null);
              setStatus(null);
              try {
                const r = await api.post<{ token: string; tokenType: string }>("/auth/verify-otp", {
                  challengeId,
                  otp: v.otp
                });
                setAnon(r.data.token);
                setStatus("You are now verified anonymously. Your identity is not stored.");
                nav("/report", { replace: true });
              } catch (e) {
                setError((e as Error).message);
              }
            })}
          >
            <div className="text-sm text-slate-700">
              Enter the 6-digit OTP.
              <div className="mt-1 text-xs text-slate-500">Challenge: {challengeId}</div>
            </div>
            <div>
              <Label>OTP</Label>
              <Input inputMode="numeric" placeholder="123456" {...otpForm.register("otp")} />
              {otpForm.formState.errors.otp ? (
                <div className="mt-1 text-xs text-rose-700">{otpForm.formState.errors.otp.message}</div>
              ) : null}
            </div>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
            {status ? <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">{status}</div> : null}
            <div className="flex gap-3">
              <Button type="submit">Verify OTP</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setChallengeId(null);
                  otpForm.reset();
                }}
              >
                Start over
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Why this is safe">{explanation}</Card>
    </div>
  );
}

