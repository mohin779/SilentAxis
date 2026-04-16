import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function PublicLayout() {
  const loc = useLocation();
  const anon = useAuthStore((s) => s.anonymousToken);
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/verify" className="font-semibold tracking-tight">
            SilentAxis
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link className={loc.pathname === "/verify" ? "text-indigo-700" : "text-slate-700"} to="/verify">
              Verify
            </Link>
            <Link className={loc.pathname === "/report" ? "text-indigo-700" : "text-slate-700"} to="/report">
              Report
            </Link>
            <Link className={loc.pathname === "/status" ? "text-indigo-700" : "text-slate-700"} to="/status">
              Status
            </Link>
            <Link className="text-slate-700" to="/staff/login">
              Staff
            </Link>
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {anon ? "Anon token: active" : "Anon token: none"}
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500">
          No IP logging. No identity stored after verification.
        </div>
      </footer>
    </div>
  );
}

