import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const RFP_BUCKET = "rfp-files";

const SYSTEM_PROMPT = `당신은 한국 공공기관 RFP(제안요청서) PDF를 분석하는 전문가입니다.
PDF에서 다음 정보를 JSON으로 추출하세요. 확인할 수 없는 항목은 null로 반환하세요.

반드시 아래 JSON 스키마를 따르세요:
{
  "projectInfo": {
    "name": "프로젝트명 (string | null)",
    "client": "발주처 (string | null)",
    "budget_amount": "사업예산 원 단위 숫자 (number | null)",
    "bid_deadline": "입찰마감일 YYYY-MM-DD (string | null)",
    "project_type": "사업유형: si/sm/consulting/etc (string | null)",
    "category": "분류: public/private/etc (string | null)",
    "contract_method": "계약방식 (string | null)",
    "project_period": "사업기간 (string | null)",
    "warranty_period": "하자보수기간 (string | null)"
  },
  "rules": [
    {
      "rule_type": "규칙유형 (qualification/doc_requirement/tech_spec/etc)",
      "rule_target": "대상 (string | null)",
      "condition_type": "조건유형: min/max/required/range/etc (string | null)",
      "condition_value": { "값 객체" },
      "source_type": "ai_extracted | law_research | default",
      "source_text": "원문 인용 (string | null)",
      "source_page": "PDF 페이지 번호 (string | null)",
      "needs_review": "사람 확인 필요 여부 (boolean)",
      "confidence": "추출 신뢰도 0~1 (number)"
    }
  ]
}

규칙 유형 예시:
- qualification: 입찰참가자격 (실적, 인증, 재무)
- doc_requirement: 필수 제출서류
- tech_spec: 기술적 요구사항
- eval_criteria: 평가기준
- subcontract: 하도급 제한
- schedule: 일정 관련
- penalty: 계약 불이행 시 제재
- other: 기타

confidence가 0.7 미만이면 needs_review=true로 설정하세요.`;

export async function POST(request: NextRequest) {
  const body = await request.json() as { storagePath?: string };
  const { storagePath } = body;

  if (!storagePath) {
    return NextResponse.json(
      { error: "storagePath가 필요합니다." },
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

  // 1. Download PDF from Supabase Storage
  const supabase = createClient();
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(RFP_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `PDF 다운로드 실패: ${downloadError?.message ?? "파일 없음"}` },
      { status: 500 },
    );
  }

  // 2. Convert to base64
  const arrayBuffer = await fileData.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // 3. Call Claude API
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: "이 RFP PDF를 분석하여 JSON으로 반환해주세요. JSON만 출력하세요.",
          },
        ],
      },
    ],
  });

  // 4. Extract JSON from response
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json(
      { error: "Claude 응답에 텍스트가 없습니다." },
      { status: 500 },
    );
  }

  // Strip markdown code fences if present
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      projectInfo: Record<string, unknown>;
      rules: Record<string, unknown>[];
    };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Claude 응답 JSON 파싱 실패", raw: jsonStr },
      { status: 500 },
    );
  }
}
