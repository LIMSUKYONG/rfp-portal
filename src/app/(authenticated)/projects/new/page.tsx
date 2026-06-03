"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadRfpFile, parseRfpMulti } from "@/lib/api/rfp.client";
import type { RfpParsedProjectInfo, RfpParsedRule, RfpParsedDocument, RfpParsedLaw } from "@/lib/types/database";
import { saveProject } from "./_actions";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type Step = "upload" | "uploading" | "parsing" | "review" | "saving";
type FileRole = "bid_notice" | "requirements" | "reference";

const ROLE_LABEL: Record<FileRole, string> = {
  bid_notice: "입찰공고",
  requirements: "기능요건서",
  reference: "참고자료",
};

interface UploadedFile {
  id: string;
  name: string;
  role: FileRole;
  path: string | null;
  sizeMb: number;
  uploaded: boolean;
}

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
  const [parseMsg, setParseMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Multi-file state
  const [files, setFiles] = useState<UploadedFile[]>([]);

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
    ? (() => { const d = new Date(editDeadline); d.setDate(d.getDate() - 3); return d.toISOString().slice(0, 10); })()
    : null;

  /* ── Add file ── */
  function handleAddFile(file: File) {
    if (file.size > MAX_FILE_SIZE) { setError("파일 크기가 100MB를 초과합니다."); return; }
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("PDF 파일만 업로드할 수 있습니다."); return; }
    setError(null);

    const newFile: UploadedFile = {
      id: crypto.randomUUID(),
      name: file.name,
      role: files.length === 0 ? "bid_notice" : files.length === 1 ? "requirements" : "reference",
      path: null,
      sizeMb: Math.round((file.size / 1024 / 1024) * 10) / 10,
      uploaded: false,
    };
    // Store the actual File object in a map for upload
    fileMap.current.set(newFile.id, file);
    setFiles((prev) => [...prev, newFile]);
  }

  const fileMap = useRef<Map<string, File>>(new Map());

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    fileMap.current.delete(id);
  }

  function setFileRole(id: string, role: FileRole) {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, role } : f));
  }

  /* ── Upload all + Parse ── */
  const handleStartParsing = useCallback(async () => {
    if (files.length === 0) { setError("파일을 추가하세요."); return; }
    setError(null);
    setStep("uploading");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!supabaseUrl || !supabaseKey) { setError("Supabase가 설정되지 않았습니다."); setStep("upload"); return; }

    // Upload each file
    const uploadedFiles: UploadedFile[] = [...files];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const f = uploadedFiles[i];
      const file = fileMap.current.get(f.id);
      if (!file) continue;

      setUploadPct(Math.round(((i) / uploadedFiles.length) * 100));
      const { path, error: uploadError } = await uploadRfpFile(supabaseUrl, supabaseKey, file, (pct) => {
        setUploadPct(Math.round(((i + pct / 100) / uploadedFiles.length) * 100));
      });

      if (uploadError || !path) { setError(uploadError ?? "업로드 실패"); setStep("upload"); return; }
      uploadedFiles[i] = { ...f, path, uploaded: true };
    }

    setFiles(uploadedFiles);
    setUploadPct(100);

    // Parse with multi-file support
    setStep("parsing");
    const filePaths = uploadedFiles.filter((f) => f.path).map((f) => f.path!);
    const roles = uploadedFiles.filter((f) => f.path).map((f) => f.role);

    const result = await parseRfpMulti(filePaths, roles, (_step, label) => {
      setParseMsg(label);
    });

    if (result.error) { setError(result.error); setStep("upload"); return; }

    setProjectInfo(result.projectInfo);
    setRules(result.rules);
    setParsedDocs(result.documents);
    setLaws(result.laws);
    setEditName(result.projectInfo.name ?? "");
    setEditClient(result.projectInfo.client ?? "");
    setEditBudget(result.projectInfo.budget_amount?.toString() ?? "");
    setEditDeadline(result.projectInfo.bid_deadline ?? "");
    setStep("review");
  }, [files]);

  /* ── Drop handler ── */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(handleAddFile);
  }, [files]);

  /* ── Save ── */
  const handleSave = async () => {
    if (!projectInfo) return;
    setStep("saving");
    setError(null);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const firstFile = files.find((f) => f.path);
    const fileUrl = firstFile ? `${supabaseUrl}/storage/v1/object/public/rfp-files/${firstFile.path}` : "";

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
      documents: parsedDocs,
      laws,
      rfpFileUrl: fileUrl,
      rfpFileSizeMb: firstFile?.sizeMb ?? 0,
    });

    if (saveError) { setError(saveError); setStep("review"); return; }
    router.push(`/projects/${projectId}/qualification`);
  };

  const autoRules = rules.filter((r) => !r.needs_review);
  const reviewRules = rules.filter((r) => r.needs_review);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">RFP 등록</h1>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* ── Upload Step ── */}
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">RFP 파일 업로드</CardTitle></CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                data-testid="rfp-file-input"
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => { Array.from(e.target.files ?? []).forEach(handleAddFile); e.target.value = ""; }}
              />
              <div
                data-testid="rfp-upload-zone"
                role="button"
                tabIndex={0}
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50 hover:bg-muted/30"
              >
                <svg className="mb-2 h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <p className="text-sm text-muted-foreground">PDF 파일을 드래그하거나 클릭하여 추가</p>
                <p className="text-xs text-muted-foreground">입찰공고 + 기능요건서 (최대 100MB/파일)</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2" data-testid="file-list">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3" data-testid={`file-item-${f.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.sizeMb}MB</p>
                      </div>
                      <Select value={f.role} onValueChange={(v) => setFileRole(f.id, v as FileRole)}>
                        <SelectTrigger className="w-[130px]" data-testid={`file-role-${f.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bid_notice">입찰공고</SelectItem>
                          <SelectItem value="requirements">기능요건서</SelectItem>
                          <SelectItem value="reference">참고자료</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(f.id)} className="text-red-500">삭제</Button>
                    </div>
                  ))}
                </div>
              )}

              {step === "uploading" && (
                <div className="mt-4" data-testid="upload-progress">
                  <div className="mb-1 flex justify-between text-sm"><span>업로드 중…</span><span>{uploadPct}%</span></div>
                  <Progress value={uploadPct} />
                </div>
              )}
            </CardContent>
          </Card>

          {files.length > 0 && step === "upload" && (
            <div className="flex justify-end">
              <Button onClick={handleStartParsing} data-testid="start-parse-btn">
                파싱 시작 ({files.length}개 파일)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Parsing Step ── */}
      {step === "parsing" && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div data-testid="parse-spinner" className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
            <p className="text-sm text-muted-foreground">{parseMsg || "분석 중…"}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Review Step ── */}
      {(step === "review" || step === "saving") && projectInfo && (
        <div className="space-y-6">
          {vrbDeadline && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <strong>VRB 심의 마감:</strong> <span data-testid="vrb-deadline-display">{vrbDeadline}</span>
              <span className="ml-2 text-blue-600">(입찰마감 3일 전)</span>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">프로젝트 기본 정보</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>프로젝트명</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div><Label>발주처</Label><Input value={editClient} onChange={(e) => setEditClient(e.target.value)} /></div>
              <div><Label>사업 예산 (원)</Label><Input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} /></div>
              <div><Label>입찰 마감일</Label><Input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} /></div>
            </CardContent>
          </Card>

          {/* Rules summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">자동추출 완료 ({autoRules.length}건)</CardTitle></CardHeader>
            <CardContent data-testid="parse-result-auto">
              {autoRules.length > 0 ? (
                <div className="space-y-2">{autoRules.map((r, i) => <RuleRow key={i} rule={r} />)}</div>
              ) : <p className="text-sm text-muted-foreground">자동추출 항목이 없습니다.</p>}
            </CardContent>
          </Card>

          {reviewRules.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">확인필요 ({reviewRules.length}건)</CardTitle></CardHeader>
              <CardContent data-testid="parse-result-review">
                <div className="space-y-2">{reviewRules.map((r, i) => <RuleRow key={i} rule={r} />)}</div>
              </CardContent>
            </Card>
          )}

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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">&ldquo;{rule.source_text}&rdquo;
            {rule.source_page && <span className="ml-1">(p.{rule.source_page})</span>}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className={source.className}>{source.text}</Badge>
        <span className={`text-xs font-medium ${confidence >= 70 ? "text-green-600" : "text-yellow-600"}`}>{confidence}%</span>
      </div>
    </div>
  );
}
