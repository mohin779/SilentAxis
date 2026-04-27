import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useStaffLogout } from "../hooks/useStaffAuth";

function SideLink(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 text-sm transition ${
          isActive
            ? "bg-gradient-to-r from-indigo-50 to-cyan-50 text-indigo-700 shadow-sm"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        }`
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
  const isAdmin = staff?.role === "ORG_ADMIN";

  return (
    <div className="min-h-full bg-transparent">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/staff/dashboard" className="font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-700 via-violet-700 to-cyan-700 bg-clip-text text-transparent">
              SilentAxis Staff
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
              {staff?.email} · {staff?.role}
            </div>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-50"
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
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</div>
            <div className="space-y-1">
              <SideLink to="/staff/dashboard" label="Dashboard" />
              {canSeeAnalytics ? <SideLink to="/staff/analytics" label="Analytics" /> : null}
              {isAdmin ? <SideLink to="/staff/employees" label="Employees" /> : null}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50 p-4 text-xs text-slate-700 shadow-sm">
            <div className="font-semibold text-slate-900">Tamper detection</div>
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

