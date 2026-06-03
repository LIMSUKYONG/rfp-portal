import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const RFP_BUCKET = "rfp-files";

const SYSTEM_PROMPT = `당신은 한국 공공기관 RFP(제안요청서) PDF를 분석하는 전문가입니다.
PDF에서 다음 정보를 JSON으로 추출하세요. 확인할 수 없는 항목은 null로 반환하세요.

⚠️ 절대 원칙: 특정 서식명/서류명/기관명을 추측하거나 하드코딩하지 마세요.
오직 이 RFP PDF에 실제로 적힌 내용만 추출하세요. 문서에 없으면 null입니다.

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
      "rule_type": "규칙유형",
      "rule_target": "대상 (string | null)",
      "condition_type": "조건유형: min/max/required/range/etc (string | null)",
      "condition_value": { "값 객체" },
      "source_type": "ai_extracted | law_research | default",
      "source_text": "원문 인용 (string | null)",
      "source_page": "PDF 페이지 번호 (string | null)",
      "needs_review": "사람 확인 필요 여부 (boolean)",
      "confidence": "추출 신뢰도 0~1 (number)"
    }
  ],
  "documents": [
    {
      "form_number": "RFP에서 추출한 서식번호 (string | null)",
      "doc_name": "RFP에서 추출한 서류명 (string)",
      "submit_timing": "bid_time | contract_time | post_contract",
      "rfp_page": "출처 페이지 (string | null)",
      "condition_note": "주)항 원문 그대로 (string | null)",
      "proof_items": [
        {
          "item_name": "RFP에서 추출한 증빙서류명 (string)",
          "condition_type": "AND | OR",
          "condition_group": 1,
          "min_required": 1,
          "issuing_org": "발급기관 (string | null — RFP에 없으면 null)",
          "validity_days": null,
          "needs_review": false
        }
      ]
    }
  ],
  "laws": [
    {
      "law_name": "법령명 (string)",
      "article": "조항 (string | null)",
      "content": "관련 내용 요약 (string | null)",
      "url": null,
      "is_current": true,
      "needs_review": false
    }
  ]
}

규칙 유형: qualification, doc_requirement, tech_spec, eval_criteria, subcontract, schedule, penalty, bid_deposit, presentation_rules, direct_purchase_items, proposal_format, other

서식 및 증빙서류 추출 규칙:
1. 이 RFP/입찰공고에 명시된 서식 목록을 전부 찾아라.
2. 각 서식 하단의 주), 비고, 유의사항을 반드시 확인하라.
3. 증빙서류 제출 조건을 다음 기준으로 판단하라:
   - AND 조건 키워드: 모두, 각각, 전부, 및, 와, 함께, 일체
   - OR 조건 키워드: 또는, 혹은, 중 하나, 택일, 하나만, 어느 하나, 택1
   - 복합 조건(AND+OR 혼합): condition_group 번호로 분리
   - 조건 불명확 시: condition_type="AND", needs_review=true (더 엄격한 기준)
4. 오직 이 RFP 문서에 실제로 적힌 내용만 추출하라. 추측 금지.
5. 문서에 없으면 needs_review=true로 표시하라.

법령 추출 규칙:
1. RFP에 인용된 법령명, 조항, 항, 호를 전부 추출하라.
2. 법령이 폐지/개정되었을 가능성이 있으면 is_current=false, needs_review=true.
3. 법령 URL은 알 수 없으면 null로 두라.

confidence가 0.7 미만이면 needs_review=true로 설정하세요.
JSON만 출력하세요.`;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { storagePath?: string };
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
    max_tokens: 16384,
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
            text: "이 RFP PDF를 분석하여 JSON으로 반환해주세요. projectInfo, rules, documents, laws 모두 포함. JSON만 출력하세요.",
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

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      projectInfo: Record<string, unknown>;
      rules: Record<string, unknown>[];
      documents?: Record<string, unknown>[];
      laws?: Record<string, unknown>[];
    };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Claude 응답 JSON 파싱 실패", raw: jsonStr },
      { status: 500 },
    );
  }
}
