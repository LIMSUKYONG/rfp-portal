"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QualificationItem } from "@/lib/api/qualification";
import { toggleCheckResult, confirmAllPass } from "../_actions";

interface Props {
  projectId: string;
  items: QualificationItem[];
  experienceCount: number;
}

export function QualificationChecklist({ projectId, items, experienceCount }: Props) {
  const [optimisticItems, setOptimistic] = useOptimistic(
    items,
    (state, update: { id: string; result: string }) =>
      state.map((item) =>
        item.id === update.id ? { ...item, check_result: update.result } : item,
      ),
  );

  const allPassed = optimisticItems.length > 0 && optimisticItems.every((i) => i.check_result === "pass");
  const [isPending, startTransition] = useTransition();

  function handleToggle(checkId: string, current: string | null) {
    const next = current === "pass" ? "pending" : "pass";
    startTransition(async () => {
      setOptimistic({ id: checkId, result: next });
      await toggleCheckResult(checkId, next as "pass" | "pending");
    });
  }

  function handleConfirmAll() {
    startTransition(async () => {
      await confirmAllPass(projectId);
    });
  }

  return (
    <div className="space-y-6">
      {/* All-pass banner */}
      {allPassed && (
        <div
          data-testid="pass-all-banner"
          className="rounded-lg border border-green-200 bg-green-50 p-4"
        >
          <p className="mb-3 text-sm font-medium text-green-800">
            모든 자격요건이 Pass되었습니다. 트랙A(서류 준비)와 트랙B(VRB 심의)를 병렬로 시작하세요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              data-testid="btn-start-track-a"
              onClick={handleConfirmAll}
              disabled={isPending}
              asChild
            >
              <Link href={`/projects/${projectId}/documents`}>
                트랙A 시작 (서류 준비)
              </Link>
            </Button>
            <Button
              data-testid="btn-start-track-b"
              variant="outline"
              onClick={handleConfirmAll}
              disabled={isPending}
              asChild
            >
              <Link href={`/projects/${projectId}/vrb`}>
                트랙B 시작 (VRB 심의)
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Checklist */}
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
                <div
                  key={item.id}
                  data-testid={`check-item-${item.id}`}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  {/* Toggle buttons */}
                  <div className="flex shrink-0 gap-1">
                    <button
                      data-testid={`check-pass-${item.id}`}
                      onClick={() => handleToggle(item.id, item.check_result)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        item.check_result === "pass"
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-green-100"
                      }`}
                    >
                      Pass
                    </button>
                    <button
                      data-testid={`check-pending-${item.id}`}
                      onClick={() => handleToggle(item.id, item.check_result)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        item.check_result !== "pass"
                          ? "bg-yellow-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-yellow-100"
                      }`}
                    >
                      확인중
                    </button>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.item_name}</span>
                      {item.item_type && (
                        <span className="text-xs text-muted-foreground">[{item.item_type}]</span>
                      )}
                      {item.source_type === "default" && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-100 text-yellow-700 border-yellow-200"
                        >
                          확인필요
                        </Badge>
                      )}
                    </div>

                    {item.condition_text && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.condition_text}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {item.source_page && (
                        <span className="text-xs text-blue-600">
                          RFP p.{item.source_page}
                        </span>
                      )}

                      {experienceCount > 0 && (
                        <span
                          data-testid={`hint-records-${item.id}`}
                          className="text-xs text-green-600"
                        >
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
