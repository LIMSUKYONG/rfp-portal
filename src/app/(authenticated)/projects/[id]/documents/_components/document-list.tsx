"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  DocumentNode,
  DocumentWithProofs,
  RfpChecklistExtra,
} from "@/lib/api/documents";
import type { DocCategory, DocValidationStatus, DocumentProofItem } from "@/lib/types/database";
import { uploadDocumentFile, updateDocumentFile } from "@/lib/api/documents.client";
import { DOC_CATEGORY_BADGE, validationMeta } from "@/lib/constants/checklist";

const SUBMIT_TIMING_LABEL: Record<string, string> = {
  with_proposal: "제안서 제출 시",
  bid_time: "입찰 시",
  before_contract: "계약 전",
  contract_time: "계약 시",
  after_contract: "계약 후",
  post_contract: "계약 후",
  on_demand: "요청 시",
};

/* ── proof-item(서식 내부 증빙 항목) 완료 판정 ── */

function isGroupComplete(items: DocumentProofItem[]): boolean {
  if (items.length === 0) return true;
  const type = items[0].condition_type;
  const minReq = items[0].min_required;

  if (type === "AND") {
    return items.every((i) => i.proof_file_url);
  }
  // OR
  const attached = items.filter((i) => i.proof_file_url).length;
  return attached >= minReq;
}

function areAllProofsComplete(proofItems: DocumentProofItem[]): boolean {
  if (proofItems.length === 0) return true;
  const groups = groupByCondition(proofItems);
  return Array.from(groups.values()).every(isGroupComplete);
}

function groupByCondition(proofItems: DocumentProofItem[]): Map<number, DocumentProofItem[]> {
  const groups = new Map<number, DocumentProofItem[]>();
  for (const p of proofItems) {
    const list = groups.get(p.condition_group) ?? [];
    list.push(p);
    groups.set(p.condition_group, list);
  }
  return groups;
}

/* ── 화면 ── */

interface Props {
  projectId: string;
  forms: DocumentNode[];
  independentDocs: DocumentWithProofs[];
  documentPct: number;
  totalCount: number;
  validCount: number;
  checklistExtras: RfpChecklistExtra[];
}

