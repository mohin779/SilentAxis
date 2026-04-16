import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useStaffLogout } from "../hooks/useStaffAuth";

function SideLink(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        `block rounded-md px-3 py-2 text-sm ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"}`
      }
    >
      {props.label}
    </NavLink>
  );
}

export function StaffLayout() {
  const staff = useAuthStore((s) => s.staff);
  const setStaff = useAuthStore((s) => s.setStaff);
  const nav = useNavigate();
  const logout = useStaffLogout();
  const canSeeAnalytics = ["ORG_ADMIN", "HR", "MANAGER"].includes(staff?.role ?? "");

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/staff/dashboard" className="font-semibold tracking-tight">
            SilentAxis Staff
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600">
              {staff?.email} · {staff?.role}
            </div>
            <button
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={async () => {
                await logout.mutateAsync();
                setStaff(null);
                nav("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-xl border bg-white p-3">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</div>
            <div className="space-y-1">
              <SideLink to="/staff/dashboard" label="Dashboard" />
              {canSeeAnalytics ? <SideLink to="/staff/analytics" label="Analytics" /> : null}
            </div>
          </div>
          <div className="mt-4 rounded-xl border bg-white p-4 text-xs text-slate-600">
            <div className="font-semibold text-slate-800">Tamper detection</div>
            <div className="mt-1">
              Audit actions are hash-chained. Any alteration causes mismatched hashes on verification.
            </div>
          </div>
        </aside>
        <main className="col-span-12 md:col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

