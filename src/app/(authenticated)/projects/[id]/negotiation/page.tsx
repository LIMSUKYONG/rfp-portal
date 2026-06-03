import Link from "next/link";
import { fetchNegotiations } from "@/lib/api/negotiations";
import { NegotiationManager } from "./_components/negotiation-manager";

interface Props { params: { id: string } }

export default async function NegotiationPage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchNegotiations(projectId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="negotiation-page">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="mb-2 inline-block text-sm text-muted-foreground hover:underline">&larr; 프로젝트 상세</Link>
        <h1 className="text-2xl font-bold">협상 관리</h1>
      </div>
      {data.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{data.error}</div>}
      <NegotiationManager projectId={projectId} negotiations={data.negotiations} firstBidPrice={data.firstBidPrice} negotiationRules={data.negotiationRules} deadline={data.deadline} />
    </main>
  );
}
