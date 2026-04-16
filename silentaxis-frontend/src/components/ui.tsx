import React from "react";

export function Card(props: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-6 shadow-sm ${props.className ?? ""}`}>
      {props.title ? <div className="mb-4 text-sm font-semibold text-slate-900">{props.title}</div> : null}
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
      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${props.className ?? ""}`}
    />
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const v = props.variant ?? "primary";
  const cls =
    v === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : "border bg-white text-slate-800 hover:bg-slate-50";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${cls} ${props.className ?? ""}`}
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

