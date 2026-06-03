import { createClient } from "@/lib/supabase/server";
import type { BidResult, ProjectPhase } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export interface BidResultPageData {
  bidResult: BidResult | null;
  predictedTechScore: number | null;
  submittedPrice: number | null;
  error: string | null;
}

export async function fetchBidResult(projectId: string): Promise<BidResultPageData> {
  if (!isSupabaseConfigured()) return { bidResult: null, predictedTechScore: null, submittedPrice: null, error: "Supabase 미설정" };

  const supabase = createClient();
  const [brRes, propRes, simRes] = await Promise.all([
    supabase.from("rfp_bid_results").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1),
    supabase.from("rfp_proposals").select("tech_score_total").eq("project_id", projectId).order("version", { ascending: false }).limit(1),
    supabase.from("rfp_price_simulations").select("selected_price").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1),
  ]);

  return {
    bidResult: ((brRes.data ?? [])[0] ?? null) as BidResult | null,
    predictedTechScore: ((propRes.data ?? [])[0] as { tech_score_total?: number })?.tech_score_total ?? null,
    submittedPrice: ((simRes.data ?? [])[0] as { selected_price?: number })?.selected_price ?? null,
    error: brRes.error?.message ?? null,
  };
}

export async function saveBidResult(projectId: string, data: {
  result_type: string;
  actual_tech_score?: number;
  actual_price_score?: number;
  actual_total_score?: number;
  rank?: number;
  loss_reason?: string;
  loss_note?: string;
  submitted_price?: number;
  predicted_tech_score?: number;
  score_diff?: number;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };
  const supabase = createClient();

  const { error: brErr } = await supabase.from("rfp_bid_results").insert({
    project_id: projectId, ...data, submitted_at: new Date().toISOString(),
  });
  if (brErr) return { error: brErr.message };

  // Update phase
  const phaseMap: Record<string, ProjectPhase> = {
    selected: "selected", lost: "lost", re_announce: "rfp_registered",
  };
  const nextPhase = phaseMap[data.result_type] ?? "bid_submitted";
  const { error: pErr } = await supabase.from("rfp_projects").update({ phase: nextPhase, updated_at: new Date().toISOString() }).eq("id", projectId);

  return { error: pErr?.message ?? null };
}
