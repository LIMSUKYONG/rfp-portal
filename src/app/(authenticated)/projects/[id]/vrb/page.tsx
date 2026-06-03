import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PHASE_STYLE, PHASE_LABEL } from "@/lib/constants/phase";
import { fetchVrbReviews } from "@/lib/api/vrb";
import { VrbDashboard } from "./_components/vrb-dashboard";

interface Props {
  params: { id: string };
}

export default async function VrbPage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchVrbReviews(projectId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" data-testid="vrb-page">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
        >
          &larr; 프로젝트 상세
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">VRB 심의</h1>
          {data.projectPhase && (
            <Badge variant="outline" className={PHASE_STYLE[data.projectPhase] ?? ""}>
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

      <VrbDashboard
        projectId={projectId}
        vrbReview={data.vrbReview}
        deptReviews={data.deptReviews}
        profitLoss={data.profitLoss}
        vrbDeadline={data.vrb_deadline}
        projectPhase={data.projectPhase}
      />
    </main>
  );
}
