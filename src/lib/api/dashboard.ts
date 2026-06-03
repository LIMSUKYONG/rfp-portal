import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Project,
  ProjectCompletion,
  RiskLog,
  ProjectPhase,
} from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export interface DashboardKpi {
  totalProjects: number;
  inProgressCount: number;
  deadlineThisWeek: number;
  unresolvedRiskCount: number;
  gateWaitingCount: number;
}

export interface UrgentItem {
  id: string;
  name: string;
  type: "bid_deadline" | "vrb_deadline";
  deadline: string;
  daysLeft: number;
}

export interface ProjectCard {
  id: string;
  name: string;
  client: string;
  phase: ProjectPhase;
  bid_deadline: string | null;
  vrb_deadline: string | null;
  qualification_pct: number;
  document_pct: number;
  partner_pct: number;
  ref_table_pct: number;
  danger_count: number;
  warning_count: number;
}

export interface DashboardData {
  kpi: DashboardKpi;
  urgentItems: UrgentItem[];
  projectCards: ProjectCard[];
  risks: RiskLog[];
  error: string | null;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) {
    return {
      kpi: { totalProjects: 0, inProgressCount: 0, deadlineThisWeek: 0, unresolvedRiskCount: 0, gateWaitingCount: 0 },
      urgentItems: [], projectCards: [], risks: [], error: "Supabase 미설정",
    };
  }

  const supabase = createAdminClient();

  const [projectsRes, completionRes, risksRes] = await Promise.all([
    supabase.from("rfp_projects").select("*").order("created_at", { ascending: false }),
    supabase.from("rfp_project_completion").select("*"),
    supabase.from("rfp_risk_logs").select("*").eq("is_resolved", false).order("created_at", { ascending: false }),
  ]);

  const projects = (projectsRes.data ?? []) as Project[];
  const completions = (completionRes.data ?? []) as ProjectCompletion[];
  const risks = (risksRes.data ?? []) as RiskLog[];

  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;

  // KPI
  const inProgressPhases: ProjectPhase[] = ["in_progress", "qualification_check", "track_a_done", "vrb_approved"];
  const inProgressCount = projects.filter((p) => inProgressPhases.includes(p.phase)).length;

  const deadlineThisWeek = projects.filter((p) => {
    if (!p.bid_deadline) return false;
    const days = Math.ceil((new Date(p.bid_deadline).getTime() - now) / msPerDay);
    return days >= 0 && days <= 7;
  }).length;

  const gateWaitingCount = projects.filter((p) => p.phase === "price_ready").length;

  // Urgent items (D-3 이내)
  const urgentItems: UrgentItem[] = [];
  for (const p of projects) {
    if (p.bid_deadline) {
      const days = Math.ceil((new Date(p.bid_deadline).getTime() - now) / msPerDay);
      if (days >= 0 && days <= 3) {
        urgentItems.push({ id: p.id, name: p.name, type: "bid_deadline", deadline: p.bid_deadline, daysLeft: days });
      }
    }
    if (p.vrb_deadline) {
      const days = Math.ceil((new Date(p.vrb_deadline).getTime() - now) / msPerDay);
      if (days >= 0 && days <= 3) {
        urgentItems.push({ id: p.id, name: p.name, type: "vrb_deadline", deadline: p.vrb_deadline, daysLeft: days });
      }
    }
  }

  // Project cards
  const completionMap = new Map(completions.map((c) => [c.id, c]));
  const projectCards: ProjectCard[] = projects.map((p) => {
    const c = completionMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      phase: p.phase,
      bid_deadline: p.bid_deadline,
      vrb_deadline: p.vrb_deadline,
      qualification_pct: c?.qualification_pct ?? 0,
      document_pct: c?.document_pct ?? 0,
      partner_pct: c?.partner_pct ?? 0,
      ref_table_pct: c?.ref_table_pct ?? 0,
      danger_count: c?.danger_count ?? 0,
      warning_count: c?.warning_count ?? 0,
    };
  });

  return {
    kpi: {
      totalProjects: projects.length,
      inProgressCount,
      deadlineThisWeek,
      unresolvedRiskCount: risks.length,
      gateWaitingCount,
    },
    urgentItems,
    projectCards,
    risks,
    error: projectsRes.error?.message ?? null,
  };
}

export async function resolveRisk(riskId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("rfp_risk_logs")
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", riskId);
  return { error: error?.message ?? null };
}
