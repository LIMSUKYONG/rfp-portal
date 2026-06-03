"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RfpRule, LawReference } from "@/lib/types/database";
import { saveRuleValue, confirmRuleAction } from "../_actions";

const SOURCE_STYLE: Record<string, { text: string; className: string }> = {
  ai_extracted: { text: "AI 파싱", className: "bg-blue-100 text-blue-700 border-blue-200" },
  law_research: { text: "법령 리서치", className: "bg-purple-100 text-purple-700 border-purple-200" },
  default: { text: "기본값 — 수동 입력 필수", className: "bg-red-100 text-red-700 border-red-200" },
  manual: { text: "수동 입력", className: "bg-green-100 text-green-700 border-green-200" },
};

interface Props {
  projectId: string;
  rules: RfpRule[];
  laws: LawReference[];
  totalRules: number;
  pendingCount: number;
}

export function RulesList({ projectId, rules: initialRules, laws, totalRules, pendingCount: initialPending }: Props) {
  const [rules, setRules] = useState(initialRules);
  const [pendingCount, setPendingCount] = useState(initialPending);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const staleLaws = laws.filter((l) => l.research_status === "pending" || (l as LawReference & { is_current?: boolean }).is_current === false);
  const completedPct = totalRules > 0 ? Math.round(((totalRules - pendingCount) / totalRules) * 100) : 100;
  const allComplete = pendingCount === 0;

  // Group by source_type
  const aiRules = rules.filter((r) => r.source_type === "ai_extracted");
  const lawRules = rules.filter((r) => r.source_type === "law_research");
  const defaultRules = rules.filter((r) => r.source_type === "default");

  function handleConfirm(ruleId: string) {
    const editVal = editValues[ruleId];

    startTransition(async () => {
      if (editVal) {
        await saveRuleValue(ruleId, {
          rule_target: editVal,
          condition_value: { value: editVal },
        });
      }
      await confirmRuleAction(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setPendingCount((c) => c - 1);
    });
  }

  function renderSection(title: string, items: RfpRule[], sourceType: string) {
    if (items.length === 0) return null;
    const style = SOURCE_STYLE[sourceType] ?? SOURCE_STYLE.default;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {title} ({items.length}건)
            <Badge variant="outline" className={style.className}>{style.text}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((rule) => (
            <div
              key={rule.id}
              className="rounded-lg border p-3"
              data-testid={`rule-row-${rule.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rule.rule_type}</span>
                    {rule.rule_target && (
                      <span className="text-xs text-muted-foreground">— {rule.rule_target}</span>
                    )}
                  </div>
                  {rule.source_text && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      &ldquo;{rule.source_text}&rdquo;
                      {rule.source_page && <span className="ml-1">(p.{rule.source_page})</span>}
                    </p>
                  )}

                  {/* Input for default rules */}
                  {sourceType === "default" && (
                    <div className="mt-2">
                      <Input
                        data-testid={`rule-input-${rule.id}`}
                        placeholder="값을 직접 입력하세요"
                        value={editValues[rule.id] ?? ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [rule.id]: e.target.value }))
                        }
                        className="max-w-xs"
                      />
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  data-testid={`rule-confirm-btn-${rule.id}`}
                  onClick={() => handleConfirm(rule.id)}
                  disabled={isPending || (sourceType === "default" && !editValues[rule.id])}
                >
                  확인 완료
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* All complete banner */}
      {allComplete && (
        <div
          data-testid="rules-complete-banner"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          모든 규칙 검토가 완료되었습니다.
        </div>
      )}

      {/* Progress */}
      <div data-testid="rules-pct">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">규칙 검토 진행률</span>
          <span>{completedPct}% ({totalRules - pendingCount}/{totalRules})</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${completedPct}%` }} />
        </div>
      </div>

      {/* Stale law warning */}
      {staleLaws.length > 0 && (
        <div
          data-testid="law-warning-section"
          className="rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <p className="mb-2 text-sm font-medium text-red-700">
            ⚠ 확인 필요 법령 ({staleLaws.length}건)
          </p>
          <div className="space-y-1">
            {staleLaws.map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-xs text-red-600">
                <span>{l.law_name}</span>
                {l.law_url && (
                  <a href={l.law_url} target="_blank" rel="noopener noreferrer" className="underline">출처</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rule sections */}
      <div data-testid="rules-list" className="space-y-6">
        {renderSection("AI 파싱 결과", aiRules, "ai_extracted")}
        {renderSection("법령 리서치 결과", lawRules, "law_research")}
        {renderSection("기본값 — 수동 입력 필수", defaultRules, "default")}
      </div>
    </div>
  );
}
