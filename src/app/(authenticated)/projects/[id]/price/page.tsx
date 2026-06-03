import Link from "next/link";
import { fetchPriceSimulations } from "@/lib/api/price";
import { PriceSimulator } from "./_components/price-simulator";

interface Props { params: { id: string } }

export default async function PricePage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchPriceSimulations(projectId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="price-page">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="mb-2 inline-block text-sm text-muted-foreground hover:underline">&larr; 프로젝트 상세</Link>
        <h1 className="text-2xl font-bold">가격 시뮬레이터</h1>
      </div>
      {data.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{data.error}</div>}
      <PriceSimulator projectId={projectId} simulation={data.simulation} projectPhase={data.projectPhase} budgetAmount={data.budgetAmount} techScore={data.techScore} priceFormula={data.priceFormula} />
    </main>
  );
}
