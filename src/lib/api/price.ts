import { createAdminClient } from "@/lib/supabase/admin";
import type { PriceSimulation, ProjectPhase } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export interface PricePageData {
  simulation: PriceSimulation | null;
  projectPhase: ProjectPhase | null;
  budgetAmount: number | null;
  techScore: number | null;
  priceFormula: Record<string, unknown> | null;
  error: string | null;
}

export async function fetchPriceSimulations(projectId: string): Promise<PricePageData> {
  if (!isSupabaseConfigured()) return { simulation: null, projectPhase: null, budgetAmount: null, techScore: null, priceFormula: null, error: "Supabase 미설정" };

  const supabase = createAdminClient();
  const [simRes, projRes, ruleRes] = await Promise.all([
    supabase.from("rfp_price_simulations").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1),
    supabase.from("rfp_projects").select("phase, budget_amount").eq("id", projectId).single(),
    supabase.from("rfp_rules").select("condition_value").eq("project_id", projectId).eq("rule_type", "price_formula").limit(1),
  ]);

  const sim = ((simRes.data ?? [])[0] ?? null) as PriceSimulation | null;
  let priceFormula: Record<string, unknown> | null = null;
  if (ruleRes.data?.[0]) priceFormula = ruleRes.data[0].condition_value as Record<string, unknown>;

  return {
    simulation: sim,
    projectPhase: (projRes.data?.phase as ProjectPhase) ?? null,
    budgetAmount: (projRes.data?.budget_amount as number) ?? null,
    techScore: sim?.tech_score ?? null,
    priceFormula,
    error: simRes.error?.message ?? null,
  };
}

export async function savePriceSimulation(projectId: string, data: {
  selected_price: number;
  scenarios: Record<string, unknown>[];
  tech_score?: number;
  budget_amount?: number;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("rfp_price_simulations").insert({
    project_id: projectId, ...data, selected_at: new Date().toISOString(),
  });
  return { error: error?.message ?? null };
}

export async function confirmBidPrice(projectId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("rfp_projects").update({ phase: "bid_submitted", updated_at: new Date().toISOString() }).eq("id", projectId);
  return { error: error?.message ?? null };
}
