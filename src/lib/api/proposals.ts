import { createClient } from "@/lib/supabase/server";
import type { Proposal } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export interface ProposalData {
  proposal: Proposal | null;
  error: string | null;
}

export async function fetchLatestProposal(
  projectId: string,
): Promise<ProposalData> {
  if (!isSupabaseConfigured()) {
    return { proposal: null, error: "Supabase 미설정" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return {
    proposal: (data as Proposal) ?? null,
    error: error?.code === "PGRST116" ? null : error?.message ?? null,
  };
}

export async function saveProposalEvaluation(
  projectId: string,
  fileUrl: string,
  fileSizeMb: number,
  evaluation: {
    page_count: number | null;
    format_valid: boolean;
    format_issues: Record<string, unknown>[];
    has_reference_table: boolean;
    has_glossary: boolean;
    vague_expr_count: number;
    qualitative_score: number | null;
    quantitative_score: number | null;
    tech_score_total: number | null;
    threshold_pct: number | null;
    threshold_score: number | null;
    meets_threshold: boolean;
    coverage_rate: number | null;
    weak_items: Record<string, unknown>[];
    recommendations: Record<string, unknown>[];
  },
): Promise<{ proposalId: string; error: string | null }> {
  if (!isSupabaseConfigured()) return { proposalId: "", error: "Supabase 미설정" };

  const supabase = createClient();

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      project_id: projectId,
      file_url: fileUrl,
      file_size_mb: fileSizeMb,
      uploaded_at: new Date().toISOString(),
      ai_evaluated_at: new Date().toISOString(),
      ...evaluation,
    })
    .select("id")
    .single();

  return {
    proposalId: (data?.id as string) ?? "",
    error: error?.message ?? null,
  };
}

export async function completeTrackA(
  projectId: string,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      phase: "track_a_done",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  return { error: error?.message ?? null };
}
