import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geminiPdfToJson } from "@/lib/ai/gemini-client";
import { mockRfpParse } from "@/lib/ai/mock-responses";

const RFP_BUCKET = "rfp-files";

/* ── 4-section prompts ── */

const PROMPTS: Record<string, { system: string; user: string }> = {
  general: {
    system: `한국 공공기관 RFP PDF에서 일반사항만 추출하세요.
반드시 아래 JSON을 반환:
{
  "projectInfo": {
    "name": "프로젝트명 (string|null)",
    "client": "발주기관 (string|null)",
    "budget_amount": "예산 원단위 숫자 (number|null)",
    "bid_deadline": "입찰마감일 YYYY-MM-DD (string|null)",
    "project_type": "si/sm/consulting (string|null)",
    "category": "public/private (string|null)",
    "contract_method": "계약방식 (string|null)",
    "project_period": "사업기간 (string|null)",
    "warranty_period": "하자보수기간 (string|null)"
  },
  "rules": [
    {
      "rule_type": "qualification",
      "rule_target": "대상",
      "condition_type": "min/max/required",
      "condition_value": {},
      "source_type": "ai_extracted",
      "source_text": "원문인용",
      "source_page": "페이지번호",
      "needs_review": false,
      "confidence": 0.9
    }
  ]
}
자격요건(실적/인증/재무)과 일정 관련 규칙만 추출. 다른 내용 무시.
문서에 없으면 null. JSON만 출력.`,
    user: "이 RFP에서 사업개요, 자격요건, 일정만 추출하세요. JSON만 반환.",
  },

  documents: {
    system: `한국 공공기관 RFP PDF에서 제출서류와 서식만 추출하세요.
반드시 아래 JSON을 반환:
{
  "documents": [
    {
      "form_number": "서식번호 (string|null)",
      "doc_name": "서류명",
      "submit_timing": "bid_time|contract_time|post_contract",
      "rfp_page": "페이지번호",
      "condition_note": "주)항 원문 그대로",
      "proof_items": [
        {
          "item_name": "증빙서류명",
          "condition_type": "AND|OR",
          "condition_group": 1,
          "min_required": 1,
          "issuing_org": "발급기관 (null가능)",
          "validity_days": null,
          "needs_review": false
        }
      ]
    }
  ]
}
AND 키워드: 모두, 각각, 전부, 및, 와
OR 키워드: 또는, 중 하나, 택일, 택1
불명확 시: condition_type="AND", needs_review=true
문서에 없으면 추측 금지. JSON만 출력.`,
    user: "이 RFP에서 제출서류, 서식 목록, 증빙조건(AND/OR)만 추출하세요. JSON만 반환.",
  },

  requirements: {
    system: `한국 공공기관 RFP PDF에서 기능요건과 평가배점만 추출하세요.
반드시 아래 JSON을 반환:
{
  "rules": [
    {
      "rule_type": "eval_criteria|tech_spec",
      "rule_target": "항목명",
      "condition_type": "required|score",
      "condition_value": {"max_score": 0, "domain": ""},
      "source_type": "ai_extracted",
      "source_text": "원문인용",
      "source_page": "페이지번호",
      "needs_review": false,
      "confidence": 0.9
    }
  ]
}
요구기능, 평가항목, 배점만 추출. JSON만 출력.`,
    user: "이 RFP에서 요구기능 목록과 평가배점표만 추출하세요. JSON만 반환.",
  },

  conditions: {
    system: `한국 공공기관 RFP PDF에서 제안조건과 법령만 추출하세요.
반드시 아래 JSON을 반환:
{
  "rules": [
    {
      "rule_type": "proposal_format|bid_deposit|subcontract|penalty|schedule|other",
      "rule_target": "대상",
      "condition_type": "required|max|min",
      "condition_value": {},
      "source_type": "ai_extracted",
      "source_text": "원문인용",
      "source_page": "페이지번호",
      "needs_review": false,
      "confidence": 0.9
    }
  ],
  "laws": [
    {
      "law_name": "법령명",
      "article": "조항",
      "content": "관련내용",
      "url": null,
      "is_current": true,
      "needs_review": false
    }
  ]
}
제출형식, 입찰보증금, 하도급조건, 발표조건, 협상조건, 인용법령만 추출.
JSON만 출력.`,
    user: "이 RFP에서 제안조건, 입찰조건, 인용법령만 추출하세요. JSON만 반환.",
  },
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    storagePath?: string;
    step?: string; // "general" | "documents" | "requirements" | "conditions" | "all"
  };

  const { storagePath, step = "all" } = body;

  if (!storagePath) {
    return NextResponse.json({ error: "storagePath가 필요합니다." }, { status: 400 });
  }

  // Mock mode
  if (process.env.USE_AI_MOCK === "true") {
    return NextResponse.json(mockRfpParse);
  }

  // Download PDF
  const supabase = createAdminClient();
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(RFP_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `PDF 다운로드 실패: ${downloadError?.message ?? "파일 없음"}` },
      { status: 500 },
    );
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // Single step
  if (step !== "all" && PROMPTS[step]) {
    try {
      const prompt = PROMPTS[step];
      const jsonStr = await geminiPdfToJson(base64, "application/pdf", prompt.system, prompt.user);
      return NextResponse.json(JSON.parse(jsonStr));
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "AI 호출 실패" }, { status: 500 });
    }
  }

  // All steps sequentially
  try {
    const results: Record<string, unknown> = {};

    for (const key of ["general", "documents", "requirements", "conditions"] as const) {
      const prompt = PROMPTS[key];
      const jsonStr = await geminiPdfToJson(base64, "application/pdf", prompt.system, prompt.user);
      const parsed = JSON.parse(jsonStr);
      Object.assign(results, parsed);

      // Merge rules arrays
      if (parsed.rules && results.rules) {
        if (key !== "general") {
          (results.rules as unknown[]).push(...(parsed.rules as unknown[]));
        }
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI 호출 실패" }, { status: 500 });
  }
}
