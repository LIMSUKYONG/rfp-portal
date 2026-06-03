import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PHASE_STYLE, PHASE_LABEL } from "@/lib/constants/phase";
import { fetchReferenceTable } from "@/lib/api/reference-table";
import { RefTableEditor } from "./_components/ref-table-editor";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: { id: string };
}

export default async function ReferenceTablePage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchReferenceTable(projectId);

  // Get project name for export
  let projectName = "project";
  try {
    const supabase = createClient();
    const { data: proj } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    if (proj?.name) projectName = proj.name as string;
  } catch {
    // ignore
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" data-testid="ref-table-page">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
        >
          &larr; 프로젝트 상세
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">참조표 편집</h1>
          <Badge variant="outline" className={PHASE_STYLE.in_progress}>
            {PHASE_LABEL.in_progress}
          </Badge>
        </div>
      </div>

      {data.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {data.error}
        </div>
      )}

      <RefTableEditor
        projectId={projectId}
        projectName={projectName}
        items={data.items}
        implTypes={data.implTypes}
        totalCount={data.totalCount}
        reviewedCount={data.reviewedCount}
      />
    </main>
  );
}
