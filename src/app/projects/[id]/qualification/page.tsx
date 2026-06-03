import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PHASE_STYLE, PHASE_LABEL } from "@/lib/constants/phase";
import { fetchQualifications } from "@/lib/api/qualification";
import { setPhaseQualificationCheck } from "./_actions";
import { QualificationChecklist } from "./_components/qualification-checklist";

interface Props {
  params: { id: string };
}

export default async function QualificationPage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchQualifications(projectId);

  if (data.error && !data.projectPhase) notFound();

  // Update phase to qualification_check on first visit
  if (data.projectPhase === "rfp_registered") {
    await setPhaseQualificationCheck(projectId);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="qualification-page">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
        >
          &larr; 프로젝트 상세
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">자격요건 체크</h1>
          {data.projectPhase && (
            <Badge
              variant="outline"
              className={PHASE_STYLE[data.projectPhase] ?? ""}
            >
              {PHASE_LABEL[data.projectPhase] ?? data.projectPhase}
            </Badge>
          )}
        </div>
      </div>

      {data.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {data.error}
        </div>
      )}

      <QualificationChecklist
        projectId={projectId}
        items={data.items}
        experienceCount={data.experienceRecords.length}
      />
    </main>
  );
}
