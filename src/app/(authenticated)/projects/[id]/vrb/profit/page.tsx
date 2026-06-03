import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PHASE_STYLE, PHASE_LABEL } from "@/lib/constants/phase";
import { fetchProfitLoss } from "@/lib/api/vrb";
import { ProfitCalculator } from "./_components/profit-calculator";

interface Props {
  params: { id: string };
}

export default async function VrbProfitPage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchProfitLoss(projectId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="vrb-profit-page">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/vrb`}
          className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
        >
          &larr; VRB 심의
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">VRB 손익 계산</h1>
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

      <ProfitCalculator
        projectId={projectId}
        profitLoss={data.profitLoss}
        inhouseLaborCost={data.inhouseLaborCost}
        outsourceCost={data.outsourceCost}
        goodsCost={data.goodsCost}
        directPurchaseAmount={data.directPurchaseAmount}
        profitThreshold={data.profitThreshold}
      />
    </main>
  );
}
