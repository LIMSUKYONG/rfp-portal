import { NextResponse, type NextRequest } from "next/server";
import { updateCheckStatus } from "@/lib/api/qualification";
import { CHECK_RESULT_CONFIG, type CheckResult } from "@/lib/constants/checklist";

const VALID_RESULTS = Object.keys(CHECK_RESULT_CONFIG) as CheckResult[];

function isCheckResult(value: unknown): value is CheckResult {
  return typeof value === "string" && VALID_RESULTS.includes(value as CheckResult);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await request.json().catch(() => ({}))) as { check_result?: unknown };

  if (!isCheckResult(body.check_result)) {
    return NextResponse.json(
      { error: `check_result는 ${VALID_RESULTS.join(" | ")} 중 하나여야 합니다.` },
      { status: 400 },
    );
  }

  const { error } = await updateCheckStatus(params.id, body.check_result);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ id: params.id, check_result: body.check_result });
}
