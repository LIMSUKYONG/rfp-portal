import Link from "next/link";
import { fetchBidResult } from "@/lib/api/bid-results";
import { ResultForm } from "./_components/result-form";

interface Props { params: { id: string } }

export default async function ResultPage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchBidResult(projectId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="result-page">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="mb-2 inline-block text-sm text-muted-foreground hover:underline">&larr; 프로젝트 상세</Link>
        <h1 className="text-2xl font-bold">입찰 결과 등록</h1>
      </div>
      {data.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{data.error}</div>}
      <ResultForm projectId={projectId} bidResult={data.bidResult} predictedTechScore={data.predictedTechScore} submittedPrice={data.submittedPrice} />
    </main>
  );
}
