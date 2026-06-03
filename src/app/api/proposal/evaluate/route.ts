import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geminiPdfToJson } from "@/lib/ai/gemini-client";
import { saveProposalEvaluation } from "@/lib/api/proposals";
import { mockProposalEvaluate } from "@/lib/ai/mock-responses";

const PROPOSAL_BUCKET = "proposal-files";

const SYSTEM_PROMPT = `당신은 한국 공공입찰 제안서 평가 전문가입니다.
제안서 PDF를 분석하여 아래 JSON을 반환하세요.

⚠️ 절대 원칙: 특정 점수나 기준을 추측하지 마세요.
오직 제안서 내용을 기반으로 분석하세요.

{
  "page_count": "총 페이지 수 (number)",
  "format_valid": "형식 기준 충족 여부 (boolean)",
  "format_issues": [{"type": "string", "message": "string"}],
  "has_reference_table": "참조표 포함 여부 (boolean)",
  "has_glossary": "약어표 포함 여부 (boolean)",
  "vague_expr_count": "모호표현 개수 (number)",
  "qualitative_score": "정성평가 예상 점수 (number | null)",
  "quantitative_score": "정량평가 예상 점수 (number | null)",
  "tech_score_total": "기술점수 합계 (number | null)",
  "threshold_pct": "협상자격 기준 비율 (number | null)",
  "threshold_score": "협상자격 기준 점수 (number | null)",
  "meets_threshold": "협상자격 충족 여부 (boolean)",
  "coverage_rate": "요구사항 커버리지 비율 0~100 (number | null)",
  "weak_items": [{"item": "string", "reason": "string"}],
  "recommendations": [{"type": "string", "message": "string"}]
}

평가 기준:
- 형식: 목차, 페이지 제한, 참조표, 약어표 존재 여부
- 모호표현: "검토 예정", "추후 결정", "~할 수 있음" 등 불확실한 표현 카운트
- 정성평가: 기술 이해도, 방법론, 프로젝트 관리 등
- 정량평가: 실적, 인증, 재무 등 객관적 항목
- 기술점수: 정성 + 정량 합산
- 협상자격: tech_score_total >= threshold_score 여부

JSON만 출력하세요.`;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    projectId?: string;
    storagePath?: string;
    fileSizeMb?: number;
  };

  const { projectId, storagePath, fileSizeMb } = body;

  if (!projectId || !storagePath) {
    return NextResponse.json({ error: "projectId와 storagePath가 필요합니다." }, { status: 400 });
  }

  // Mock mode
  if (process.env.USE_AI_MOCK === "true") {
    return NextResponse.json(mockProposalEvaluate);
  }

  // 1. Download from Supabase Storage
  const supabase = createAdminClient();
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(PROPOSAL_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `파일 다운로드 실패: ${downloadError?.message ?? "파일 없음"}` },
      { status: 500 },
    );
  }

  // 2. Base64
  const arrayBuffer = await fileData.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // 3. Call Gemini API
  try {
    const jsonStr = await geminiPdfToJson(
      base64,
      "application/pdf",
      SYSTEM_PROMPT,
      "이 제안서를 평가하고 JSON을 반환해주세요.",
    );

    const result = JSON.parse(jsonStr) as Record<string, unknown>;

    // 4. Save to DB
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/${PROPOSAL_BUCKET}/${storagePath}`;

    await saveProposalEvaluation(projectId, fileUrl, fileSizeMb ?? 0, {
      page_count: (result.page_count as number) ?? null,
      format_valid: (result.format_valid as boolean) ?? false,
      format_issues: (result.format_issues as Record<string, unknown>[]) ?? [],
      has_reference_table: (result.has_reference_table as boolean) ?? false,
      has_glossary: (result.has_glossary as boolean) ?? false,
      vague_expr_count: (result.vague_expr_count as number) ?? 0,
      qualitative_score: (result.qualitative_score as number) ?? null,
      quantitative_score: (result.quantitative_score as number) ?? null,
      tech_score_total: (result.tech_score_total as number) ?? null,
      threshold_pct: (result.threshold_pct as number) ?? null,
      threshold_score: (result.threshold_score as number) ?? null,
      meets_threshold: (result.meets_threshold as boolean) ?? false,
      coverage_rate: (result.coverage_rate as number) ?? null,
      weak_items: (result.weak_items as Record<string, unknown>[]) ?? [],
      recommendations: (result.recommendations as Record<string, unknown>[]) ?? [],
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 호출 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
