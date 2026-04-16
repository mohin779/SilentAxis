import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export function PublicLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/verify" className="font-semibold tracking-tight text-slate-900">
            SilentAxis
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link className={loc.pathname === "/verify" ? "text-indigo-700" : "text-slate-700 hover:text-slate-900"} to="/verify">
              Verify
            </Link>
            <Link className={loc.pathname === "/report" ? "text-indigo-700" : "text-slate-700 hover:text-slate-900"} to="/report">
              Report
            </Link>
            <Link className={loc.pathname === "/status" ? "text-indigo-700" : "text-slate-700 hover:text-slate-900"} to="/status">
              Status
            </Link>
            <Link
              className={`rounded-lg px-3 py-1.5 font-medium ${
                loc.pathname === "/login" ? "bg-indigo-50 text-indigo-700" : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
              to="/login"
            >
              Sign in
            </Link>
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

