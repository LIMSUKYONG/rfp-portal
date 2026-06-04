import { createAdminClient } from "@/lib/supabase/admin";
import { completionPct } from "@/lib/constants/checklist";
import type {
  Document,
  DocumentProofItem,
  DocValidationStatus,
  RfpRule,
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
  /** rfp_document_proof_items — 서식 내부 증빙 항목(AND/OR 조건) */
  proofItems: DocumentProofItem[];
}

/** 서식(form) 노드 — parent_document_id로 연결된 증빙 문서를 children으로 보유 */
export interface DocumentNode extends DocumentWithProofs {
  children: DocumentWithProofs[];
}

export interface DocumentsData {
  /** doc_category='form' 상위 서식 + 하위 증빙 문서 */
  forms: DocumentNode[];
  /** parent_document_id가 없는 증빙 문서 (수동 연결 대상) */
  independentDocs: DocumentWithProofs[];
  /** 완성률 = valid 건수 / 전체 건수 × 100 */
  documentPct: number;
  totalCount: number;
  validCount: number;
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

const EMPTY: DocumentsData = {
  forms: [],
  independentDocs: [],
  documentPct: 0,
  totalCount: 0,
  validCount: 0,
  checklistExtras: [],
  error: null,
};

export async function fetchDocuments(
  projectId: string,
): Promise<DocumentsData> {
  if (!isSupabaseConfigured()) {
    return { ...EMPTY, error: "Supabase 미설정" };
  }

  try {
    return await fetchDocumentsInner(projectId);
  } catch (e) {
    return { ...EMPTY, error: e instanceof Error ? e.message : "서류 조회 실패" };
  }
}

async function fetchDocumentsInner(projectId: string): Promise<DocumentsData> {
  const supabase = createAdminClient();

  const [docsRes, rulesRes, extrasRes, proofsRes] = await Promise.all([
    supabase
      .from("rfp_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("form_number", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("rfp_rules")
      .select("id, source_page, source_type")
      .eq("project_id", projectId),
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
  const extras = (extrasRes.data ?? []) as RfpChecklistExtra[];
  const allProofs = (proofsRes.data ?? []) as DocumentProofItem[];

  const ruleMap = new Map(rules.map((r) => [r.id, r]));
  const proofsByDoc = new Map<string, DocumentProofItem[]>();
  for (const p of allProofs) {
    const list = proofsByDoc.get(p.document_id) ?? [];
    list.push(p);
    proofsByDoc.set(p.document_id, list);
  }

  const enriched: DocumentWithProofs[] = docs.map((d) => {
    const rule = d.rfp_rule_id ? ruleMap.get(d.rfp_rule_id) : undefined;
    return {
      ...d,
      source_page: rule?.source_page ?? null,
      source_type: rule?.source_type ?? null,
      proofItems: proofsByDoc.get(d.id) ?? [],
    };
  });

  // ── 계층 구성: form(서식) → 하위 proof(증빙) ──
  const childrenByParent = new Map<string, DocumentWithProofs[]>();
  for (const d of enriched) {
    if (d.parent_document_id) {
      const list = childrenByParent.get(d.parent_document_id) ?? [];
      list.push(d);
      childrenByParent.set(d.parent_document_id, list);
    }
  }

  const forms: DocumentNode[] = enriched
    .filter((d) => d.doc_category === "form")
    .map((f) => ({ ...f, children: childrenByParent.get(f.id) ?? [] }));

  // 서식이 아니면서 부모 연결이 없는 증빙 = 독립 서류
  const independentDocs = enriched.filter(
    (d) => d.doc_category !== "form" && !d.parent_document_id,
  );

  // ── 완성률: valid / 전체 × 100 ──
  const statuses = enriched.map((d) => d.validation_status as DocValidationStatus);
  const validCount = statuses.filter((s) => s === "valid").length;

  return {
    forms,
    independentDocs,
    documentPct: completionPct(statuses),
    totalCount: enriched.length,
    validCount,
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

  const supabase = createAdminClient();
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

/* ── update file_url / validation_status (부분 업데이트) ── */

export interface DocumentFilePatch {
  file_url?: string;
  file_size_mb?: number | null;
  validation_status?: DocValidationStatus;
}

export async function updateDocumentFile(
  docId: string,
  patch: DocumentFilePatch,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase 미설정" };

  const update: Record<string, unknown> = {};
  if (patch.file_url !== undefined) {
    update.file_url = patch.file_url;
    update.file_size_mb = patch.file_size_mb ?? null;
    update.file_uploaded_at = new Date().toISOString();
  }
  if (patch.validation_status !== undefined) {
    update.validation_status = patch.validation_status;
  }
  if (Object.keys(update).length === 0) {
    return { error: "변경할 필드가 없습니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("rfp_documents")
    .update(update)
    .eq("id", docId);

  return { error: error?.message ?? null };
}
