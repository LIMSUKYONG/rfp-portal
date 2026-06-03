"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DocumentRow, RfpChecklistExtra } from "@/lib/api/documents";
import type { DocValidationStatus } from "@/lib/types/database";
import { uploadDocumentFile, validateDocument } from "@/lib/api/documents.client";

const VALIDATION_BADGE: Record<
  string,
  { text: string; className: string }
> = {
  valid: { text: "유효", className: "bg-green-100 text-green-700 border-green-200" },
  expiring_soon: { text: "만료임박", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  error: { text: "오류", className: "bg-red-100 text-red-700 border-red-200" },
  needs_review: { text: "확인필요", className: "bg-gray-100 text-gray-500 border-gray-200" },
  pending: { text: "대기", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const SUBMIT_TIMING_LABEL: Record<string, string> = {
  with_proposal: "제안서 제출 시",
  before_contract: "계약 전",
  after_contract: "계약 후",
  on_demand: "요청 시",
};

interface Props {
  projectId: string;
  documents: DocumentRow[];
  documentPct: number;
  checklistExtras: RfpChecklistExtra[];
}

export function DocumentList({ projectId, documents, documentPct, checklistExtras }: Props) {
  const [docs, setDocs] = useState(documents);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [, startTransition] = useTransition();

  async function handleFileUpload(docId: string, file: File) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!supabaseUrl || !supabaseKey) return;

    setUploadingId(docId);
    setUploadPct(0);

    const fileSizeMb = Math.round((file.size / 1024 / 1024) * 10) / 10;

    const { path, error: uploadError } = await uploadDocumentFile(
      supabaseUrl,
      supabaseKey,
      file,
      setUploadPct,
    );

    if (uploadError || !path) {
      setUploadingId(null);
      return;
    }

    setUploadPct(100);

    // Auto-validate
    startTransition(async () => {
      const result = await validateDocument(docId, path, fileSizeMb);

      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                file_url: `${supabaseUrl}/storage/v1/object/public/document-files/${path}`,
                validation_status: result.validation_status as DocValidationStatus,
                validation_message: result.validation_message,
                calculated_score: result.calculated_score,
              }
            : d,
        ),
      );
      setUploadingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Track A progress */}
      <div data-testid="document-pct">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">트랙A 서류 진행률</span>
          <span>{documentPct}%</span>
        </div>
        <Progress value={documentPct} />
      </div>

      {/* Document table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">서류명</TableHead>
              <TableHead>서식번호</TableHead>
              <TableHead>제출시점</TableHead>
              <TableHead>AI 검증</TableHead>
              <TableHead>출처</TableHead>
              <TableHead>파일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="document-list">
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  등록된 서류가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => {
                const badge =
                  VALIDATION_BADGE[doc.validation_status ?? "pending"] ??
                  VALIDATION_BADGE.pending;
                const isUploading = uploadingId === doc.id;

                return (
                  <TableRow key={doc.id} data-testid={`doc-row-${doc.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.doc_name}</span>
                        {doc.source_type === "default" && (
                          <Link
                            href={`/projects/${projectId}/rules`}
                            data-testid={`scr203-link-${doc.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            규칙 확인 →
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.form_number ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {SUBMIT_TIMING_LABEL[doc.submit_timing ?? ""] ?? doc.submit_timing ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className={badge.className}
                          data-testid={`validation-badge-${doc.id}`}
                        >
                          {badge.text}
                        </Badge>
                        {doc.validation_message && (
                          <p
                            className="text-xs text-muted-foreground"
                            data-testid={`validation-msg-${doc.id}`}
                          >
                            {doc.validation_message}
                          </p>
                        )}
                        {doc.calculated_score != null && (
                          <span
                            className="text-xs font-medium text-blue-600"
                            data-testid={`calculated-score-${doc.id}`}
                          >
                            배점: {doc.calculated_score}점
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.source_page ? (
                        <span className="text-xs text-blue-600">RFP p.{doc.source_page}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isUploading ? (
                        <div className="w-24">
                          <Progress value={uploadPct} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {uploadPct < 100 ? `${uploadPct}%` : "검증 중…"}
                          </span>
                        </div>
                      ) : doc.file_url ? (
                        <span className="text-xs text-green-600">첨부됨</span>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`upload-btn-${doc.id}`}
                            onClick={() => fileInputRefs.current.get(doc.id)?.click()}
                          >
                            파일 첨부
                          </Button>
                          <input
                            ref={(el) => {
                              if (el) fileInputRefs.current.set(doc.id, el);
                            }}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(doc.id, file);
                            }}
                          />
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Checklist extras from rfp_rules */}
      {checklistExtras.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">추가 체크리스트 (RFP 규칙)</h3>
          <div className="space-y-2">
            {checklistExtras.map((extra) => (
              <div key={extra.id} className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                  {extra.rule_type}
                </Badge>
                <span>{extra.rule_target ?? extra.source_text ?? "-"}</span>
                {extra.source_page && (
                  <span className="text-xs text-blue-600">RFP p.{extra.source_page}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
