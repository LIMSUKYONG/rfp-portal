/**
 * Server-only RFP functions — uses admin client (RLS bypass).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenantId } from "@/lib/auth/session";
import type {
  RfpParsedProjectInfo,
  RfpParsedRule,
  RfpParsedDocument,
  RfpParsedLaw,
} from "@/lib/types/database";

export interface CreateProjectInput {
  projectInfo: RfpParsedProjectInfo;
  rules: RfpParsedRule[];
  documents?: RfpParsedDocument[];
  laws?: RfpParsedLaw[];
  rfpFileUrl: string;
  rfpFileSizeMb: number;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ projectId: string; error: string | null }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { projectId: "", error: "로그인 정보가 없습니다. 다시 로그인해주세요." };
  }

  const supabase = createAdminClient();
  const { projectInfo, rules, documents = [], laws = [], rfpFileUrl, rfpFileSizeMb } = input;

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `RFP-${datePart}-${rand}`;

  let vrbDeadline: string | null = null;
  if (projectInfo.bid_deadline) {
    const d = new Date(projectInfo.bid_deadline);
    d.setDate(d.getDate() - 3);
    vrbDeadline = d.toISOString().slice(0, 10);
  }

  // ── 1. rfp_projects INSERT ──
  const { data: project, error: projectError } = await supabase
    .from("rfp_projects")
    .insert({
      code,
      name: projectInfo.name ?? "미정",
      client: projectInfo.client ?? "미정",
      budget_amount: projectInfo.budget_amount,
      bid_deadline: projectInfo.bid_deadline,
      project_type: projectInfo.project_type,
      category: projectInfo.category,
      contract_method: projectInfo.contract_method,
      project_period: projectInfo.project_period,
      warranty_period: projectInfo.warranty_period,
      phase: "rfp_registered",
      vrb_deadline: vrbDeadline,
      rfp_file_url: rfpFileUrl,
      rfp_file_size_mb: rfpFileSizeMb,
      rfp_parsed_at: now.toISOString(),
      rfp_parse_status: "completed",
      tenant_id: tenantId,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return { projectId: "", error: projectError?.message ?? "프로젝트 생성 실패" };
  }

  const pid = project.id as string;

  // ── 2. rfp_rules INSERT ──
  if (rules.length > 0) {
    await supabase.from("rfp_rules").insert(
      rules.map((r) => ({
        project_id: pid,
        rule_type: r.rule_type,
        rule_target: r.rule_target,
        condition_type: r.condition_type,
        condition_value: r.condition_value,
        source_type: r.source_type,
        source_text: r.source_text,
        source_page: r.source_page,
        needs_review: r.needs_review,
        is_verified: false,
        tenant_id: tenantId,
      })),
    );
  }

  // ── 3. TASK AUTO-GENERATION ──

  // 3a. rfp_qualification_checks — from qualification rules
  const qualRules = rules.filter((r) => r.rule_type === "qualification");
  if (qualRules.length > 0) {
    await supabase.from("rfp_qualification_checks").insert(
      qualRules.map((r) => ({
        project_id: pid,
        item_name: r.rule_target ?? r.source_text ?? "자격요건 항목",
        item_type: "qualification",
        condition_text: r.source_text,
        check_result: "pending",
        tenant_id: tenantId,
      })),
    );
  }

  // 3b. rfp_documents + rfp_document_proof_items — from parsed documents
  for (const doc of documents) {
    const { data: insertedDoc } = await supabase
      .from("rfp_documents")
      .insert({
        project_id: pid,
        doc_name: doc.doc_name,
        form_number: doc.form_number,
        submit_timing: doc.submit_timing,
        is_required: true,
        validation_status: "pending",
        tenant_id: tenantId,
      })
      .select("id")
      .single();

    if (insertedDoc && doc.proof_items.length > 0) {
      await supabase.from("rfp_document_proof_items").insert(
        doc.proof_items.map((p) => ({
          document_id: insertedDoc.id as string,
          item_name: p.item_name,
          condition_type: p.condition_type,
          condition_group: p.condition_group,
          min_required: p.min_required,
          proof_status: "pending",
          needs_review: p.needs_review,
          tenant_id: tenantId,
        })),
      );
    }
  }

  // 3c. rfp_reference_table_items — from eval_criteria/tech_spec rules
  const refRules = rules.filter((r) =>
    r.rule_type === "eval_criteria" || r.rule_type === "tech_spec",
  );
  if (refRules.length > 0) {
    await supabase.from("rfp_reference_table_items").insert(
      refRules.map((r, i) => ({
        project_id: pid,
        requirement_id: `REQ-${String(i + 1).padStart(3, "0")}`,
        requirement_name: r.rule_target ?? r.source_text ?? "요구사항",
        requirement_category: r.rule_type === "eval_criteria" ? "eval" : "tech",
        ai_mapped: true,
        ai_confidence: r.confidence,
        reviewed: false,
        sort_order: i + 1,
        tenant_id: tenantId,
      })),
    );
  }

  // 3d. rfp_risk_logs — from subcontract limits, penalties, stale laws
  const riskRules = rules.filter((r) =>
    ["subcontract", "penalty"].includes(r.rule_type),
  );
  const staleLaws = laws.filter((l) => !l.is_current);

  const riskRows = [
    ...riskRules.map((r) => ({
      project_id: pid,
      phase: "rfp_registered",
      risk_type: r.rule_type,
      risk_level: "warning" as const,
      risk_title: r.rule_target ?? r.rule_type,
      risk_message: r.source_text,
      auto_detected: true,
      is_resolved: false,
      tenant_id: tenantId,
    })),
    ...staleLaws.map((l) => ({
      project_id: pid,
      phase: "rfp_registered",
      risk_type: "law_change",
      risk_level: "danger" as const,
      risk_title: `법령 확인 필요: ${l.law_name}`,
      risk_message: l.content,
      auto_detected: true,
      is_resolved: false,
      tenant_id: tenantId,
    })),
  ];

  if (riskRows.length > 0) {
    await supabase.from("rfp_risk_logs").insert(riskRows);
  }

  // 3e. rfp_law_references — from parsed laws
  if (laws.length > 0) {
    await supabase.from("rfp_law_references").insert(
      laws.map((l) => ({
        project_id: pid,
        law_name: l.law_name,
        rfp_context: l.content,
        law_url: l.url,
        research_status: l.is_current ? "confirmed" : "pending",
        tenant_id: tenantId,
      })),
    );
  }

  return { projectId: pid, error: null };
}
