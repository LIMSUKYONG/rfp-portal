import { fetchProjectList } from "@/lib/api/projects";
import { PhaseFilter } from "./_components/phase-filter";
import { ProjectTable } from "./_components/project-table";

// Disable Next.js cache — always fetch fresh data
export const dynamic = "force-dynamic";

interface Props {
  searchParams: { phase?: string };
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { rows, error } = await fetchProjectList(searchParams.phase);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">프로젝트 목록</h1>
        <PhaseFilter />
      </div>

      {error && (
        <p className="text-destructive">
          데이터를 불러오지 못했습니다: {error}
        </p>
      )}

      <ProjectTable rows={rows} />
    </main>
  );
}
