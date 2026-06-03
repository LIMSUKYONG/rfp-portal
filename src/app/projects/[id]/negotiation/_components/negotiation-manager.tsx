"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeDday, formatKrw } from "@/lib/constants/phase";
import type { Negotiation } from "@/lib/types/database";
import { addRound, confirmNegotiation } from "../_actions";

interface Props {
  projectId: string;
  negotiations: Negotiation[];
  firstBidPrice: number | null;
  negotiationRules: Record<string, unknown> | null;
  deadline: string | null;
}

export function NegotiationManager({ projectId, negotiations: initial, firstBidPrice, negotiationRules, deadline }: Props) {
  const [negotiations, setNegotiations] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formChanges, setFormChanges] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  const ddayText = computeDday(deadline);

  // Negotiation range from rules
  const minRate = (negotiationRules?.min_rate as number) ?? null;
  const maxRate = (negotiationRules?.max_rate as number) ?? null;
  const minPrice = firstBidPrice && minRate ? Math.round(firstBidPrice * (minRate / 100)) : null;
  const maxPrice = firstBidPrice && maxRate ? Math.round(firstBidPrice * (maxRate / 100)) : null;

  function handleAddRound() {
    startTransition(async () => {
      await addRound(projectId, {
        negotiation_date: formDate || undefined,
        deadline: formDeadline || undefined,
        price_changes: formPrice || undefined,
        scope_changes: formChanges || undefined,
        final_amount: Number(formPrice) || undefined,
        negotiation_status: "in_progress",
      });
      setNegotiations((prev) => [...prev, {
        id: crypto.randomUUID(),
        project_id: projectId,
        negotiation_round: prev.length + 1,
        negotiation_date: formDate || null,
        deadline: formDeadline || null,
        negotiation_status: "in_progress",
        scope_changes: formChanges || null,
        price_changes: formPrice || null,
        final_amount: Number(formPrice) || null,
        rejection_reason: null,
        created_at: new Date().toISOString(),
      }]);
      setShowForm(false);
      setFormDate(""); setFormDeadline(""); setFormPrice(""); setFormChanges("");
    });
  }

  function handleConfirm() {
    const lastRound = negotiations[negotiations.length - 1];
    const amount = lastRound?.final_amount ?? Number(formPrice) ?? 0;
    startTransition(async () => {
      await confirmNegotiation(projectId, amount);
      setConfirmed(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* D-day */}
      {deadline && (
        <div data-testid="negotiation-dday" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-sm text-blue-800">
          협상 기한: {ddayText} ({deadline})
        </div>
      )}

      {/* Negotiation range */}
      <Card data-testid="negotiation-range">
        <CardContent className="grid grid-cols-3 gap-4 py-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">최초 입찰가</p>
            <p className="text-sm font-medium">{formatKrw(firstBidPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">하한</p>
            <p className="text-sm font-medium">{minPrice ? formatKrw(minPrice) : "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">상한</p>
            <p className="text-sm font-medium">{maxPrice ? formatKrw(maxPrice) : "-"}</p>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader><CardTitle className="text-base">협상 이력 ({negotiations.length}회차)</CardTitle></CardHeader>
        <CardContent data-testid="negotiation-history">
          {negotiations.length === 0 ? (
            <p className="text-sm text-muted-foreground">협상 이력이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {negotiations.map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-lg border p-3" data-testid={`negotiation-round-${n.negotiation_round}`}>
                  <div>
                    <span className="text-sm font-medium">{n.negotiation_round}회차</span>
                    {n.negotiation_date && <span className="ml-2 text-xs text-muted-foreground">{n.negotiation_date}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {n.final_amount && <span className="text-sm">{formatKrw(n.final_amount)}</span>}
                    <Badge variant="outline" className={n.negotiation_status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {n.negotiation_status ?? "진행중"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add round */}
      {!showForm && !confirmed && (
        <Button onClick={() => setShowForm(true)}>협상 회차 추가</Button>
      )}

      {showForm && (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div><Label>협상일</Label><Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} /></div>
            <div><Label>마감일</Label><Input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} /></div>
            <div><Label>변경 금액 (원)</Label><Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} /></div>
            <div><Label>범위 변경사항</Label><Input value={formChanges} onChange={(e) => setFormChanges(e.target.value)} /></div>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={handleAddRound} disabled={isPending}>회차 추가</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm */}
      {negotiations.length > 0 && !confirmed && (
        <div className="flex justify-end">
          <Button data-testid="final-price-btn" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "처리 중…" : "최종 협상가 확정"}
          </Button>
        </div>
      )}
    </div>
  );
}
