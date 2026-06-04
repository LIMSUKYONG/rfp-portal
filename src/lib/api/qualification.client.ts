/**
 * Client-safe 적격심사 함수 — 서버 전용 import 없음.
 */
import type { CheckResult } from "@/lib/constants/checklist";

export async function setCheckResult(
  checkId: string,
  result: CheckResult,
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/qualification-checks/${checkId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_result: result }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `업데이트 실패: ${text || res.status}` };
  }

  return { error: null };
}
