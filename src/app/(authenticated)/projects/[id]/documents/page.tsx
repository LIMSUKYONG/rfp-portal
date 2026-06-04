import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PHASE_STYLE, PHASE_LABEL } from "@/lib/constants/phase";
import { fetchDocuments } from "@/lib/api/documents";
import { DocumentList } from "./_components/document-list";

interface Props {
  params: { id: string };
}

export default async function DocumentsPage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchDocuments(projectId);

  // If Supabase not configured we still render the shell
  if (
    data.error &&
    data.forms.length === 0 &&
    data.independentDocs.length === 0 &&
    !data.error.includes("미설정")
  ) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" data-testid="documents-page">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
        >
          &larr; 프로젝트 상세
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">서류 체크리스트</h1>
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

      <DocumentList
        projectId={projectId}
        forms={data.forms}
        independentDocs={data.independentDocs}
        documentPct={data.documentPct}
        totalCount={data.totalCount}
        validCount={data.validCount}
        checklistExtras={data.checklistExtras}
      />
    </main>
  );
}
