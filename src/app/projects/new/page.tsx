"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { uploadRfpFile, parseRfp } from "@/lib/api/rfp.client";
import type {
  RfpParsedProjectInfo,
  RfpParsedRule,
  RfpParsedDocument,
  RfpParsedLaw,
} from "@/lib/types/database";
import { saveProject } from "./_actions";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

type Step = "upload" | "uploading" | "parsing" | "law_search" | "review" | "saving";

const PARSE_MESSAGES = [
  "PDF 문서를 분석하고 있습니다…",
  "서식 및 증빙서류를 추출하고 있습니다…",
  "자격요건 및 규칙을 파싱하고 있습니다…",
  "AND/OR 조건을 판단하고 있습니다…",
];

const SOURCE_LABEL: Record<string, { text: string; className: string }> = {
  ai_extracted: { text: "AI 추출", className: "bg-blue-100 text-blue-700 border-blue-200" },
  law_research: { text: "법령 참조", className: "bg-purple-100 text-purple-700 border-purple-200" },
  default: { text: "기본값", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function RfpNewPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [uploadPct, setUploadPct] = useState(0);
  const [parseIdx, setParseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState(0);

  // Parse results
  const [projectInfo, setProjectInfo] = useState<RfpParsedProjectInfo | null>(null);
  const [rules, setRules] = useState<RfpParsedRule[]>([]);
  const [parsedDocs, setParsedDocs] = useState<RfpParsedDocument[]>([]);
  const [laws, setLaws] = useState<RfpParsedLaw[]>([]);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  const vrbDeadline = editDeadline
    ? (() => {
        const d = new Date(editDeadline);
        d.setDate(d.getDate() - 3);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  /* ── Upload handler ── */
  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("파일 크기가 100MB를 초과합니다.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    setFileName(file.name);
    setFileSizeMb(Math.round((file.size / 1024 / 1024) * 10) / 10);
    setStep("uploading");
    setUploadPct(0);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!supabaseUrl || !supabaseKey) {
      setError("Supabase가 설정되지 않았습니다. .env.local 파일을 확인하세요.");
      setStep("upload");
      return;
    }

    const { path, error: uploadError } = await uploadRfpFile(
      supabaseUrl, supabaseKey, file, setUploadPct,
    );

    if (uploadError) {
      setError(uploadError);
      setStep("upload");
      return;
    }

    setStoragePath(path);
    setUploadPct(100);

    // Step 2: AI 파싱
    setStep("parsing");
    const interval = setInterval(() => {
      setParseIdx((i) => (i + 1) % PARSE_MESSAGES.length);
    }, 3000);

    const result = await parseRfp(path);
    clearInterval(interval);

    if (result.error) {
      setError(result.error);
      setStep("upload");
      return;
    }

    setProjectInfo(result.projectInfo);
    setRules(result.rules);
    setParsedDocs(result.documents);
    setLaws(result.laws);
    setEditName(result.projectInfo.name ?? "");
    setEditClient(result.projectInfo.client ?? "");
    setEditBudget(result.projectInfo.budget_amount?.toString() ?? "");
    setEditDeadline(result.projectInfo.bid_deadline ?? "");

    // Step 3: 법령 검증 (simulate brief display)
    if (result.laws.length > 0) {
      setStep("law_search");
      await new Promise((r) => setTimeout(r, 1500));
    }

    setStep("review");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  /* ── Save handler ── */
  const handleSave = async () => {
    if (!projectInfo || !storagePath) return;
    setStep("saving");
    setError(null);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/rfp-files/${storagePath}`;

    const merged: RfpParsedProjectInfo = {
      ...projectInfo,
      name: editName || projectInfo.name,
      client: editClient || projectInfo.client,
      budget_amount: editBudget ? Number(editBudget) : projectInfo.budget_amount,
      bid_deadline: editDeadline || projectInfo.bid_deadline,
    };

    const { projectId, error: saveError } = await saveProject({
      projectInfo: merged,
      rules,
      rfpFileUrl: fileUrl,
      rfpFileSizeMb: fileSizeMb,
    });

    if (saveError) {
      setError(saveError);
      setStep("review");
      return;
    }

    router.push(`/projects/${projectId}/qualification`);
  };

  /* ── Derived data ── */
  const autoRules = rules.filter((r) => !r.needs_review);
  const reviewRules = rules.filter((r) => r.needs_review);
  const staleKLaws = laws.filter((l) => !l.is_current);

  /* ── Step indicator ── */
  const steps = [
    { key: "upload", label: "PDF 업로드" },
    { key: "parsing", label: "AI 파싱" },
    { key: "law_search", label: "법령 검증" },
    { key: "review", label: "확인 및 저장" },
  ];
  const stepOrder = ["upload", "uploading", "parsing", "law_search", "review", "saving"];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-2xl font-bold">RFP 등록</h1>

      {/* Step indicator */}
      <div className="mb-6 flex gap-2" data-testid="step-indicator">
        {steps.map((s, i) => {
          const sIdx = stepOrder.indexOf(s.key);
          const isActive = currentIdx >= sIdx;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isActive ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="mx-1 h-px w-6 bg-muted" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Step 1: Upload ── */}
      {(step === "upload" || step === "uploading") && (
        <Card>
          <CardHeader><CardTitle className="text-base">RFP 파일 업로드</CardTitle></CardHeader>
          <CardContent>
            <div
              data-testid="rfp-upload-zone"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-muted-foreground/50"
            >
              <svg className="mb-3 h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <p className="text-sm text-muted-foreground">
                {fileName ?? "PDF 파일을 드래그하거나 클릭하여 업로드"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">최대 100MB</p>
              <input
                ref={fileInputRef}
                data-testid="rfp-file-input"
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            {step === "uploading" && (
              <div className="mt-4" data-testid="upload-progress">
                <div className="mb-1 flex justify-between text-sm"><span>업로드 중…</span><span>{uploadPct}%</span></div>
                <Progress value={uploadPct} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Parsing ── */}
      {step === "parsing" && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div data-testid="parse-spinner" className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
            <p className="text-sm text-muted-foreground">{PARSE_MESSAGES[parseIdx]}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Law search ── */}
      {step === "law_search" && (
        <Card>
          <CardContent className="flex flex-col items-center py-16" data-testid="law-search-step">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-purple-500" />
            <p className="text-sm text-muted-foreground">
              법령 {laws.length}건 확인 중…
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Review ── */}
      {(step === "review" || step === "saving") && projectInfo && (
        <div className="space-y-6">
          {/* VRB deadline banner */}
          {vrbDeadline && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <strong>VRB 심의 마감:</strong>{" "}
              <span data-testid="vrb-deadline-display">{vrbDeadline}</span>
              <span className="ml-2 text-blue-600">(입찰마감 3일 전 자동 계산)</span>
              <p className="mt-1 text-xs text-blue-600">자격요건 Pass 후 트랙A+B 동시 시작</p>
            </div>
          )}

          {/* Editable project info */}
          <Card>
            <CardHeader><CardTitle className="text-base">프로젝트 기본 정보</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="name">프로젝트명</Label><Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div><Label htmlFor="client">발주처</Label><Input id="client" value={editClient} onChange={(e) => setEditClient(e.target.value)} /></div>
              <div><Label htmlFor="budget">사업 예산 (원)</Label><Input id="budget" type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} /></div>
              <div><Label htmlFor="deadline">입찰 마감일</Label><Input id="deadline" type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} /></div>
            </CardContent>
          </Card>

          {/* Law results */}
          {laws.length > 0 && (
            <Card data-testid="law-results">
              <CardHeader>
                <CardTitle className="text-base">법령 검증 결과 ({laws.length}건)</CardTitle>
              </CardHeader>
              <CardContent>
                {staleKLaws.length > 0 && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700" data-testid="law-stale-warning">
                    ⚠ 폐지/개정 가능성이 있는 법령 {staleKLaws.length}건 — 확인 필요
                  </div>
                )}
                <div className="space-y-2">
                  {laws.map((l, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3" data-testid={`law-row-${i}`}>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{l.law_name}</span>
                        {l.article && <span className="ml-1 text-xs text-muted-foreground">{l.article}</span>}
                        {l.content && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{l.content}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {l.is_current ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">현행</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">확인필요</Badge>
                        )}
                        {l.url && (
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">출처</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-extracted rules */}
          <Card>
            <CardHeader><CardTitle className="text-base">자동추출 완료 ({autoRules.length}건)</CardTitle></CardHeader>
            <CardContent data-testid="parse-result-auto">
              {autoRules.length > 0 ? (
                <div className="space-y-2">{autoRules.map((r, i) => <RuleRow key={i} rule={r} />)}</div>
              ) : (
                <p className="text-sm text-muted-foreground">자동추출 항목이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* Needs review rules */}
          <Card>
            <CardHeader><CardTitle className="text-base">확인필요 ({reviewRules.length}건)</CardTitle></CardHeader>
            <CardContent data-testid="parse-result-review">
              {reviewRules.length > 0 ? (
                <div className="space-y-2">{reviewRules.map((r, i) => <RuleRow key={i} rule={r} />)}</div>
              ) : (
                <p className="text-sm text-muted-foreground">확인 필요 항목이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* Parsed documents preview */}
          {parsedDocs.length > 0 && (
            <Card data-testid="parsed-docs-preview">
              <CardHeader><CardTitle className="text-base">추출된 서식 ({parsedDocs.length}건)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parsedDocs.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-2 text-sm">
                      <span className="font-medium">{d.doc_name}</span>
                      {d.form_number && <span className="text-xs text-muted-foreground">[{d.form_number}]</span>}
                      <span className="text-xs text-muted-foreground">증빙 {d.proof_items.length}건</span>
                      {d.rfp_page && <span className="text-xs text-blue-600">p.{d.rfp_page}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <Button data-testid="save-btn" onClick={handleSave} disabled={step === "saving"}>
              {step === "saving" ? "저장 중…" : "프로젝트 저장"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Rule row component ── */
function RuleRow({ rule }: { rule: RfpParsedRule }) {
  const source = SOURCE_LABEL[rule.source_type] ?? SOURCE_LABEL.default;
  const confidence = Math.round(rule.confidence * 100);

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{rule.rule_type}</span>
          {rule.rule_target && <span className="text-xs text-muted-foreground">— {rule.rule_target}</span>}
        </div>
        {rule.source_text && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            &ldquo;{rule.source_text}&rdquo;
            {rule.source_page && <span className="ml-1">(p.{rule.source_page})</span>}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className={source.className}>{source.text}</Badge>
        <span className={`text-xs font-medium ${confidence >= 70 ? "text-green-600" : "text-yellow-600"}`}>
          {confidence}%
        </span>
      </div>
    </div>
  );
}
