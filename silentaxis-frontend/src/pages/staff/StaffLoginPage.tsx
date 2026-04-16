import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Input, Label } from "../../components/ui";
import { useStaffLogin } from "../../hooks/useStaffAuth";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});
type Form = z.infer<typeof schema>;

export function StaffLoginPage() {
  const nav = useNavigate();
  const setStaff = useAuthStore((s) => s.setStaff);
  const login = useStaffLogin();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card title="Staff login">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (v) => {
            setError(null);
            try {
              const staff = await login.mutateAsync(v);
              setStaff(staff);
              nav("/staff/dashboard", { replace: true });
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <div>
            <Label>Email</Label>
            <Input placeholder="hr@acme.com" {...form.register("email")} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" {...form.register("password")} />
          </div>
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
          ) : null}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
          <div className="text-xs text-slate-500">
            This is a staff-only portal. Reporter identities are never displayed.
          </div>
        </form>
      </Card>
    </div>
  );
}

