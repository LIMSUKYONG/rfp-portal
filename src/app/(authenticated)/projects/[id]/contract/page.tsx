import Link from "next/link";
import { fetchContract } from "@/lib/api/contracts";
import { ContractForm } from "./_components/contract-form";
import { createClient } from "@/lib/supabase/server";

interface Props { params: { id: string } }

export default async function ContractPage({ params }: Props) {
  const projectId = params.id;
  const data = await fetchContract(projectId);

  let projectName = "project";
  try {
    const supabase = createClient();
    const { data: proj } = await supabase.from("rfp_projects").select("name").eq("id", projectId).single();
    if (proj?.name) projectName = proj.name as string;
  } catch { /* ignore */ }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="contract-page">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="mb-2 inline-block text-sm text-muted-foreground hover:underline">&larr; 프로젝트 상세</Link>
        <h1 className="text-2xl font-bold">계약 체결</h1>
      </div>
      {data.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{data.error}</div>}
      <ContractForm projectId={projectId} projectName={projectName} contract={data.contract} warrantyPeriod={data.warrantyPeriod} />
    </main>
  );
}
