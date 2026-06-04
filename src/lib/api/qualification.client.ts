/**
 * Client-safe 적격심사 함수 — 서버 전용 import 없음.
 */
import type { CheckResult } from "@/lib/constants/checklist";

export async function setCheckResult(
  checkId: string,
  result: CheckResult,
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`/api/qualification-checks/${checkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ check_result: result }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `업데이트 실패 (${res.status}): ${text.slice(0, 120)}` };
    }
    // 성공 — body는 사용하지 않으므로 파싱하지 않는다(빈 body 안전)
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "네트워크 오류" };
  }
}
