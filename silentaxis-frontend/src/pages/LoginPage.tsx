import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Input, Label } from "../components/ui";
import { useStaffLogin } from "../hooks/useStaffAuth";
import { useAuthStore } from "../store/authStore";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});
type Form = z.infer<typeof schema>;

function roleHome(role: string | undefined) {
  // Today the staff portal shares one shell; this keeps redirects future-proof.
  switch (role) {
    case "ORG_ADMIN":
    case "ORG_STAFF":
    case "HR":
    case "MANAGER":
    case "REGIONAL_OFFICER":
      return "/staff/dashboard";
    default:
      return "/staff/dashboard";
  }
}

export function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const setStaff = useAuthStore((s) => s.setStaff);
  const login = useStaffLogin();
  const [error, setError] = useState<string | null>(null);

  const from = params.get("from");
  const target = useMemo(() => (from && from.startsWith("/") ? from : null), [from]);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-2 lg:items-center">
      <div className="space-y-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Staff portal</div>
        <div className="text-3xl font-semibold tracking-tight text-slate-900">Sign in to manage complaints</div>
        <div className="text-sm leading-6 text-slate-600">
          Use your organization email and password. Your account role (Admin, HR, Manager, Staff) is detected
          automatically after authentication.
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-700">
          Privacy note: reporter identities remain protected. Staff actions are audit logged and tamper-evident.
        </div>
      </div>

      <div>
        <Card title="Sign in">
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (v) => {
              setError(null);
              try {
                const staff = await login.mutateAsync(v);
                setStaff(staff);
                nav(target ?? roleHome(staff.role), { replace: true });
              } catch (e) {
                setError((e as Error).message);
              }
            })}
          >
            <div>
              <Label>Email</Label>
              <Input placeholder="you@company.com" autoComplete="username" {...form.register("email")} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" autoComplete="current-password" {...form.register("password")} />
            </div>
            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
            ) : null}
            <Button type="submit" disabled={login.isPending} className="w-full">
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
            <div className="text-xs text-slate-500">
              Access is restricted to authorized staff accounts. If you don’t have access, contact your organization
              administrator.
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

