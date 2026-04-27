import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api/client";
import { Button, Card, Input, Label } from "../components/ui";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

const startSchema = z.object({
  employeeIdentifier: z.string().min(3).max(320)
});
type StartForm = z.infer<typeof startSchema>;

const otpSchema = z.object({
  otp: z.string().regex(/^[0-9]{6}$/)
});
type OtpForm = z.infer<typeof otpSchema>;

export function VerifyPage() {
  const nav = useNavigate();
  const setEligibilityReceipt = useAuthStore((s) => s.setZkEligibilityReceipt);
  const setVerifiedOrgId = useAuthStore((s) => s.setVerifiedOrgId);
  const setAnonymousIdentity = useAuthStore((s) => s.setAnonymousIdentity);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startForm = useForm<StartForm>({
    resolver: zodResolver(startSchema),
    defaultValues: {
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
          After verification, the system issues a <span className="font-semibold">one-time eligibility receipt</span>
          used only to register a ZK commitment.
        </p>
        <p className="text-xs text-slate-500">
          Security rule: no long-lived identity token is created or stored.
        </p>
      </div>
    ),
    []
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 p-6 text-white shadow-lg">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Anonymous Access</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">Verify securely before complaint submission</div>
        <div className="mt-2 max-w-3xl text-sm text-indigo-50/95">
          Identity is verified via OTP and converted to an anonymous eligibility receipt. No direct reporter identity is
          exposed in complaint handling.
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
      <Card title="Verify employee identity">
        {!challengeId ? (
          <form
            className="space-y-4"
            onSubmit={startForm.handleSubmit(async (v) => {
              setError(null);
              setStatus(null);
              try {
                const r = await api.post<{ challengeId: string; devOtp?: string }>("/auth/verify-employee", {
                  orgId: "11111111-1111-1111-1111-111111111111",
                  employeeIdentifier: v.employeeIdentifier
                });
                setChallengeId(r.data.challengeId);
                setDevOtp(r.data.devOtp ?? null);
                setStatus("OTP sent. Check your official email.");
              } catch (e) {
                setError((e as Error).message);
              }
            })}
          >
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
                const r = await api.post<{
                  verified: boolean;
                  eligibilityReceipt: string;
                  orgId: string;
                  anonymousIdentity: { identityNullifier: string; identityTrapdoor: string; commitment: string };
                }>("/auth/verify-otp", { challengeId, otp: v.otp });
                setEligibilityReceipt(r.data.eligibilityReceipt);
                setVerifiedOrgId(r.data.orgId);
                setAnonymousIdentity(r.data.anonymousIdentity);
                setStatus("OTP verified. Redirecting to complaint submission.");
                nav("/report", { replace: true });
              } catch (e) {
                setError((e as Error).message);
              }
            })}
          >
            <div className="text-sm text-slate-700">
              Enter the 6-digit OTP.
              <div className="mt-1 text-xs text-slate-500">Challenge: {challengeId}</div>
              {devOtp ? (
                <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                  Dev OTP: {devOtp}
                </div>
              ) : null}
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
                  setDevOtp(null);
                  otpForm.reset();
                }}
              >
                Start over
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Why this is safe" className="bg-gradient-to-b from-white to-indigo-50/40">{explanation}</Card>
      </div>
    </div>
  );
}

