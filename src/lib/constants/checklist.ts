/**
 * SCR-102 적격심사 / SCR-201 서류 체크리스트 공통 표시 규격.
 *
 * 개발 표준 v2.0 — Zero Hardcoding / Zero Repeat / Type Safe:
 * 라벨·색상은 전부 여기 한 곳에서만 정의하고, 페이지·컴포넌트·테스트가 참조한다.
 */
import type { DocCategory, DocValidationStatus } from "@/lib/types/database";

/* ── SCR-102: 적격심사 판정값 ───────────────────────────────── */

export type CheckResult = "pass" | "fail" | "pending";

export interface CheckResultMeta {
  /** 버튼 라벨 */
  label: string;
  /** 활성(선택됨) 상태 버튼 스타일 */
  activeClass: string;
  /** 비활성 상태 버튼 스타일 (hover 힌트 포함) */
  idleClass: string;
}

export const CHECK_RESULT_CONFIG: Record<CheckResult, CheckResultMeta> = {
  pass: {
    label: "적합",
    activeClass: "bg-green-500 text-white",
    idleClass: "bg-muted text-muted-foreground hover:bg-green-100",
  },
  fail: {
    label: "해당없음",
    activeClass: "bg-gray-500 text-white",
    idleClass: "bg-muted text-muted-foreground hover:bg-gray-200",
  },
  pending: {
    label: "확인중",
    activeClass: "bg-yellow-500 text-white",
    idleClass: "bg-muted text-muted-foreground hover:bg-yellow-100",
  },
};

/** 버튼 노출 순서 */
export const CHECK_RESULT_ORDER: CheckResult[] = ["pass", "fail", "pending"];

/** 미점검(또는 알 수 없는 값)은 pending으로 간주 */
export function normalizeCheckResult(value: string | null): CheckResult {
  return value === "pass" || value === "fail" ? value : "pending";
}

/** 전체 항목이 pass 또는 fail(해당없음)이면 다음 단계(트랙A+VRB) 진입 가능 */
export function isChecklistComplete(
  results: Array<string | null>,
): boolean {
  if (results.length === 0) return false;
  return results.every((r) => r === "pass" || r === "fail");
}

/* ── 적격심사 항목 유형 뱃지 ────────────────────────────────── */

export const ITEM_TYPE_LABEL: Record<string, string> = {
  experience: "실적",
  registration: "등록",
  restriction: "제한",
  financial: "재무",
  other: "기타",
};

export function itemTypeLabel(itemType: string | null): string {
  if (!itemType) return ITEM_TYPE_LABEL.other;
  return ITEM_TYPE_LABEL[itemType] ?? ITEM_TYPE_LABEL.other;
}

/* ── SCR-201: 서식/증빙 구분 뱃지 ───────────────────────────── */

export interface CategoryMeta {
  label: string;
  className: string;
}

export const DOC_CATEGORY_BADGE: Record<DocCategory, CategoryMeta> = {
  form: { label: "서식", className: "bg-blue-100 text-blue-700 border-blue-200" },
  proof: { label: "증빙", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

/* ── SCR-201: 검증 상태 뱃지 ────────────────────────────────── */

export type ValidationStatusKey = Exclude<DocValidationStatus, null>;

export const VALIDATION_STATUS_CONFIG: Record<ValidationStatusKey, CategoryMeta> = {
  valid: { label: "유효", className: "bg-green-100 text-green-700 border-green-200" },
  expired: { label: "기간만료", className: "bg-red-100 text-red-700 border-red-200" },
  expiring_soon: { label: "만료임박", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  needs_review: { label: "검토필요", className: "bg-orange-100 text-orange-700 border-orange-200" },
  // error: AI 검증 실패 등 예외 — 기간만료와 동일 톤으로 표시(하위호환)
  error: { label: "오류", className: "bg-red-100 text-red-700 border-red-200" },
  pending: { label: "대기중", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function validationMeta(status: DocValidationStatus): CategoryMeta {
  return VALIDATION_STATUS_CONFIG[status ?? "pending"] ?? VALIDATION_STATUS_CONFIG.pending;
}

/** 완성률 = validation_status가 valid인 건수 / 전체 건수 × 100 */
export function completionPct(statuses: DocValidationStatus[]): number {
  if (statuses.length === 0) return 0;
  const valid = statuses.filter((s) => s === "valid").length;
  return Math.round((valid / statuses.length) * 100);
}
