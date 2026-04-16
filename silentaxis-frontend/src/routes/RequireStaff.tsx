import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useStaffMe } from "../hooks/useStaffAuth";

export function RequireStaff(props: { children: React.ReactNode }) {
  const staff = useAuthStore((s) => s.staff);
  const setStaff = useAuthStore((s) => s.setStaff);

  const me = useStaffMe({
    enabled: !staff
  });

  if (staff) return <>{props.children}</>;
  if (me.isLoading) return <div className="rounded-xl border bg-white p-6">Loading session…</div>;
  if (me.data) {
    setStaff(me.data);
    return <>{props.children}</>;
  }
  return <Navigate to="/staff/login" replace />;
}

