/** Hand-written types matching rfp_schema_v3 — replace with `supabase gen types` output when available */

export type ProjectPhase =
  | "rfp_registered"
  | "qualification_check"
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
  tenant_id: string;
  review_status: "draft" | "requested" | "approved" | "rejected";
  requested_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
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
  vrb_deadline: string | null;
  meeting_date: string | null;
  attendees: string | null;
  vrb_proceed: boolean | null;
  proposal_proceed: boolean | null;
  bid_proceed: boolean | null;
  meeting_result: string | null;
  risk_level_avg: number | null;
  risk_grade: string | null;
  strategic_reason: string | null;
  lukas_submitted: boolean;
  lukas_submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VrbDeptReview {
  id: string;
  vrb_id: string;
  dept_type: string;
  proceed_opinion: string | null;
  prerequisites: string | null;
  risk_factors: string | null;
  risk_solutions: string | null;
  risk_level: number | null;
  discussion_points: string | null;
  reviewer: string | null;
  reviewed_at: string | null;
  win_strategy: string | null;
  strength: string | null;
  weakness: string | null;
  competitor_info: Record<string, unknown> | null;
  proposal_scope: string | null;
  proposal_strategy: string | null;
  required_mm: number | null;
  purchase_amount: number | null;
  revenue_review: string | null;
  cost_review: string | null;
  created_at: string;
}

export interface ProfitLoss {
  id: string;
  project_id: string;
  vrb_id: string | null;
  proposal_price: number | null;
  expected_price: number | null;
  license_cost: number;
  inhouse_labor_cost: number;
  outsource_cost: number;
  goods_cost: number;
  direct_expense: number;
  contingency: number;
  other_cost: number;
  direct_purchase_amount: number;
  total_cost: number;
  pjt_profit: number;
  target_margin_rate: number | null;
  pjt_profit_rate: number;
  updated_at: string;
}

export interface RiskLog {
  id: string;
  project_id: string;
  phase: string | null;
  risk_type: string | null;
  risk_level: string | null;
  risk_title: string | null;
  risk_message: string | null;
  auto_detected: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_note: string | null;
  created_at: string;
}

export interface QualificationCheck {
  id: string;
  project_id: string;
  item_code: string | null;
  item_name: string;
  item_type: string | null;
  condition_text: string | null;
  rfp_rule_id: string | null;
  check_result: string | null;
  check_note: string | null;
  checked_by: string | null;
  checked_at: string | null;
  created_at: string;
}

export interface ExperienceRecord {
  project_id: string;
  name: string;
  client: string;
  category: string | null;
  contract_amount: number | null;
  contract_date: string | null;
  end_date: string | null;
  sales_rep: string | null;
  pm: string | null;
}

export type DocValidationStatus = "valid" | "expiring_soon" | "error" | "needs_review" | "pending" | null;

export interface Document {
  id: string;
  project_id: string;
  partner_id: string | null;
  doc_category: string | null;
  doc_name: string;
  form_number: string | null;
  is_required: boolean;
  rfp_rule_id: string | null;
  submit_timing: string | null;
  file_url: string | null;
  file_size_mb: number | null;
  file_type: string | null;
  file_uploaded_at: string | null;
  upload_method: string | null;
  ai_issue_date: string | null;
  ai_expiry_date: string | null;
  ai_extracted_data: Record<string, unknown> | null;
  ai_extract_status: string | null;
  validation_status: DocValidationStatus;
  validation_message: string | null;
  validation_source: string | null;
  validated_at: string | null;
  linked_score_item: string | null;
  calculated_score: number | null;
  needs_review: boolean;
  review_reason: string | null;
  created_at: string;
}

/* ── RFP parse related ── */

export type RfpRuleSourceType = "rfp_direct" | "ai_extracted" | "law_research" | "default";

export interface RfpRule {
  id: string;
  project_id: string;
  rule_type: string;
  rule_target: string | null;
  condition_type: string | null;
  condition_value: Record<string, unknown>;
  source_type: RfpRuleSourceType;
  source_text: string | null;
  source_page: string | null;
  law_reference: string | null;
  law_url: string | null;
  law_verified_at: string | null;
  is_verified: boolean;
  needs_review: boolean;
  review_note: string | null;
  created_at: string;
}

export interface RfpParsedProjectInfo {
  name: string | null;
  client: string | null;
  budget_amount: number | null;
  bid_deadline: string | null;
  project_type: string | null;
  category: string | null;
  contract_method: string | null;
  project_period: string | null;
  warranty_period: string | null;
}

