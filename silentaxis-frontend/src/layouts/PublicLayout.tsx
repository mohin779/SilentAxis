import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export function PublicLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/verify" className="font-semibold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-indigo-700 via-violet-700 to-cyan-700 bg-clip-text text-transparent">
              SilentAxis
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              className={`rounded-lg px-3 py-1.5 transition ${
                loc.pathname === "/verify" ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-white hover:text-slate-900"
              }`}
              to="/verify"
            >
              Verify
            </Link>
            <Link
              className={`rounded-lg px-3 py-1.5 transition ${
                loc.pathname === "/report" ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-white hover:text-slate-900"
              }`}
              to="/report"
            >
              Report
            </Link>
            <Link
              className={`rounded-lg px-3 py-1.5 transition ${
                loc.pathname === "/status" ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-white hover:text-slate-900"
              }`}
              to="/status"
            >
              Status
            </Link>
            <Link
              className={`rounded-lg px-3 py-1.5 font-medium shadow-sm transition ${
                loc.pathname === "/login"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-gradient-to-r from-slate-900 to-slate-700 text-white hover:from-slate-800 hover:to-slate-600"
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
      <footer className="border-t border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500">
          No IP logging. No identity stored after verification.
        </div>
      </footer>
    </div>
  );
}

