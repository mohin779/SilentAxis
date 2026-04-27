import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function RequireAnonToken(props: { children: React.ReactNode }) {
  const anonymousIdentity = useAuthStore((s) => s.anonymousIdentity);
  if (!anonymousIdentity) return <Navigate to="/verify" replace />;
  return <>{props.children}</>;
}

