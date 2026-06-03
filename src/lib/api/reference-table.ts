import { createClient } from "@/lib/supabase/server";
import type { ReferenceTableItem } from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export interface RefTableData {
  items: ReferenceTableItem[];
  totalCount: number;
  reviewedCount: number;
  implTypes: string[];
  error: string | null;
}

export async function fetchReferenceTable(
  projectId: string,
): Promise<RefTableData> {
  if (!isSupabaseConfigured()) {
    return { items: [], totalCount: 0, reviewedCount: 0, implTypes: [], error: "Supabase 미설정" };
  }

  const supabase = createClient();

  const [itemsRes, implRes] = await Promise.all([
    supabase
      .from("reference_table_items")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    // Load impl_types dynamically from rfp_rules
    supabase
      .from("rfp_rules")
      .select("condition_value")
      .eq("project_id", projectId)
      .eq("rule_type", "reference_table_format")
      .limit(1),
  ]);

  const items = (itemsRes.data ?? []) as ReferenceTableItem[];
  const reviewedCount = items.filter((i) => i.reviewed).length;

  // Extract impl_types from rfp_rules (Zero Hardcoding)
  let implTypes: string[] = [];
  const ruleData = implRes.data?.[0];
  if (ruleData) {
    const cv = ruleData.condition_value as Record<string, unknown>;
    if (Array.isArray(cv?.impl_types)) {
      implTypes = cv.impl_types as string[];
    }
  }
  // Fallback: collect unique impl_types from existing items
  if (implTypes.length === 0) {
    const set = new Set<string>();
    for (const item of items) {
      if (item.impl_type) set.add(item.impl_type);
    }
    implTypes = Array.from(set);
  }

  return {
    items,
    totalCount: items.length,
    reviewedCount,
    implTypes,
    error: itemsRes.error?.message ?? null,
  };
}

export async function updateRefTableItem(
  itemId: string,
  update: {
    proposal_page?: string | null;
    impl_type?: string | null;
    impl_type_display?: string | null;
    description?: string | null;
    reviewed?: boolean;
  },
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createClient();
  const { error } = await supabase
    .from("reference_table_items")
    .update({
      ...update,
      reviewed_at: update.reviewed ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  return { error: error?.message ?? null };
}

export async function createRefTableExport(
  projectId: string,
  fileUrl: string,
  itemCount: number,
  reviewedCount: number,
): Promise<{ exportId: string; error: string | null }> {
  if (!isSupabaseConfigured()) return { exportId: "", error: "Supabase 미설정" };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reference_table_exports")
    .insert({
      project_id: projectId,
      export_format: "xlsx",
      file_url: fileUrl,
      item_count: itemCount,
      reviewed_count: reviewedCount,
    })
    .select("id")
    .single();

  return { exportId: (data?.id as string) ?? "", error: error?.message ?? null };
}
