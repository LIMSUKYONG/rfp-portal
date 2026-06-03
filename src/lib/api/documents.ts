import { createClient } from "@/lib/supabase/server";
import type {
  Document,
  DocumentProofItem,
  RfpRule,
  ProjectCompletion,
} from "@/lib/types/database";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/* ── enriched document row ── */

export interface DocumentRow extends Document {
  source_page: string | null;
  source_type: string | null;
}

export interface DocumentWithProofs extends DocumentRow {
  proofItems: DocumentProofItem[];
}

export interface DocumentsData {
  documents: DocumentWithProofs[];
  documentPct: number;
  checklistExtras: RfpChecklistExtra[];
  error: string | null;
}

export interface RfpChecklistExtra {
  id: string;
  rule_type: string;
  rule_target: string | null;
  source_text: string | null;
  source_page: string | null;
}

const CHECKLIST_RULE_TYPES = [
  "bid_deposit",
  "presentation_rules",
  "direct_purchase_items",
  "proposal_format",
];

export async function fetchDocuments(
  projectId: string,
): Promise<DocumentsData> {
  if (!isSupabaseConfigured()) {
    return { documents: [], documentPct: 0, checklistExtras: [], error: "Supabase 미설정" };
  }

  const supabase = createClient();

  const [docsRes, rulesRes, completionRes, extrasRes, proofsRes] = await Promise.all([
    supabase
      .from("rfp_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("rfp_rules")
      .select("id, source_page, source_type")
      .eq("project_id", projectId),
    supabase
      .from("rfp_project_completion")
      .select("document_pct")
      .eq("id", projectId)
      .single(),
    supabase
      .from("rfp_rules")
      .select("id, rule_type, rule_target, source_text, source_page")
      .eq("project_id", projectId)
      .in("rule_type", CHECKLIST_RULE_TYPES),
    supabase
      .from("rfp_document_proof_items")
      .select("*")
      .order("condition_group", { ascending: true }),
  ]);

  const docs = (docsRes.data ?? []) as Document[];
  const rules = (rulesRes.data ?? []) as Pick<RfpRule, "id" | "source_page" | "source_type">[];
  const documentPct = (completionRes.data?.document_pct as number) ?? 0;
  const extras = (extrasRes.data ?? []) as RfpChecklistExtra[];
  const allProofs = (proofsRes.data ?? []) as DocumentProofItem[];

  const ruleMap = new Map(rules.map((r) => [r.id, r]));
  const proofsByDoc = new Map<string, DocumentProofItem[]>();
  for (const p of allProofs) {
    const list = proofsByDoc.get(p.document_id) ?? [];
    list.push(p);
    proofsByDoc.set(p.document_id, list);
  }

  const documents: DocumentWithProofs[] = docs.map((d) => {
    const rule = d.rfp_rule_id ? ruleMap.get(d.rfp_rule_id) : undefined;
    return {
      ...d,
      source_page: rule?.source_page ?? null,
      source_type: rule?.source_type ?? null,
      proofItems: proofsByDoc.get(d.id) ?? [],
    };
  });

  return {
    documents,
    documentPct,
    checklistExtras: extras,
    error: docsRes.error?.message ?? null,
  };
}

/* ── update document after validation ── */

export async function updateDocumentValidation(
  docId: string,
  update: {
    file_url: string;
    file_size_mb: number;
    validation_status: string;
    validation_message: string | null;
    calculated_score: number | null;
    ai_issue_date: string | null;
    ai_expiry_date: string | null;
  },
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const supabase = createClient();
  const { error } = await supabase
    .from("rfp_documents")
    .update({
      ...update,
      file_uploaded_at: new Date().toISOString(),
      validated_at: new Date().toISOString(),
    })
    .eq("id", docId);

  return { error: error?.message ?? null };
}
