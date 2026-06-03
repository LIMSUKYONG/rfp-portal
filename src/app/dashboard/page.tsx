import { fetchDashboardData } from "@/lib/api/dashboard";
import { DashboardView } from "./_components/dashboard-view";

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" data-testid="dashboard-page">
      <h1 className="mb-6 text-2xl font-bold">대시보드</h1>

      {data.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {data.error}
        </div>
      )}

      <DashboardView
        kpi={data.kpi}
        urgentItems={data.urgentItems}
        projectCards={data.projectCards}
        risks={data.risks}
      />
    </main>
  );
}
