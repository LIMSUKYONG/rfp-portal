import { createAdminClient } from "@/lib/supabase/admin";
import type { CheckResult } from "@/lib/constants/checklist";
import type {
  QualificationCheck,
  ExperienceRecord,
  RfpRule,
  ProjectPhase,
} from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/* ── fetch ── */

export interface QualificationItem extends QualificationCheck {
  source_page: string | null;
  source_type: string | null;
  hint_count: number;
}

export interface QualificationData {
  items: QualificationItem[];
  experienceRecords: ExperienceRecord[];
  projectPhase: ProjectPhase | null;
  error: string | null;
}

export async function fetchQualifications(
  projectId: string,
): Promise<QualificationData> {
  if (!isSupabaseConfigured()) {
    return { items: [], experienceRecords: [], projectPhase: null, error: "Supabase 미설정" };
  }

  try {
    return await fetchQualificationsInner(projectId);
  } catch (e) {
    // 서버 컴포넌트가 크래시하지 않도록 빈 데이터로 폴백
    return {
      items: [],
      experienceRecords: [],
      projectPhase: null,
      error: e instanceof Error ? e.message : "자격요건 조회 실패",
    };
  }
}

async function fetchQualificationsInner(
  projectId: string,
): Promise<QualificationData> {
  const supabase = createAdminClient();

  const [checksRes, rulesRes, expRes, projectRes] = await Promise.all([
    supabase
      .from("rfp_qualification_checks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("rfp_rules")
      .select("id, source_page, source_type")
      .eq("project_id", projectId),
    supabase.from("rfp_experience_records").select("*"),
    supabase
      .from("rfp_projects")
      .select("phase")
      .eq("id", projectId)
      .single(),
  ]);

  const checks = (checksRes.data ?? []) as QualificationCheck[];
  const rules = (rulesRes.data ?? []) as Pick<RfpRule, "id" | "source_page" | "source_type">[];
  const experiences = (expRes.data ?? []) as ExperienceRecord[];
  const phase = (projectRes.data?.phase ?? null) as ProjectPhase | null;

  const ruleMap = new Map(rules.map((r) => [r.id, r]));

  const items: QualificationItem[] = checks.map((c) => {
    const rule = c.rfp_rule_id ? ruleMap.get(c.rfp_rule_id) : undefined;
    return {
      ...c,
      source_page: rule?.source_page ?? null,
      source_type: rule?.source_type ?? null,
      hint_count: experiences.length,
    };
  });

  return {
    items,
    experienceRecords: experiences,
    projectPhase: phase,
    error: checksRes.error?.message ?? null,
  };
}

/* ── update check status ── */

export async function updateCheckStatus(
  checkId: string,
  result: CheckResult,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase 미설정" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("rfp_qualification_checks")
    .update({
      check_result: result,
      // 점검 완료(적합/해당없음)만 시각 기록, 확인중은 초기화
      checked_at: result === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", checkId);

  return { error: error?.message ?? null };
}

/* ── update project phase ── */

export async function updateProjectPhase(
  projectId: string,
  phase: ProjectPhase,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase 미설정" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("rfp_projects")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return { error: error?.message ?? null };
}

/* ── confirm all pass → phase=in_progress ── */

export async function confirmQualificationPass(
  projectId: string,
): Promise<{ error: string | null }> {
  return updateProjectPhase(projectId, "in_progress");
}
