import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PHASE_STYLE, PHASE_LABEL } from "@/lib/constants/phase";
import { fetchLatestProposal } from "@/lib/api/proposals";
import { ProposalEvaluator } from "./_components/proposal-evaluator";

interface Props {
  params: { id: string };
}

export default async function ProposalPage({ params }: Props) {
  const projectId = params.id;
  const { proposal, error } = await fetchLatestProposal(projectId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="proposal-page">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
        >
          &larr; 프로젝트 상세
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">제안서 AI 평가</h1>
          <Badge variant="outline" className={PHASE_STYLE.in_progress}>
            {PHASE_LABEL.in_progress}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ProposalEvaluator
        projectId={projectId}
        existingProposal={proposal}
      />
    </main>
  );
}
