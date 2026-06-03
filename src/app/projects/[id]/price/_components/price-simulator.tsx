"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/lib/constants/phase";
import type { PriceSimulation, ProjectPhase } from "@/lib/types/database";
import { saveScenario, confirmBid } from "../_actions";

interface Scenario { name: string; price: number; profitRate: number; winProb: number }

interface Props {
  projectId: string;
  simulation: PriceSimulation | null;
  projectPhase: ProjectPhase | null;
  budgetAmount: number | null;
  techScore: number | null;
  priceFormula: Record<string, unknown> | null;
}

export function PriceSimulator({ projectId, simulation, projectPhase, budgetAmount, techScore, priceFormula }: Props) {
  const trackADone = projectPhase === "track_a_done" || projectPhase === "price_ready";
  const vrbApproved = projectPhase === "vrb_approved" || projectPhase === "price_ready";
  const gateOpen = trackADone && vrbApproved;

  const budget = budgetAmount ?? 0;
  const scenarios: Scenario[] = [
    { name: "보수적", price: Math.round(budget * 0.95), profitRate: 25, winProb: 40 },
    { name: "표준", price: Math.round(budget * 0.90), profitRate: 20, winProb: 65 },
    { name: "공격적", price: Math.round(budget * 0.85), profitRate: 15, winProb: 85 },
  ];

  const [selectedIdx, setSelectedIdx] = useState<number | null>(simulation?.selected_price ? 1 : null);
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    if (selectedIdx === null) return;
    const s = scenarios[selectedIdx];
    startTransition(async () => {
      await saveScenario(projectId, {
        selected_price: s.price,
        scenarios: scenarios.map((sc) => ({ name: sc.name, price: sc.price, profitRate: sc.profitRate, winProb: sc.winProb })),
        tech_score: techScore ?? undefined,
        budget_amount: budget || undefined,
      });
      await confirmBid(projectId);
      setConfirmed(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* Gate status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <GateCard testId="gate-track-a" label="트랙A 완료" ok={trackADone} link={`/projects/${projectId}/proposal`} />
        <GateCard testId="gate-vrb" label="VRB 승인" ok={vrbApproved} link={`/projects/${projectId}/vrb`} />
      </div>

      {!gateOpen && (
        <div data-testid="gate-locked" className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center text-sm text-yellow-700">
          트랙A 완료 + VRB 승인이 모두 필요합니다.
        </div>
      )}

      {gateOpen && (
        <>
          <div data-testid="gate-unlocked" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            수렴 게이트 통과 — 가격 시뮬레이션이 활성화되었습니다.
          </div>

          {/* Scenario table */}
          <Card>
            <CardHeader><CardTitle className="text-base">가격 시나리오</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scenarios.map((s, i) => {
                  const isRecommended = i === 1;
                  const isSelected = selectedIdx === i;
                  const testId = i === 0 ? "scenario-conservative" : i === 1 ? "scenario-standard" : "scenario-aggressive";

                  return (
                    <div
                      key={s.name}
                      data-testid={testId}
                      onClick={() => setSelectedIdx(i)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                        isSelected ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50"
                      } ${isRecommended ? "ring-1 ring-blue-300" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${isSelected ? "bg-blue-500" : "bg-muted"}`} />
                        <span className="font-medium">{s.name}</span>
                        {isRecommended && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200" data-testid="recommended-row">
                            추천
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-6 text-sm">
                        <span>입찰가: {formatKrw(s.price)}</span>
                        <span>이익률: {s.profitRate}%</span>
                        <span>낙찰확률: {s.winProb}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              data-testid="confirm-price-btn"
              onClick={handleConfirm}
              disabled={selectedIdx === null || isPending || confirmed}
            >
              {isPending ? "처리 중…" : confirmed ? "입찰가 확정 완료" : "입찰가 확정"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function GateCard({ testId, label, ok, link }: { testId: string; label: string; ok: boolean; link: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex items-center justify-between py-4">
        <span className="text-sm font-medium">{label}</span>
        {ok ? (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">완료</Badge>
        ) : (
          <Link href={link} className="text-sm text-blue-600 hover:underline">이동 →</Link>
        )}
      </CardContent>
    </Card>
  );
}
