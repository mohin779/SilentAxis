import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { StaffLayout } from "./layouts/StaffLayout";
import { VerifyPage } from "./pages/VerifyPage";
import { ReportPage } from "./pages/ReportPage";
import { StatusPage } from "./pages/StatusPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { StaffDashboardPage } from "./pages/staff/StaffDashboardPage";
import { StaffComplaintPage } from "./pages/staff/StaffComplaintPage";
import { StaffAnalyticsPage } from "./pages/staff/StaffAnalyticsPage";
import { EmployeeAdminPage } from "./pages/staff/EmployeeAdminPage";
import { RequireAnonToken } from "./routes/RequireAnonToken";
import { RequireStaff } from "./routes/RequireStaff";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/verify" replace /> },
      { path: "verify", element: <VerifyPage /> },
      {
        path: "report",
        element: (
          <RequireAnonToken>
            <ReportPage />
          </RequireAnonToken>
        )
      },
      { path: "status", element: <StatusPage /> },
      { path: "profile", element: <ProfilePage /> }
    ]
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/staff/login", element: <Navigate to="/login" replace /> },
  {
    path: "/staff",
    element: (
      <RequireStaff>
        <StaffLayout />
      </RequireStaff>
    ),
    children: [
      { path: "dashboard", element: <StaffDashboardPage /> },
      { path: "complaint/:id", element: <StaffComplaintPage /> },
      { path: "analytics", element: <StaffAnalyticsPage /> },
      { path: "employees", element: <EmployeeAdminPage /> }
    ]
  }
]);

