"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BidResult } from "@/lib/types/database";
import { submitResult } from "../_actions";

const RESULT_TYPES = [
  { value: "selected", label: "선정" },
  { value: "lost", label: "미선정" },
  { value: "re_announce", label: "재공고" },
];

interface Props {
  projectId: string;
  bidResult: BidResult | null;
  predictedTechScore: number | null;
  submittedPrice: number | null;
}

export function ResultForm({ projectId, bidResult, predictedTechScore, submittedPrice }: Props) {
  const [resultType, setResultType] = useState(bidResult?.result_type ?? "");
  const [techScore, setTechScore] = useState(bidResult?.actual_tech_score?.toString() ?? "");
  const [priceScore, setPriceScore] = useState(bidResult?.actual_price_score?.toString() ?? "");
  const [totalScore, setTotalScore] = useState(bidResult?.actual_total_score?.toString() ?? "");
  const [rank, setRank] = useState(bidResult?.rank?.toString() ?? "");
  const [lossReason, setLossReason] = useState(bidResult?.loss_reason ?? "");
  const [lossNote, setLossNote] = useState(bidResult?.loss_note ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const isLost = resultType === "lost";
  const actualTech = Number(techScore) || 0;
  const scoreDiff = predictedTechScore != null ? actualTech - predictedTechScore : null;

  function handleSave() {
    if (!resultType) return;
    if (isLost && !lossReason.trim()) return;

    startTransition(async () => {
      await submitResult(projectId, {
        result_type: resultType,
        actual_tech_score: Number(techScore) || undefined,
        actual_price_score: Number(priceScore) || undefined,
        actual_total_score: Number(totalScore) || undefined,
        rank: Number(rank) || undefined,
        loss_reason: isLost ? lossReason : undefined,
        loss_note: isLost ? lossNote : undefined,
        submitted_price: submittedPrice ?? undefined,
        predicted_tech_score: predictedTechScore ?? undefined,
        score_diff: scoreDiff ?? undefined,
      });
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* Result type */}
      <Card>
        <CardHeader><CardTitle className="text-base">결과 유형</CardTitle></CardHeader>
        <CardContent>
          <Select value={resultType} onValueChange={setResultType} data-testid="result-type">
            <SelectTrigger data-testid="result-type" className="w-[200px]">
              <SelectValue placeholder="결과 선택" />
            </SelectTrigger>
            <SelectContent>
              {RESULT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Score inputs */}
      <Card>
        <CardHeader><CardTitle className="text-base">실제 점수 입력</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2" data-testid="score-actual">
          <div><Label>기술점수 (정성)</Label><Input type="number" value={techScore} onChange={(e) => setTechScore(e.target.value)} /></div>
          <div><Label>가격점수</Label><Input type="number" value={priceScore} onChange={(e) => setPriceScore(e.target.value)} /></div>
          <div><Label>합산 점수</Label><Input type="number" value={totalScore} onChange={(e) => setTotalScore(e.target.value)} /></div>
          <div><Label>순위</Label><Input type="number" value={rank} onChange={(e) => setRank(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Score comparison */}
      {predictedTechScore != null && techScore && (
        <Card data-testid="score-compare">
          <CardHeader><CardTitle className="text-base">예상 vs 실제 비교</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">AI 예상</p>
              <p className="text-lg font-bold">{predictedTechScore?.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">실제</p>
              <p className="text-lg font-bold">{Number(techScore).toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">차이</p>
              <p className={`text-lg font-bold ${(scoreDiff ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {scoreDiff != null ? `${scoreDiff >= 0 ? "+" : ""}${scoreDiff.toFixed(1)}` : "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loss reason */}
      {isLost && (
        <Card data-testid="fail-reason">
          <CardHeader><CardTitle className="text-base">탈락 사유</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>탈락 사유 (필수)</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger><SelectValue placeholder="사유 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">가격 경쟁력 부족</SelectItem>
                  <SelectItem value="tech_score">기술점수 부족</SelectItem>
                  <SelectItem value="qualification">자격요건 미충족</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>상세 사유</Label>
              <Input value={lossNote} onChange={(e) => setLossNote(e.target.value)} placeholder="상세 사유 입력" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button data-testid="result-save-btn" onClick={handleSave} disabled={!resultType || isPending || saved || (isLost && !lossReason.trim())}>
          {isPending ? "저장 중…" : saved ? "저장 완료" : "결과 저장"}
        </Button>
      </div>
    </div>
  );
}
