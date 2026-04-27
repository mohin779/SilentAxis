import React from "react";

export function Card(props: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-16px_rgba(30,41,59,0.45)] ${props.className ?? ""}`}
    >
      {props.title ? (
        <div className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold tracking-wide text-slate-900">
          {props.title}
        </div>
      ) : null}
      {props.children}
    </div>
  );
}

export function Label(props: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{props.children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-1 w-full rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-1 w-full rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-1 w-full rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${props.className ?? ""}`}
    />
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const v = props.variant ?? "primary";
  const cls =
    v === "primary"
      ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-sm hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700"
      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${cls} ${props.className ?? ""}`}
    />
  );
}

export function Badge(props: { children: React.ReactNode; tone?: "neutral" | "warning" | "danger" | "success" }) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "warning"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : tone === "danger"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : tone === "success"
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-slate-50 text-slate-700 border-slate-200";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{props.children}</span>;
}

