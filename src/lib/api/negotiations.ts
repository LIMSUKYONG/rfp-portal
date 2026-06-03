import { createClient } from "@/lib/supabase/server";
import type { Negotiation } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export interface NegotiationPageData {
  negotiations: Negotiation[];
  firstBidPrice: number | null;
  negotiationRules: Record<string, unknown> | null;
  deadline: string | null;
  error: string | null;
}

export async function fetchNegotiations(projectId: string): Promise<NegotiationPageData> {
  if (!isSupabaseConfigured()) return { negotiations: [], firstBidPrice: null, negotiationRules: null, deadline: null, error: "Supabase 미설정" };

  const supabase = createClient();
  const [negRes, simRes, ruleRes] = await Promise.all([
    supabase.from("negotiations").select("*").eq("project_id", projectId).order("negotiation_round", { ascending: true }),
    supabase.from("price_simulations").select("selected_price").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1),
    supabase.from("rfp_rules").select("condition_value").eq("project_id", projectId).eq("rule_type", "negotiation_price_rules").limit(1),
  ]);

  const negs = (negRes.data ?? []) as Negotiation[];
  const lastDeadline = negs.length > 0 ? negs[negs.length - 1].deadline : null;
  let negotiationRules: Record<string, unknown> | null = null;
  if (ruleRes.data?.[0]) negotiationRules = ruleRes.data[0].condition_value as Record<string, unknown>;

  return {
    negotiations: negs,
    firstBidPrice: ((simRes.data ?? [])[0] as { selected_price?: number })?.selected_price ?? null,
    negotiationRules,
    deadline: lastDeadline,
    error: negRes.error?.message ?? null,
  };
}

export async function addNegotiationRound(projectId: string, data: {
  negotiation_date?: string;
  deadline?: string;
  scope_changes?: string;
  price_changes?: string;
  final_amount?: number;
  negotiation_status?: string;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };
  const supabase = createClient();

  // Get next round number
  const { data: existing } = await supabase.from("negotiations").select("negotiation_round").eq("project_id", projectId).order("negotiation_round", { ascending: false }).limit(1);
  const nextRound = ((existing?.[0] as { negotiation_round?: number })?.negotiation_round ?? 0) + 1;

  const { error } = await supabase.from("negotiations").insert({
    project_id: projectId, negotiation_round: nextRound, ...data,
  });
  return { error: error?.message ?? null };
}

export async function confirmFinalPrice(projectId: string, finalAmount: number): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ phase: "selected", updated_at: new Date().toISOString() }).eq("id", projectId);
  return { error: error?.message ?? null };
}
