import React, { useMemo } from "react";
import { Card } from "../../components/ui";
import { useAdminStats } from "../../hooks/useAdmin";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

export function StaffAnalyticsPage() {
  const stats = useAdminStats();

  const categoryData = useMemo(() => {
    const rows = stats.data?.perCategory ?? [];
    return {
      labels: rows.map((r) => r.category),
      datasets: [
        {
          label: "Complaints",
          data: rows.map((r) => r.count),
          backgroundColor: "rgba(79, 70, 229, 0.7)"
        }
      ]
    };
  }, [stats.data]);

  const monthlyData = useMemo(() => {
    const rows = stats.data?.monthlyTrend ?? [];
    return {
      labels: rows.map((r) => r.month),
      datasets: [
        {
          label: "Monthly volume",
          data: rows.map((r) => r.count),
          borderColor: "rgba(15, 23, 42, 0.9)",
          backgroundColor: "rgba(15, 23, 42, 0.1)",
          tension: 0.2
        }
      ]
    };
  }, [stats.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Complaints by category">
          {stats.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : <Bar data={categoryData} />}
        </Card>
        <Card title="Monthly trend">
          {stats.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : <Line data={monthlyData} />}
        </Card>
      </div>

      <Card title="Resolution time">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Avg resolution (hours)</div>
            <div className="mt-1 text-2xl font-semibold">
              {stats.data?.averageResolutionHours ?? "—"}
            </div>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Median resolution (hours)</div>
            <div className="mt-1 text-2xl font-semibold">
              {stats.data?.medianResolutionHours ?? "—"}
            </div>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Open vs closed</div>
            <div className="mt-1 text-sm text-slate-700">
              Open: {stats.data?.caseState?.open_cases ?? "—"} · Closed: {stats.data?.caseState?.closed_cases ?? "—"}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Automation note">
        <div className="text-sm text-slate-700">
          Escalations are triggered automatically by backend rules (48h timeout + pattern detection). When an escalation
          is triggered, the complaint timeline includes a system entry and staff should treat it as higher priority.
        </div>
      </Card>
    </div>
  );
}

