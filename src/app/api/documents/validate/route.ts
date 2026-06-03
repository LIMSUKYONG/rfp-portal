import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiPdfToJson } from "@/lib/ai/gemini-client";
import { updateDocumentValidation } from "@/lib/api/documents";
import { mockDocumentValidate } from "@/lib/ai/mock-responses";

const DOC_BUCKET = "document-files";

const SYSTEM_PROMPT = `당신은 한국 공공입찰 제출서류를 검증하는 전문가입니다.
업로드된 서류를 분석하여 아래 JSON을 반환하세요:

{
  "validation_status": "valid | expiring_soon | error | needs_review",
  "validation_message": "검증 결과 메시지 (한국어)",
  "calculated_score": "배점이 있는 경우 점수 (number | null)",
  "ai_issue_date": "발급일 YYYY-MM-DD (string | null)",
  "ai_expiry_date": "만료일 YYYY-MM-DD (string | null)"
}

검증 기준:
- valid: 서류가 유효하고 요건을 충족
- expiring_soon: 서류가 유효하지만 만료일이 30일 이내
- error: 서류가 유효하지 않거나 요건 미충족
- needs_review: 자동 판단이 어려운 경우

신용등급 서류의 경우 등급에 따른 배점(calculated_score)을 계산하세요.
JSON만 출력하세요.`;

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    docId?: string;
    storagePath?: string;
    fileSizeMb?: number;
  };

  const { docId, storagePath, fileSizeMb } = body;

  if (!docId || !storagePath) {
    return NextResponse.json({ error: "docId와 storagePath가 필요합니다." }, { status: 400 });
  }

  // Mock mode
  if (process.env.USE_AI_MOCK === "true") {
    const cases = [mockDocumentValidate.valid, mockDocumentValidate.expiring_soon, mockDocumentValidate.needs_review];
    const pick = cases[Math.floor(Math.random() * cases.length)];
    return NextResponse.json(pick);
  }

  // 1. Download file from Supabase Storage
  const supabase = createClient();
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(DOC_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `파일 다운로드 실패: ${downloadError?.message ?? "파일 없음"}` },
      { status: 500 },
    );
  }

  // 2. Convert to base64
  const arrayBuffer = await fileData.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = fileData.type || "application/pdf";

  // 3. Call Gemini API
  try {
    const jsonStr = await geminiPdfToJson(
      base64,
      mimeType,
      SYSTEM_PROMPT,
      "이 서류를 검증하고 JSON을 반환해주세요.",
    );

    const result = JSON.parse(jsonStr);

    // 4. Update document in DB
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/${DOC_BUCKET}/${storagePath}`;

    await updateDocumentValidation(docId, {
      file_url: fileUrl,
      file_size_mb: fileSizeMb ?? 0,
      validation_status: result.validation_status,
      validation_message: result.validation_message,
      calculated_score: result.calculated_score,
      ai_issue_date: result.ai_issue_date,
      ai_expiry_date: result.ai_expiry_date,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 호출 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
