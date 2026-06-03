"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadProposalFile, evaluateProposal, type EvaluateProposalResponse } from "@/lib/api/proposals.client";
import type { Proposal } from "@/lib/types/database";
import { markTrackAComplete } from "../_actions";

type Step = "upload" | "uploading" | "evaluating" | "result";

interface Props {
  projectId: string;
  existingProposal: Proposal | null;
}

export function ProposalEvaluator({ projectId, existingProposal }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(existingProposal?.ai_evaluated_at ? "result" : "upload");
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluateProposalResponse | null>(
    existingProposal?.ai_evaluated_at
      ? {
          page_count: existingProposal.page_count,
          format_valid: existingProposal.format_valid ?? false,
          format_issues: (existingProposal.format_issues ?? []) as Record<string, unknown>[],
          has_reference_table: existingProposal.has_reference_table ?? false,
          has_glossary: existingProposal.has_glossary ?? false,
          vague_expr_count: existingProposal.vague_expr_count ?? 0,
          qualitative_score: existingProposal.qualitative_score,
          quantitative_score: existingProposal.quantitative_score,
          tech_score_total: existingProposal.tech_score_total,
          threshold_pct: existingProposal.threshold_pct,
          threshold_score: existingProposal.threshold_score,
          meets_threshold: existingProposal.meets_threshold ?? false,
          coverage_rate: existingProposal.coverage_rate,
          weak_items: (existingProposal.weak_items ?? []) as Record<string, unknown>[],
          recommendations: (existingProposal.recommendations ?? []) as Record<string, unknown>[],
        }
      : null,
  );
  const [isPending, startTransition] = useTransition();

  const canCompleteTrackA = evaluation && evaluation.format_valid && !error;

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (file.size > 200 * 1024 * 1024) {
      setError("파일 크기가 200MB를 초과합니다.");
      return;
    }

    setFileName(file.name);
    setStep("uploading");
    setUploadPct(0);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!supabaseUrl || !supabaseKey) {
      setError("Supabase가 설정되지 않았습니다.");
      setStep("upload");
      return;
    }

    const fileSizeMb = Math.round((file.size / 1024 / 1024) * 10) / 10;

    const { path, error: uploadError } = await uploadProposalFile(
      supabaseUrl, supabaseKey, file, setUploadPct,
    );

    if (uploadError || !path) {
      setError(uploadError ?? "업로드 실패");
      setStep("upload");
      return;
    }

    setUploadPct(100);
    setStep("evaluating");

    const result = await evaluateProposal(projectId, path, fileSizeMb);

    if (result.error) {
      setError(result.error);
      setStep("upload");
      return;
    }

    setEvaluation(result);
    setStep("result");
  }, [projectId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  function handleTrackAComplete() {
    startTransition(async () => {
      const { error: err } = await markTrackAComplete(projectId);
      if (err) setError(err);
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Upload */}
      {(step === "upload" || step === "uploading") && (
        <Card>
          <CardHeader><CardTitle className="text-base">제안서 업로드</CardTitle></CardHeader>
          <CardContent>
            <div
              data-testid="proposal-upload-zone"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-muted-foreground/50"
            >
              <svg className="mb-3 h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <p className="text-sm text-muted-foreground">{fileName ?? "제안서 PDF를 드래그하거나 클릭하여 업로드"}</p>
              <p className="mt-1 text-xs text-muted-foreground">최대 200MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            {step === "uploading" && (
              <div className="mt-4" data-testid="proposal-progress">
                <div className="mb-1 flex justify-between text-sm"><span>업로드 중…</span><span>{uploadPct}%</span></div>
                <Progress value={uploadPct} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evaluating */}
      {step === "evaluating" && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
            <p className="text-sm text-muted-foreground">제안서를 AI로 평가하고 있습니다…</p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {step === "result" && evaluation && (
        <>
          {/* Scores */}
          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreCard testId="eval-score-qualitative" label="정성평가" score={evaluation.qualitative_score} />
            <ScoreCard testId="eval-score-quantitative" label="정량평가" score={evaluation.quantitative_score} />
            <ScoreCard testId="eval-score-technical" label="기술점수 합계" score={evaluation.tech_score_total} />
          </div>

          {/* Negotiation eligibility */}
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <span className="text-sm font-medium">협상자격 충족 여부</span>
                {evaluation.threshold_score != null && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (기준: {evaluation.threshold_score}점 / {evaluation.threshold_pct}%)
                  </span>
                )}
              </div>
              <Badge
                variant="outline"
                data-testid="negotiation-eligible-badge"
                className={evaluation.meets_threshold
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-red-100 text-red-700 border-red-200"
                }
              >
                {evaluation.meets_threshold ? "충족" : "미충족"}
              </Badge>
            </CardContent>
          </Card>

          {/* Format checks */}
          <Card>
            <CardHeader><CardTitle className="text-base">형식 검증</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <FormatRow testId="format-check-pages" label="페이지 수" value={evaluation.page_count != null ? `${evaluation.page_count}페이지` : "-"} ok={evaluation.format_valid} />
              <FormatRow testId="format-check-ref-table" label="참조표 포함" value={evaluation.has_reference_table ? "포함됨" : "누락"} ok={evaluation.has_reference_table} />
              <FormatRow testId="format-check-glossary" label="약어표 포함" value={evaluation.has_glossary ? "포함됨" : "누락"} ok={evaluation.has_glossary} />
              <FormatRow testId="format-check-ambiguous" label="모호표현" value={`${evaluation.vague_expr_count}건`} ok={evaluation.vague_expr_count === 0} />

              {evaluation.format_issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {evaluation.format_issues.map((issue, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {(issue as { message?: string }).message ?? JSON.stringify(issue)}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weak items */}
          {evaluation.weak_items.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">취약 항목 ({evaluation.weak_items.length}건)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {evaluation.weak_items.map((w, i) => (
                  <div key={i} className="rounded border p-2 text-sm">
                    <span className="font-medium">{(w as { item?: string }).item}</span>
                    <span className="ml-2 text-muted-foreground">{(w as { reason?: string }).reason}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {evaluation.recommendations.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">개선 권고 ({evaluation.recommendations.length}건)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {evaluation.recommendations.map((r, i) => (
                  <div key={i} className="rounded border p-2 text-sm">
                    <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-600 border-blue-200">
                      {(r as { type?: string }).type ?? "개선"}
                    </Badge>
                    {(r as { message?: string }).message}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Track A complete */}
          <div className="flex justify-end">
            <Button
              data-testid="track-a-complete-btn"
              onClick={handleTrackAComplete}
              disabled={!canCompleteTrackA || isPending}
            >
              {isPending ? "처리 중…" : "트랙A 완료 처리"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ScoreCard({ testId, label, score }: { testId: string; label: string; score: number | null }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="py-4 text-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{score != null ? score.toFixed(1) : "-"}</p>
      </CardContent>
    </Card>
  );
}

function FormatRow({ testId, label, value, ok }: { testId: string; label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between" data-testid={testId}>
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm">{value}</span>
        <span className={ok ? "text-green-600" : "text-red-500"}>
          {ok ? "✓" : "✗"}
        </span>
      </div>
    </div>
  );
}
