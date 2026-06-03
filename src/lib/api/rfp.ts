/**
 * Server-only RFP functions — uses next/headers via Supabase server client.
 * Do NOT import this from "use client" components. Use rfp.client.ts instead.
 */
import { createClient } from "@/lib/supabase/server";
import type {
  RfpParsedProjectInfo,
  RfpParsedRule,
} from "@/lib/types/database";

export interface CreateProjectInput {
  projectInfo: RfpParsedProjectInfo;
  rules: RfpParsedRule[];
  rfpFileUrl: string;
  rfpFileSizeMb: number;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ projectId: string; error: string | null }> {
  const supabase = createClient();
  const { projectInfo, rules, rfpFileUrl, rfpFileSizeMb } = input;

  // Generate project code: RFP-YYYYMMDD-XXXX
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `RFP-${datePart}-${rand}`;

  // Calculate VRB deadline
  let vrbDeadline: string | null = null;
  if (projectInfo.bid_deadline) {
    const d = new Date(projectInfo.bid_deadline);
    d.setDate(d.getDate() - 3);
    vrbDeadline = d.toISOString().slice(0, 10);
  }

  // 1. Insert project
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
      rfp_parsed_at: new Date().toISOString(),
      rfp_parse_status: "completed",
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return { projectId: "", error: projectError?.message ?? "프로젝트 생성 실패" };
  }

  // 2. Insert rfp_rules
  if (rules.length > 0) {
    const ruleRows = rules.map((r) => ({
      project_id: project.id as string,
      rule_type: r.rule_type,
      rule_target: r.rule_target,
      condition_type: r.condition_type,
      condition_value: r.condition_value,
      source_type: r.source_type,
      source_text: r.source_text,
      source_page: r.source_page,
      needs_review: r.needs_review,
      is_verified: false,
    }));

    const { error: rulesError } = await supabase
      .from("rfp_rules")
      .insert(ruleRows);

    if (rulesError) {
      return { projectId: project.id as string, error: `규칙 저장 실패: ${rulesError.message}` };
    }
  }

  return { projectId: project.id as string, error: null };
}
