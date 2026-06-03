import { createClient } from "@/lib/supabase/server";
import type { Partner, PartnerType } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/* ── fetch ── */

export interface PartnersData {
  partners: Partner[];
  budgetAmount: number | null;
  subRateLimit: number | null;
  partnerPct: number;
  error: string | null;
}

export async function fetchPartners(
  projectId: string,
): Promise<PartnersData> {
  if (!isSupabaseConfigured()) {
    return { partners: [], budgetAmount: null, subRateLimit: null, partnerPct: 0, error: "Supabase 미설정" };
  }

  const supabase = createClient();

  const [partnersRes, projectRes, ruleRes, completionRes] = await Promise.all([
    supabase
      .from("rfp_partners")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("rfp_projects")
      .select("budget_amount")
      .eq("id", projectId)
      .single(),
    supabase
      .from("rfp_rules")
      .select("condition_value")
      .eq("project_id", projectId)
      .eq("rule_type", "subcontract")
      .limit(1),
    supabase
      .from("rfp_project_completion")
      .select("partner_pct")
      .eq("id", projectId)
      .single(),
  ]);

  const partners = (partnersRes.data ?? []) as Partner[];
  const budgetAmount = (projectRes.data?.budget_amount as number) ?? null;
  const partnerPct = (completionRes.data?.partner_pct as number) ?? 0;

  // Extract sub_rate limit from rfp_rules condition_value
  let subRateLimit: number | null = null;
  const ruleData = ruleRes.data?.[0];
  if (ruleData) {
    const cv = ruleData.condition_value as Record<string, unknown>;
    if (typeof cv?.max === "number") subRateLimit = cv.max;
    else if (typeof cv?.max_rate === "number") subRateLimit = cv.max_rate;
  }

  return {
    partners,
    budgetAmount,
    subRateLimit,
    partnerPct,
    error: partnersRes.error?.message ?? null,
  };
}

/* ── create ── */

export interface CreatePartnerInput {
  project_id: string;
  partner_type: PartnerType;
  company_name: string;
  sub_amount?: number | null;
  share_amount?: number | null;
  goods_amount?: number | null;
  work_scope?: string | null;
  is_direct_purchase?: boolean;
  contact_email?: string | null;
}

export async function createPartner(
  input: CreatePartnerInput,
): Promise<{ partner: Partner | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { partner: null, error: "Supabase 미설정" };

  const supabase = createClient();

  const { data, error } = await supabase
    .from("rfp_partners")
    .insert({
      project_id: input.project_id,
      partner_type: input.partner_type,
      company_name: input.company_name,
      sub_amount: input.sub_amount ?? null,
      share_amount: input.share_amount ?? null,
      goods_amount: input.goods_amount ?? null,
      work_scope: input.work_scope ?? null,
      is_direct_purchase: input.is_direct_purchase ?? false,
      contact_email: input.contact_email ?? null,
      status: "registered",
    })
    .select("*")
    .single();

  return { partner: (data as Partner) ?? null, error: error?.message ?? null };
}

/* ── update ── */

export async function updatePartner(
  partnerId: string,
  update: Partial<Pick<Partner, "company_name" | "sub_amount" | "share_amount" | "goods_amount" | "work_scope" | "status">>,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createClient();
  const { error } = await supabase
    .from("rfp_partners")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", partnerId);

  return { error: error?.message ?? null };
}

/* ── delete ── */

export async function deletePartner(
  partnerId: string,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createClient();
  const { error } = await supabase
    .from("rfp_partners")
    .delete()
    .eq("id", partnerId);

  return { error: error?.message ?? null };
}
