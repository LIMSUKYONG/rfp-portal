"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QualificationItem } from "@/lib/api/qualification";
import { setCheckResult } from "@/lib/api/qualification.client";
import {
  CHECK_RESULT_CONFIG,
  CHECK_RESULT_ORDER,
  isChecklistComplete,
  itemTypeLabel,
  normalizeCheckResult,
  type CheckResult,
} from "@/lib/constants/checklist";
import { confirmAllPass } from "../_actions";

interface Props {
  projectId: string;
  items: QualificationItem[];
  experienceCount: number;
}

export function QualificationChecklist({ projectId, items, experienceCount }: Props) {
  const router = useRouter();
  const [optimisticItems, setOptimistic] = useOptimistic(
    items,
    (state, update: { id: string; result: CheckResult }) =>
      state.map((item) =>
        item.id === update.id ? { ...item, check_result: update.result } : item,
      ),
  );

  const complete = isChecklistComplete(optimisticItems.map((i) => i.check_result));
  const [isPending, startTransition] = useTransition();

  function handleSet(checkId: string, result: CheckResult) {
    startTransition(async () => {
      setOptimistic({ id: checkId, result });
      await setCheckResult(checkId, result);
      router.refresh();
    });
  }

  function handleConfirmAll() {
    startTransition(async () => {
      await confirmAllPass(projectId);
    });
  }

  return (
    <div className="space-y-6">
      {/* 전체 완료 배너 — 모든 항목이 적합/해당없음일 때만 노출 */}
      {complete && (
        <div
          data-testid="pass-all-banner"
          className="rounded-lg border border-green-200 bg-green-50 p-4"
        >
          <p className="mb-3 text-sm font-medium text-green-800">
            모든 자격요건 점검이 완료되었습니다. 트랙A(서류 준비)와 VRB 심의를 시작할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              data-testid="btn-start-track-a"
              onClick={handleConfirmAll}
              disabled={isPending}
              asChild
            >
              <Link href={`/projects/${projectId}/documents`}>트랙A 시작 (서류 준비)</Link>
            </Button>
            <Button
              data-testid="btn-start-track-b"
              variant="outline"
              onClick={handleConfirmAll}
              disabled={isPending}
              asChild
            >
              <Link href={`/projects/${projectId}/vrb`}>트랙B 시작 (VRB 심의)</Link>
            </Button>
          </div>
        </div>
      )}

      {/* 체크리스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            자격요건 체크리스트 ({optimisticItems.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="qualification-list" className="space-y-3">
            {optimisticItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">자격요건 항목이 없습니다.</p>
            ) : (
              optimisticItems.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  experienceCount={experienceCount}
                  disabled={isPending}
                  onSet={handleSet}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── 개별 항목 행 ─────────────────────────────────────────── */

function ChecklistRow({
  item,
  experienceCount,
  disabled,
  onSet,
}: {
  item: QualificationItem;
  experienceCount: number;
  disabled: boolean;
  onSet: (checkId: string, result: CheckResult) => void;
}) {
  const [showCondition, setShowCondition] = useState(false);
  const current = normalizeCheckResult(item.check_result);

  return (
    <div
      data-testid={`check-item-${item.id}`}
      className="flex items-start gap-3 rounded-lg border p-3"
    >
      {/* 판정 버튼 3종 */}
      <div className="flex shrink-0 gap-1">
        {CHECK_RESULT_ORDER.map((result) => {
          const meta = CHECK_RESULT_CONFIG[result];
          const active = current === result;
          return (
            <button
              key={result}
              data-testid={`check-${result}-${item.id}`}
              data-active={active}
              disabled={disabled}
              onClick={() => onSet(item.id, result)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                active ? meta.activeClass : meta.idleClass
              }`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* 내용 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{item.item_name}</span>
          <Badge
            variant="outline"
            data-testid={`item-type-${item.id}`}
            className="bg-slate-100 text-slate-600 border-slate-200"
          >
            {itemTypeLabel(item.item_type)}
          </Badge>
          {item.source_type === "default" && (
            <Badge
              variant="outline"
              className="bg-yellow-100 text-yellow-700 border-yellow-200"
            >
              확인필요
            </Badge>
          )}
        </div>

        {/* 조건 원문 접기/펼치기 (기본 접힘) */}
        {item.condition_text && (
          <div className="mt-1">
            <button
              type="button"
              data-testid={`condition-toggle-${item.id}`}
              onClick={() => setShowCondition((v) => !v)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showCondition ? "조건 원문 접기 ▲" : "조건 원문 보기 ▼"}
            </button>
            {showCondition && (
              <p
                data-testid={`condition-text-${item.id}`}
                className="mt-1 whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs text-muted-foreground"
              >
                {item.condition_text}
              </p>
            )}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {item.source_page && (
            <span className="text-xs text-blue-600">RFP p.{item.source_page}</span>
          )}
          {experienceCount > 0 && (
            <span data-testid={`hint-records-${item.id}`} className="text-xs text-green-600">
              유사 실적 {experienceCount}건 확인됨 — 자동 조회
            </span>
          )}
        </div>

        {item.source_type === "default" && (
          <p className="mt-1 text-xs text-yellow-600">
            ⚠ 이 항목은 기본 규칙에서 생성되었습니다. RFP 원문을 확인하세요.
          </p>
        )}
      </div>
    </div>
  );
}
