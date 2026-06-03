/** Hand-written types matching rfp_schema_v3 — replace with `supabase gen types` output when available */

export type ProjectPhase =
  | "rfp_registered"
  | "in_progress"
  | "track_a_done"
  | "vrb_approved"
  | "price_ready"
  | "bid_submitted"
  | "selected"
  | "lost"
  | "abandoned"
  | "contract_signed";

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  project_type: string | null;
  category: string | null;
  budget_amount: number | null;
  contract_method: string | null;
  bid_deadline: string | null;
  announcement_date: string | null;
  project_period: string | null;
  warranty_period: string | null;
  phase: ProjectPhase;
  vrb_deadline: string | null;
  vrb_deadline_days: number | null;
  abandoned_at: string | null;
  abandoned_reason: string | null;
  abandoned_note: string | null;
  abandoned_phase: string | null;
  sales_rep: string | null;
  pm: string | null;
  rfp_file_url: string | null;
  rfp_file_size_mb: number | null;
  rfp_parsed_at: string | null;
  rfp_parse_status: string | null;
  lukas_project_id: string | null;
  lukas_synced_at: string | null;
  lukas_pipeline_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCompletion {
  id: string;
  name: string;
  phase: ProjectPhase;
  bid_deadline: string | null;
  vrb_deadline: string | null;
  dday: number | null;
  vrb_dday: number | null;
  qualification_pct: number | null;
  document_pct: number | null;
  partner_pct: number | null;
  ref_table_pct: number | null;
  rules_needs_review: number | null;
  tech_score_total: number | null;
  meets_threshold: boolean | null;
  threshold_score: number | null;
  has_reference_table: boolean | null;
  has_glossary: boolean | null;
  vague_expr_count: number | null;
  danger_count: number | null;
  warning_count: number | null;
}

export interface VrbReview {
  id: string;
  project_id: string;
  vrb_type: string | null;
  vrb_round: number;
  vrb_proceed: boolean | null;
  proposal_proceed: boolean | null;
  bid_proceed: boolean | null;
  meeting_result: string | null;
}
