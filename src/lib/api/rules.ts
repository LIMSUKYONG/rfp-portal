import { createClient } from "@/lib/supabase/server";
import type { RfpRule, LawReference } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export interface PendingRulesData {
  rules: RfpRule[];
  laws: LawReference[];
  totalRules: number;
  pendingCount: number;
  error: string | null;
}

export async function fetchPendingRules(
  projectId: string,
): Promise<PendingRulesData> {
  if (!isSupabaseConfigured()) {
    return { rules: [], laws: [], totalRules: 0, pendingCount: 0, error: "Supabase 미설정" };
  }

  const supabase = createClient();

  const [pendingRes, allRulesRes, lawsRes] = await Promise.all([
    supabase
      .from("rfp_rules")
      .select("*")
      .eq("project_id", projectId)
      .eq("needs_review", true)
      .eq("is_verified", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("rfp_rules")
      .select("id", { count: "exact" })
      .eq("project_id", projectId),
    supabase
      .from("rfp_law_references")
      .select("*")
      .eq("project_id", projectId),
  ]);

  return {
    rules: (pendingRes.data ?? []) as RfpRule[],
    laws: (lawsRes.data ?? []) as LawReference[],
    totalRules: allRulesRes.count ?? 0,
    pendingCount: (pendingRes.data ?? []).length,
    error: pendingRes.error?.message ?? null,
  };
}

export async function updateRuleValue(
  ruleId: string,
  update: {
    condition_value?: Record<string, unknown>;
    rule_target?: string;
    source_type?: string;
  },
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createClient();
  const { error } = await supabase
    .from("rfp_rules")
    .update(update)
    .eq("id", ruleId);

  return { error: error?.message ?? null };
}

export async function confirmRule(
  ruleId: string,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createClient();
  const { error } = await supabase
    .from("rfp_rules")
    .update({
      needs_review: false,
      is_verified: true,
    })
    .eq("id", ruleId);

  return { error: error?.message ?? null };
}