export interface RfpParsedRule {
  rule_type: string;
  rule_target: string | null;
  condition_type: string | null;
  condition_value: Record<string, unknown>;
  source_type: RfpRuleSourceType;
  source_text: string | null;
  source_page: string | null;
  needs_review: boolean;
  confidence: number;
}

export interface RfpParseResult {
  projectInfo: RfpParsedProjectInfo;
  rules: RfpParsedRule[];
}

/* ── document proof items (with AND/OR conditions) ── */

export type ProofConditionType = "AND" | "OR";

export interface DocumentProofItem {
  id: string;
  document_id: string;
  rfp_rule_id: string | null;
  item_name: string;
  item_section: string | null;
  max_score: number | null;
  condition_text: string | null;
  fail_result: string | null;
  proof_file_url: string | null;
  proof_status: string;
  calculated_score: number | null;
  condition_type: ProofConditionType;
  condition_group: number;
  min_required: number;
  condition_note: string | null;
  needs_review: boolean;
  created_at: string;
}

/* ── law references ── */

export interface LawReference {
  id: string;
  project_id: string;
  law_name: string;
  law_number: string | null;
  law_date: string | null;
  law_url: string | null;
  rfp_context: string | null;
  research_status: string;
  researched_at: string | null;
  research_summary: string | null;
  is_current?: boolean;
  created_at: string;
}

/* ── parsed law from AI ── */

export interface RfpParsedLaw {
  law_name: string;
  article: string | null;
  content: string | null;
  url: string | null;
  is_current: boolean;
  needs_review: boolean;
}

/* ── parsed document from AI ── */

export interface RfpParsedDocument {
  form_number: string | null;
  doc_name: string;
  submit_timing: string | null;
  rfp_page: string | null;
  condition_note: string | null;
  proof_items: RfpParsedProofItem[];
}

export interface RfpParsedProofItem {
  item_name: string;
  condition_type: ProofConditionType;
  condition_group: number;
  min_required: number;
  issuing_org: string | null;
  validity_days: number | null;
  needs_review: boolean;
}

export type PartnerType = "consortium" | "subcontract" | "goods_supply" | "direct_purchase";

export interface Partner {
  id: string;
  project_id: string;
  partner_type: PartnerType;
  company_name: string;
  is_sme_sw: boolean;
  contact_email: string | null;
  share_rate: number | null;
  share_amount: number | null;
  sub_amount: number | null;
  sub_rate: number | null;
  std_contract_used: boolean | null;
  mm: number | null;
  unit_price: number | null;
  work_scope: string | null;
  goods_items: Record<string, unknown> | null;
  goods_amount: number | null;
  is_direct_purchase: boolean;
  status: string;
  last_mail_sent_at: string | null;
  mail_sent_count: number;
  created_at: string;
  updated_at: string;
}

/* ── proposals ── */

export interface Proposal {
  id: string;
  project_id: string;
  version: number;
  file_url: string | null;
  file_size_mb: number | null;
  uploaded_at: string | null;
  ai_evaluated_at: string | null;
  coverage_rate: number | null;
  weak_items: Record<string, unknown>[] | null;
  recommendations: Record<string, unknown>[] | null;
  page_count: number | null;
  format_valid: boolean | null;
  format_issues: Record<string, unknown>[] | null;
  has_reference_table: boolean | null;
  has_glossary: boolean | null;
  vague_expr_count: number | null;
  qualitative_score: number | null;
  quantitative_score: number | null;
  tech_score_total: number | null;
  threshold_pct: number | null;
  threshold_score: number | null;
  meets_threshold: boolean | null;
  created_at: string;
}

/* ── reference table ── */

export interface ReferenceTableItem {
  id: string;
  project_id: string;
  eval_criteria_id: string | null;
  requirement_id: string | null;
  requirement_category: string | null;
  requirement_name: string;
  impl_type: string | null;
  impl_type_display: string | null;
  proposal_page: string | null;
  proposal_section: string | null;
  description: string | null;
  ai_mapped: boolean;
  ai_confidence: number | null;
  ai_mapped_at: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReferenceTableExport {
  id: string;
  project_id: string;
  export_format: string | null;
  file_url: string | null;
  exported_by: string | null;
  exported_at: string;
  item_count: number | null;
  reviewed_count: number | null;
}
