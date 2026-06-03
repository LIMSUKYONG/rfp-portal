import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Project,
  ProjectCompletion,
  ProjectPhase,
  VrbReview,
  ProfitLoss,
  RiskLog,
  QualificationCheck,
  Document,
  Partner,
} from "@/lib/types/database";

/* ── list-page data ── */

export type VrbStatusKey = "approved" | "rejected" | "pending" | "none";

export interface ProjectListRow {
  project: Project;
  trackAPct: number;
  vrbStatus: VrbStatusKey;
  dday: number | null;
}

function toVrbStatus(review: VrbReview | undefined): VrbStatusKey {
  if (!review) return "none";
  if (review.vrb_proceed === true) return "approved";
  if (review.vrb_proceed === false) return "rejected";
  return "pending";
}

function calcTrackAPct(completion: ProjectCompletion | undefined): number {
  if (!completion) return 0;
  const vals = [
    completion.qualification_pct,
    completion.document_pct,
    completion.partner_pct,
    completion.ref_table_pct,
  ].filter((v): v is number => v !== null);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function calcDday(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function fetchProjectList(
  phase?: ProjectPhase | string,
): Promise<{ rows: ProjectListRow[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { rows: [], error: "Supabase가 설정되지 않았습니다. .env.local 파일을 확인하세요." };
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("rfp_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (phase) {
    query = query.eq("phase", phase);
  }

  // Projects query is critical — others are optional (may timeout on heavy views)
  const projectsRes = await query;

  if (projectsRes.error) {
    return { rows: [], error: projectsRes.error.message };
  }

  // Completion view and VRB are non-critical — fetch with timeout tolerance
  const [completionRes, vrbRes] = await Promise.allSettled([
    supabase.from("rfp_project_completion").select("*"),
    supabase.from("rfp_vrb_reviews").select("*").order("vrb_round", { ascending: false }),
  ]);

  const completionData = completionRes.status === "fulfilled" ? (completionRes.value.data ?? []) : [];
  const vrbData = vrbRes.status === "fulfilled" ? (vrbRes.value.data ?? []) : [];

  const completionMap = new Map(
    (completionData as ProjectCompletion[]).map((c) => [c.id, c]),
  );

  const vrbMap = new Map<string, VrbReview>();
  for (const v of vrbData as VrbReview[]) {
    if (!vrbMap.has(v.project_id)) vrbMap.set(v.project_id, v);
  }

  const rows: ProjectListRow[] = ((projectsRes.data ?? []) as Project[]).map(
    (project) => ({
      project,
      trackAPct: calcTrackAPct(completionMap.get(project.id)),
      vrbStatus: toVrbStatus(vrbMap.get(project.id)),
      dday: calcDday(project.bid_deadline),
    }),
  );

  return { rows, error: null };
}

/* ── detail-page data ── */

export interface ProjectDetail {
  project: Project;
  completion: ProjectCompletion | null;
  latestVrb: VrbReview | null;
  vrbList: VrbReview[];
  profitLoss: ProfitLoss | null;
  risks: RiskLog[];
  qualifications: QualificationCheck[];
  documents: Document[];
  partners: Partner[];
}

export async function fetchProjectDetail(
  id: string,
): Promise<ProjectDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();

  const [
    projectRes,
    completionRes,
    vrbRes,
    plRes,
    riskRes,
    qualRes,
    docRes,
    partnerRes,
  ] = await Promise.all([
    supabase.from("rfp_projects").select("*").eq("id", id).single(),
    supabase.from("rfp_project_completion").select("*").eq("id", id).single(),
    supabase
      .from("rfp_vrb_reviews")
      .select("*")
      .eq("project_id", id)
      .order("vrb_round", { ascending: false }),
    supabase
      .from("rfp_profit_loss")
      .select("*")
      .eq("project_id", id)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("rfp_risk_logs")
      .select("*")
      .eq("project_id", id)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("rfp_qualification_checks")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("rfp_documents")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("rfp_partners")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (projectRes.error || !projectRes.data) return null;

  const vrbList = (vrbRes.data ?? []) as VrbReview[];

  return {
    project: projectRes.data as Project,
    completion: (completionRes.data ?? null) as ProjectCompletion | null,
    latestVrb: vrbList[0] ?? null,
    vrbList,
    profitLoss: (((plRes.data ?? []) as ProfitLoss[])[0] ?? null),
    risks: (riskRes.data ?? []) as RiskLog[],
    qualifications: (qualRes.data ?? []) as QualificationCheck[],
    documents: (docRes.data ?? []) as Document[],
    partners: (partnerRes.data ?? []) as Partner[],
  };
}
