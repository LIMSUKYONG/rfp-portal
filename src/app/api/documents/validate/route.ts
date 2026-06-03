import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { updateDocumentValidation } from "@/lib/api/documents";

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
    return NextResponse.json(
      { error: "docId와 storagePath가 필요합니다." },
      { status: 400 },
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
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
  const mimeType = (fileData.type || "application/pdf") as "application/pdf";

  // 3. Call Claude API
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: mimeType, data: base64 },
          },
          {
            type: "text",
            text: "이 서류를 검증하고 JSON을 반환해주세요.",
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "Claude 응답 없음" }, { status: 500 });
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let result: {
    validation_status: string;
    validation_message: string | null;
    calculated_score: number | null;
    ai_issue_date: string | null;
    ai_expiry_date: string | null;
  };

  try {
    result = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패", raw: jsonStr }, { status: 500 });
  }

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
}
