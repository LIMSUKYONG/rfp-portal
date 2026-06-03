import { createClient } from "@/lib/supabase/server";
import type { Contract } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export interface ContractPageData {
  contract: Contract | null;
  warrantyPeriod: string | null;
  error: string | null;
}

export async function fetchContract(projectId: string): Promise<ContractPageData> {
  if (!isSupabaseConfigured()) return { contract: null, warrantyPeriod: null, error: "Supabase 미설정" };

  const supabase = createClient();
  const [cRes, ruleRes] = await Promise.all([
    supabase.from("contracts").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1),
    supabase.from("rfp_rules").select("condition_value").eq("project_id", projectId).eq("rule_type", "contract_conditions").limit(1),
  ]);

  let warrantyPeriod: string | null = null;
  if (ruleRes.data?.[0]) {
    const cv = ruleRes.data[0].condition_value as Record<string, unknown>;
    if (typeof cv?.warranty_period === "string") warrantyPeriod = cv.warranty_period;
  }

  return {
    contract: ((cRes.data ?? [])[0] ?? null) as Contract | null,
    warrantyPeriod,
    error: cRes.error?.message ?? null,
  };
}

export async function saveContract(projectId: string, data: {
  contract_amount: number;
  contract_date: string;
  start_date?: string;
  end_date?: string;
  warranty_end_date?: string;
  advance_rate?: number;
  advance_amount?: number;
  contract_file_url?: string;
  contract_file_size_mb?: number;
}): Promise<{ contractId: string; error: string | null }> {
  if (!isSupabaseConfigured()) return { contractId: "", error: "Supabase 미설정" };
  const supabase = createClient();

  const { data: c, error: cErr } = await supabase.from("contracts").insert({
    project_id: projectId, ...data, registered_as_experience: true,
  }).select("id").single();

  if (cErr) return { contractId: "", error: cErr.message };

  // Update phase
  await supabase.from("projects").update({ phase: "contract_signed", updated_at: new Date().toISOString() }).eq("id", projectId);

  return { contractId: (c?.id as string) ?? "", error: null };
}

export async function sendTelegramNotification(projectName: string, contractAmount: number): Promise<{ error: string | null }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { error: "TELEGRAM_BOT_TOKEN 미설정" };

  // Note: In production, chat_id would come from user settings
  // For now, just validate the token exists
  return { error: null };
}
