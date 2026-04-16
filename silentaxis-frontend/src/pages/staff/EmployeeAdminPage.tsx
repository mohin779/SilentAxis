import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Badge, Button, Card, Input, Label, Textarea } from "../../components/ui";
import { useAddEmployee, useEmployees, useImportEmployeesCsv } from "../../hooks/useEmployees";

export function EmployeeAdminPage() {
  const staff = useAuthStore((s) => s.staff);
  const isAdmin = staff?.role === "ORG_ADMIN";
  const employees = useEmployees(isAdmin);
  const addEmployee = useAddEmployee();
  const importCsv = useImportEmployeesCsv();

  const [employeeIdentifier, setEmployeeIdentifier] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [csvText, setCsvText] = useState("employee_identifier,official_email");
  const [notice, setNotice] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <Card title="Employee management">
        <div className="text-sm text-slate-700">Only ORG_ADMIN can add employees or import CSV in bulk.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Add single employee">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Employee ID or email</Label>
            <Input value={employeeIdentifier} onChange={(e) => setEmployeeIdentifier(e.target.value)} />
          </div>
          <div>
            <Label>Official email</Label>
            <Input value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              onClick={async () => {
                setNotice(null);
                await addEmployee.mutateAsync({ employeeIdentifier, officialEmail });
                setEmployeeIdentifier("");
                setOfficialEmail("");
                setNotice("Employee saved.");
                await employees.refetch();
              }}
              disabled={!employeeIdentifier.trim() || !officialEmail.trim() || addEmployee.isPending}
            >
              {addEmployee.isPending ? "Saving..." : "Add employee"}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Bulk import employees (CSV)">
        <div className="space-y-3">
          <div className="text-xs text-slate-600">
            Format: <span className="font-mono">employee_identifier,official_email</span>
          </div>
          <Textarea rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
          <div className="flex items-center gap-3">
            <Button
              onClick={async () => {
                setNotice(null);
                const result = await importCsv.mutateAsync(csvText);
                setNotice(`Imported/updated: ${result.insertedOrUpdated}, rejected: ${result.rejected.length}`);
                await employees.refetch();
              }}
              disabled={!csvText.trim() || importCsv.isPending}
            >
              {importCsv.isPending ? "Importing..." : "Import CSV"}
            </Button>
            {notice ? <Badge tone="success">{notice}</Badge> : null}
          </div>
          {importCsv.data?.rejected?.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {importCsv.data.rejected.map((r) => (
                <div key={`${r.row}-${r.reason}`}>Row {r.row}: {r.reason}</div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="Current employee directory">
        {employees.isLoading ? (
          <div className="text-sm text-slate-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b">
                  <th className="py-2">Employee identifier</th>
                  <th>Official email</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(employees.data ?? []).map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2">{e.employee_identifier}</td>
                    <td>{e.official_email}</td>
                    <td>{new Date(e.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

