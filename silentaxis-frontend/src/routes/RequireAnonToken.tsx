import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function RequireAnonToken(props: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.anonymousToken);
  if (!token) return <Navigate to="/verify" replace />;
  return <>{props.children}</>;
}

