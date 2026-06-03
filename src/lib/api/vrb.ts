import { createAdminClient } from "@/lib/supabase/admin";
import type {
  VrbReview,
  VrbDeptReview,
  ProfitLoss,
  ProjectPhase,
} from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/* ── SCR-103: VRB 심의 ── */

export interface VrbPageData {
  vrbReview: VrbReview | null;
  deptReviews: VrbDeptReview[];
  profitLoss: ProfitLoss | null;
  vrb_deadline: string | null;
  projectPhase: ProjectPhase | null;
  error: string | null;
}

export async function fetchVrbReviews(
  projectId: string,
): Promise<VrbPageData> {
  if (!isSupabaseConfigured()) {
    return { vrbReview: null, deptReviews: [], profitLoss: null, vrb_deadline: null, projectPhase: null, error: "Supabase 미설정" };
  }

  const supabase = createAdminClient();

  const [vrbRes, projectRes, plRes] = await Promise.all([
    supabase
      .from("rfp_vrb_reviews")
      .select("*")
      .eq("project_id", projectId)
      .order("vrb_round", { ascending: false })
      .limit(1),
    supabase
      .from("rfp_projects")
      .select("phase, vrb_deadline")
      .eq("id", projectId)
      .single(),
    supabase
      .from("rfp_profit_loss")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const vrbReview = ((vrbRes.data ?? [])[0] ?? null) as VrbReview | null;

  let deptReviews: VrbDeptReview[] = [];
  if (vrbReview) {
    const { data } = await supabase
      .from("rfp_vrb_dept_reviews")
      .select("*")
      .eq("vrb_id", vrbReview.id)
      .order("created_at", { ascending: true });
    deptReviews = (data ?? []) as VrbDeptReview[];
  }

  return {
    vrbReview,
    deptReviews,
    profitLoss: ((plRes.data ?? [])[0] ?? null) as ProfitLoss | null,
    vrb_deadline: (projectRes.data?.vrb_deadline as string) ?? null,
    projectPhase: (projectRes.data?.phase as ProjectPhase) ?? null,
    error: vrbRes.error?.message ?? null,
  };
}

export async function updateDeptReview(
  deptId: string,
  update: Partial<Pick<VrbDeptReview, "proceed_opinion" | "risk_level" | "risk_factors" | "risk_solutions">>,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("rfp_vrb_dept_reviews")
    .update({ ...update, reviewed_at: new Date().toISOString() })
    .eq("id", deptId);

  return { error: error?.message ?? null };
}

export async function approveVrb(
  projectId: string,
  vrbId: string,
  approved: boolean,
  rejectReason?: string,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createAdminClient();

  // Update vrb_reviews
  const { error: vrbErr } = await supabase
    .from("rfp_vrb_reviews")
    .update({
      vrb_proceed: approved,
      meeting_result: approved ? "승인" : `반려: ${rejectReason ?? ""}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vrbId);

  if (vrbErr) return { error: vrbErr.message };

  if (approved) {
    // Check if track_a is done to auto-transition to price_ready
    const { data: proj } = await supabase
      .from("rfp_projects")
      .select("phase")
      .eq("id", projectId)
      .single();

    const nextPhase: ProjectPhase =
      proj?.phase === "track_a_done" ? "price_ready" : "vrb_approved";

    const { error: projErr } = await supabase
      .from("rfp_projects")
      .update({ phase: nextPhase, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (projErr) return { error: projErr.message };
  }

  return { error: null };
}

/* ── SCR-104: VRB 손익 계산 ── */

export interface ProfitPageData {
  profitLoss: ProfitLoss | null;
  inhouseLaborCost: number;
  outsourceCost: number;
  goodsCost: number;
  directPurchaseAmount: number;
  profitThreshold: number | null;
  error: string | null;
}

export async function fetchProfitLoss(
  projectId: string,
): Promise<ProfitPageData> {
  if (!isSupabaseConfigured()) {
    return {
      profitLoss: null, inhouseLaborCost: 0, outsourceCost: 0,
      goodsCost: 0, directPurchaseAmount: 0, profitThreshold: null, error: "Supabase 미설정",
    };
  }

  const supabase = createAdminClient();

  const [plRes, ruleRes] = await Promise.all([
    supabase
      .from("rfp_profit_loss")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("rfp_rules")
      .select("condition_value")
      .eq("project_id", projectId)
      .eq("rule_type", "profit_threshold")
      .limit(1),
  ]);

  const pl = ((plRes.data ?? [])[0] ?? null) as ProfitLoss | null;

  let profitThreshold: number | null = null;
  const ruleData = ruleRes.data?.[0];
  if (ruleData) {
    const cv = ruleData.condition_value as Record<string, unknown>;
    if (typeof cv?.min_rate === "number") profitThreshold = cv.min_rate;
  }

  return {
    profitLoss: pl,
    inhouseLaborCost: pl?.inhouse_labor_cost ?? 0,
    outsourceCost: pl?.outsource_cost ?? 0,
    goodsCost: pl?.goods_cost ?? 0,
    directPurchaseAmount: pl?.direct_purchase_amount ?? 0,
    profitThreshold,
    error: plRes.error?.message ?? null,
  };
}

export async function updateProfitLoss(
  projectId: string,
  update: {
    proposal_price?: number;
    expected_price?: number;
    license_cost?: number;
    direct_expense?: number;
    contingency?: number;
    other_cost?: number;
    target_margin_rate?: number;
  },
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createAdminClient();

  // Check if profit_loss row exists
  const { data: existing } = await supabase
    .from("rfp_profit_loss")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from("rfp_profit_loss")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("project_id", projectId);
    return { error: error?.message ?? null };
  } else {
    const { error } = await supabase
      .from("rfp_profit_loss")
      .insert({ project_id: projectId, ...update });
    return { error: error?.message ?? null };
  }
}
