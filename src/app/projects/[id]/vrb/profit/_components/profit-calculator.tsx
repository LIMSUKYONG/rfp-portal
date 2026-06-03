"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKrw } from "@/lib/constants/phase";
import type { ProfitLoss } from "@/lib/types/database";
import { saveProfitLoss } from "../_actions";

interface Props {
  projectId: string;
  profitLoss: ProfitLoss | null;
  inhouseLaborCost: number;
  outsourceCost: number;
  goodsCost: number;
  directPurchaseAmount: number;
  profitThreshold: number | null;
}

export function ProfitCalculator({
  projectId,
  profitLoss: pl,
  inhouseLaborCost,
  outsourceCost,
  goodsCost,
  directPurchaseAmount,
  profitThreshold,
}: Props) {
  const [proposalPrice, setProposalPrice] = useState(pl?.proposal_price?.toString() ?? "");
  const [licenseCost, setLicenseCost] = useState(pl?.license_cost?.toString() ?? "0");
  const [directExpense, setDirectExpense] = useState(pl?.direct_expense?.toString() ?? "0");
  const [contingency, setContingency] = useState(pl?.contingency?.toString() ?? "0");
  const [otherCost, setOtherCost] = useState(pl?.other_cost?.toString() ?? "0");
  const [strategicReason, setStrategicReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Calculate totals
  const price = Number(proposalPrice) || 0;
  const license = Number(licenseCost) || 0;
  const direct = Number(directExpense) || 0;
  const cont = Number(contingency) || 0;
  const other = Number(otherCost) || 0;

  const totalCost = license + inhouseLaborCost + outsourceCost + goodsCost + direct + cont + other;
  const profit = price - totalCost;
  const profitRate = price > 0 ? (profit / price) * 100 : 0;
  const thresholdPct = profitThreshold ?? 22; // 내부 기준 기본값
  const belowThreshold = profitRate < thresholdPct;

  function handleSave() {
    startTransition(async () => {
      await saveProfitLoss(projectId, {
        proposal_price: Number(proposalPrice) || 0,
        license_cost: Number(licenseCost) || 0,
        direct_expense: Number(directExpense) || 0,
        contingency: Number(contingency) || 0,
        other_cost: Number(otherCost) || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Auto-sync banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        트랙A 협력업체 등록/수정 시 외주비·물품비·직접구매가 DB 트리거로 자동 반영됩니다.
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue */}
        <Card>
          <CardHeader><CardTitle className="text-base">매출</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>제안가 (원)</Label>
              <Input type="number" value={proposalPrice} onChange={(e) => setProposalPrice(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Cost breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">원가 내역</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>라이선스</Label>
              <Input type="number" value={licenseCost} onChange={(e) => setLicenseCost(e.target.value)} />
            </div>
            <div data-testid="profit-inhouse">
              <Label>인건비 (자사)</Label>
              <p className="mt-1 text-sm font-medium">{formatKrw(inhouseLaborCost)}</p>
              <p className="text-xs text-muted-foreground">rfp_inhouse_members 자동 집계</p>
            </div>
            <div data-testid="profit-outsource">
              <Label>외주비</Label>
              <p className="mt-1 text-sm font-medium">{formatKrw(outsourceCost)}</p>
              <p className="text-xs text-muted-foreground">rfp_partners(subcontract) 자동 반영</p>
            </div>
            <div data-testid="profit-goods">
              <Label>물품비</Label>
              <p className="mt-1 text-sm font-medium">{formatKrw(goodsCost)}</p>
              <p className="text-xs text-muted-foreground">rfp_partners(goods_supply) 자동 반영</p>
            </div>
            <div>
              <Label>직접경비</Label>
              <Input type="number" value={directExpense} onChange={(e) => setDirectExpense(e.target.value)} />
            </div>
            <div>
              <Label>예비비</Label>
              <Input type="number" value={contingency} onChange={(e) => setContingency(e.target.value)} />
            </div>
            <div>
              <Label>기타 원가</Label>
              <Input type="number" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} />
            </div>
            {directPurchaseAmount > 0 && (
              <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
                직접구매 {formatKrw(directPurchaseAmount)} — 원가에서 제외 처리됨
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="grid grid-cols-4 gap-4 py-6 text-center">
          <div>
            <p className="text-xs text-muted-foreground">총 원가</p>
            <p className="text-lg font-bold">{formatKrw(totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">프로젝트 이익</p>
            <p className={`text-lg font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatKrw(profit)}
            </p>
          </div>
          <div data-testid="profit-rate">
            <p className="text-xs text-muted-foreground">이익률</p>
            <p className={`text-lg font-bold ${belowThreshold ? "text-red-600" : "text-green-600"}`}>
              {profitRate.toFixed(1)}%
            </p>
          </div>
          <div data-testid="profit-threshold">
            <p className="text-xs text-muted-foreground">기준수익률</p>
            <p className="text-lg font-bold">{thresholdPct}%</p>
          </div>
        </CardContent>
      </Card>

      {/* Below threshold warning */}
      {belowThreshold && price > 0 && (
        <Card data-testid="profit-warning">
          <CardContent className="space-y-3 pt-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              ⚠ 이익률 {profitRate.toFixed(1)}%가 기준수익률 {thresholdPct}% 미만입니다.
              전략적 접근 사유를 입력하세요.
            </div>
            <Input
              data-testid="strategic-reason"
              placeholder="전략적 접근 사유 (예: 신규 고객 확보, 레퍼런스 확보 등)"
              value={strategicReason}
              onChange={(e) => setStrategicReason(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          data-testid="profit-save-btn"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "저장 중…" : "손익 저장"}
        </Button>
        {saved && <span className="text-sm text-green-600">저장 완료</span>}
      </div>
    </div>
  );
}