export function DocumentList({
  projectId,
  forms,
  independentDocs,
  documentPct,
  totalCount,
  validCount,
  checklistExtras,
}: Props) {
  // 업로드 결과(file_url/validation_status) override — id 기준
  const [overrides, setOverrides] = useState<
    Record<string, { file_url: string; validation_status: DocValidationStatus }>
  >({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [, startTransition] = useTransition();

  function applyOverride<T extends DocumentWithProofs>(doc: T): T {
    const o = overrides[doc.id];
    return o ? { ...doc, file_url: o.file_url, validation_status: o.validation_status } : doc;
  }

  // override 반영 후 실시간 완성률
  const livePct = useMemo(() => {
    if (totalCount === 0) return documentPct;
    const allDocs: DocumentWithProofs[] = [
      ...forms.flatMap((f) => [f, ...f.children]),
      ...independentDocs,
    ];
    const valid = allDocs.filter((d) => applyOverride(d).validation_status === "valid").length;
    return Math.round((valid / allDocs.length) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, forms, independentDocs, totalCount, documentPct]);

  async function handleFileUpload(docId: string, file: File) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!supabaseUrl || !supabaseKey) return;

    setUploadingId(docId);
    setUploadPct(0);
    const fileSizeMb = Math.round((file.size / 1024 / 1024) * 10) / 10;

    const { path, error: uploadError } = await uploadDocumentFile(
      supabaseUrl, supabaseKey, file, setUploadPct,
    );
    if (uploadError || !path) { setUploadingId(null); return; }
    setUploadPct(100);

    const fileUrl = `${supabaseUrl}/storage/v1/object/public/document-files/${path}`;
    startTransition(async () => {
      const result = await updateDocumentFile(docId, fileUrl, fileSizeMb);
      setOverrides((prev) => ({
        ...prev,
        [docId]: {
          file_url: fileUrl,
          validation_status: result.validation_status as DocValidationStatus,
        },
      }));
      setUploadingId(null);
    });
  }

  const sharedRowProps = {
    projectId,
    expandedId,
    uploadingId,
    uploadPct,
    fileInputRefs,
    applyOverride,
    onToggleExpand: (id: string) => setExpandedId((cur) => (cur === id ? null : id)),
    onUpload: handleFileUpload,
  };

  return (
    <div className="space-y-8">
      {/* 완성률 */}
      <div data-testid="document-pct">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">서류 완성률 (유효 {validCount}/{totalCount})</span>
          <span>{livePct}%</span>
        </div>
        <Progress value={livePct} />
      </div>

      {/* 서식 → 증빙 계층 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">서식 및 증빙</h2>
        <div className="rounded-lg border" data-testid="document-list">
          {forms.length === 0 && independentDocs.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              등록된 서류가 없습니다.
            </p>
          ) : forms.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">서식으로 분류된 서류가 없습니다.</p>
          ) : (
            <ul className="divide-y">
              {forms.map((form) => (
                <li key={form.id}>
                  <DocRow doc={applyOverride(form)} depth={0} {...sharedRowProps} />
                  {form.children.length > 0 && (
                    <ul className="divide-y border-t bg-muted/20" data-testid={`form-children-${form.id}`}>
                      {form.children.map((child) => (
                        <li key={child.id}>
                          <DocRow doc={applyOverride(child)} depth={1} {...sharedRowProps} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 독립 서류 (parent_document_id = NULL) */}
      {independentDocs.length > 0 && (
        <section data-testid="independent-docs">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            독립 서류 ({independentDocs.length}건)
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            서식과 연결되지 않은 증빙입니다. 필요 시 수동으로 연결하세요.
          </p>
          <div className="rounded-lg border">
            <ul className="divide-y">
              {independentDocs.map((doc) => (
                <li key={doc.id}>
                  <DocRow doc={applyOverride(doc)} depth={0} {...sharedRowProps} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 추가 체크리스트 (RFP 규칙) */}
      {checklistExtras.length > 0 && (
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">추가 체크리스트 (RFP 규칙)</h3>
          <div className="space-y-2">
            {checklistExtras.map((extra) => (
              <div key={extra.id} className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">{extra.rule_type}</Badge>
                <span>{extra.rule_target ?? extra.source_text ?? "-"}</span>
                {extra.source_page && <span className="text-xs text-blue-600">RFP p.{extra.source_page}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── 개별 서류 행 (서식/증빙 공용) ── */

interface RowProps {
  doc: DocumentWithProofs;
  depth: number;
  projectId: string;
  expandedId: string | null;
  uploadingId: string | null;
  uploadPct: number;
  fileInputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>;
  applyOverride: <T extends DocumentWithProofs>(doc: T) => T;
  onToggleExpand: (id: string) => void;
  onUpload: (docId: string, file: File) => void;
}

function DocRow({
  doc,
  depth,
  projectId,
  expandedId,
  uploadingId,
  uploadPct,
  fileInputRefs,
  onToggleExpand,
  onUpload,
}: RowProps) {
  const category = (doc.doc_category ?? "proof") as DocCategory;
  const catBadge = DOC_CATEGORY_BADGE[category] ?? DOC_CATEGORY_BADGE.proof;
  const badge = validationMeta(doc.validation_status);
  const isUploading = uploadingId === doc.id;
  const isExpanded = expandedId === doc.id;
  const hasProofs = doc.proofItems.length > 0;
  const proofsComplete = areAllProofsComplete(doc.proofItems);

  return (
    <div
      data-testid={`doc-row-${doc.id}`}
      className="flex items-start justify-between gap-4 p-3"
      style={{ paddingLeft: depth > 0 ? 28 : undefined }}
    >
      {/* 좌: 식별 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {depth > 0 && <span className="text-muted-foreground">└</span>}
          {hasProofs && (
            <button
              onClick={() => onToggleExpand(doc.id)}
              data-testid={`doc-expand-${doc.id}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          <Badge variant="outline" data-testid={`category-badge-${doc.id}`} className={catBadge.className}>
            {catBadge.label}
          </Badge>
          <span className="text-sm font-medium">{doc.doc_name}</span>
          {doc.form_number && (
            <span className="text-xs text-muted-foreground">({doc.form_number})</span>
          )}
          {hasProofs && !proofsComplete && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200" data-testid={`proof-incomplete-${doc.id}`}>
              증빙 미완료
            </Badge>
          )}
          {doc.source_type === "default" && (
            <Link
              href={`/projects/${projectId}/rules-review`}
              data-testid={`scr203-link-${doc.id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              규칙 확인 →
            </Link>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {doc.submit_timing && (
            <span>{SUBMIT_TIMING_LABEL[doc.submit_timing] ?? doc.submit_timing}</span>
          )}
          {doc.source_page && <span className="text-blue-600">RFP p.{doc.source_page}</span>}
        </div>

        {doc.validation_message && (
          <p className="mt-1 text-xs text-muted-foreground" data-testid={`validation-msg-${doc.id}`}>
            {doc.validation_message}
          </p>
        )}
        {doc.calculated_score != null && (
          <span className="text-xs font-medium text-blue-600" data-testid={`calculated-score-${doc.id}`}>
            배점: {doc.calculated_score}점
          </span>
        )}

        {/* 서식 내부 증빙 항목 아코디언 */}
        {isExpanded && hasProofs && <ProofAccordion proofItems={doc.proofItems} />}
      </div>

      {/* 우: 검증 상태 + 파일 */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge variant="outline" className={badge.className} data-testid={`validation-badge-${doc.id}`}>
          {badge.label}
        </Badge>
        {isUploading ? (
          <div className="w-24">
            <Progress value={uploadPct} className="h-2" />
            <span className="text-xs text-muted-foreground">{uploadPct < 100 ? `${uploadPct}%` : "저장 중…"}</span>
          </div>
        ) : doc.file_url ? (
          <span className="text-xs text-green-600">첨부됨</span>
        ) : (
          <>
            <Button variant="outline" size="sm" data-testid={`upload-btn-${doc.id}`} onClick={() => fileInputRefs.current.get(doc.id)?.click()}>
              파일 첨부
            </Button>
            <input
              ref={(el) => { if (el) fileInputRefs.current.set(doc.id, el); }}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(doc.id, f); }}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ── 서식 내부 증빙 항목(AND/OR) 아코디언 ── */

function ProofAccordion({ proofItems }: { proofItems: DocumentProofItem[] }) {
  const groups = groupByCondition(proofItems);

  return (
    <div className="mt-2 space-y-2 border-t pt-2" data-testid="proof-accordion">
      {Array.from(groups.entries()).map(([groupNum, items]) => {
        const type = items[0].condition_type;
        const minReq = items[0].min_required;
        const complete = isGroupComplete(items);

        return (
          <div key={groupNum} className="rounded border bg-muted/30 p-2" data-testid={`proof-group-${groupNum}`}>
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline" className={type === "AND" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-purple-50 text-purple-600 border-purple-200"}>
                {type === "AND" ? "[전부 필수]" : `[택${minReq} 이상]`}
              </Badge>
              {complete ? (
                <span className="text-xs text-green-600">완료</span>
              ) : (
                <span className="text-xs text-yellow-600">미완료</span>
              )}
            </div>
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs" data-testid={`proof-item-${item.id}`}>
                  <span className={item.proof_file_url ? "text-green-600" : "text-muted-foreground"}>
                    {item.proof_file_url ? "✓" : "○"}
                  </span>
                  <span>{item.item_name}</span>
                  {item.needs_review && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">
                      담당자 확인 필요
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
