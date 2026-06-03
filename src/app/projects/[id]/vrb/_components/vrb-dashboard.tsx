"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeDday, formatKrw } from "@/lib/constants/phase";
import type { VrbReview, VrbDeptReview, ProfitLoss, ProjectPhase } from "@/lib/types/database";
import { submitVrbDecision } from "../_actions";

const DEPT_STATUS: Record<string, { text: string; className: string }> = {
  completed: { text: "완료", className: "bg-green-100 text-green-700 border-green-200" },
  reviewing: { text: "검토중", className: "bg-blue-100 text-blue-700 border-blue-200" },
  rejected: { text: "반려", className: "bg-red-100 text-red-700 border-red-200" },
  pending: { text: "미검토", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

function getDeptStatus(dept: VrbDeptReview): string {
  if (dept.proceed_opinion === "reject") return "rejected";
  if (dept.reviewed_at) return "completed";
  if (dept.risk_level != null) return "reviewing";
  return "pending";
}

interface Props {
  projectId: string;
  vrbReview: VrbReview | null;
  deptReviews: VrbDeptReview[];
  profitLoss: ProfitLoss | null;
  vrbDeadline: string | null;
  projectPhase: ProjectPhase | null;
}

export function VrbDashboard({
  projectId,
  vrbReview,
  deptReviews,
  profitLoss,
  vrbDeadline,
}: Props) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [decided, setDecided] = useState(false);

  const ddayText = computeDday(vrbDeadline);
  const ddayNum = vrbDeadline
    ? Math.ceil((new Date(vrbDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const allCompleted = deptReviews.length > 0 && deptReviews.every((d) => getDeptStatus(d) === "completed");
  const canApprove = allCompleted && vrbReview && !decided;

  // Radar chart data points (risk_level 1-5 per dept)
  const radarData = deptReviews.map((d) => ({
    dept: d.dept_type,
    level: d.risk_level ?? 0,
  }));

  function handleApprove() {
    if (!vrbReview) return;
    startTransition(async () => {
      await submitVrbDecision(projectId, vrbReview.id, true);
      setDecided(true);
    });
  }

  function handleReject() {
    if (!vrbReview || !rejectReason.trim()) return;
    startTransition(async () => {
      await submitVrbDecision(projectId, vrbReview.id, false, rejectReason);
      setDecided(true);
      setShowReject(false);
    });
  }

  return (
    <div className="space-y-6">
      {/* VRB D-day */}
      <div
        data-testid="vrb-dday"
        className={`rounded-lg border p-4 text-center text-lg font-bold ${
          ddayNum != null && ddayNum <= 1
            ? "border-red-300 bg-red-50 text-red-700"
            : ddayNum != null && ddayNum <= 3
              ? "border-orange-300 bg-orange-50 text-orange-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
        }`}
      >
        VRB 마감 {ddayText}
        {vrbDeadline && <span className="ml-2 text-sm font-normal">({vrbDeadline})</span>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dept reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">부서별 검토 현황 ({deptReviews.length}개 부서)</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="vrb-dept-list" className="space-y-3">
              {deptReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">부서 검토 내역이 없습니다.</p>
              ) : (
                deptReviews.map((dept) => {
                  const status = getDeptStatus(dept);
                  const badge = DEPT_STATUS[status] ?? DEPT_STATUS.pending;

                  return (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                      data-testid={`dept-status-${dept.id}`}
                    >
                      <div>
                        <span className="text-sm font-medium">{dept.dept_type}</span>
                        {dept.reviewer && (
                          <span className="ml-2 text-xs text-muted-foreground">{dept.reviewer}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {dept.risk_level != null && (
                          <span className={`text-xs font-medium ${dept.risk_level >= 4 ? "text-red-600" : dept.risk_level >= 3 ? "text-yellow-600" : "text-green-600"}`}>
                            위험도 {dept.risk_level}/5
                          </span>
                        )}
                        <Badge variant="outline" className={badge.className}>
                          {badge.text}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Radar chart (simple SVG visualization) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">리스크 분포</CardTitle>
          </CardHeader>
          <CardContent data-testid="vrb-radar-chart" className="flex items-center justify-center">
            {radarData.length > 0 ? (
              <RadarChart data={radarData} />
            ) : (
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profit summary */}
      <Card data-testid="profit-summary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>손익 요약</span>
            <Link
              href={`/projects/${projectId}/vrb/profit`}
              className="text-sm font-normal text-blue-600 hover:underline"
            >
              상세 보기 →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitLoss ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">제안가</p>
                <p className="text-sm font-medium">{formatKrw(profitLoss.proposal_price)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 원가</p>
                <p className="text-sm font-medium">{formatKrw(profitLoss.total_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">이익률</p>
                <p className="text-sm font-medium">
                  {profitLoss.pjt_profit_rate != null ? `${(profitLoss.pjt_profit_rate * 100).toFixed(1)}%` : "-"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">손익 데이터가 없습니다.</p>
          )}
          <p className="mt-2 text-xs text-blue-600">
            트랙A 협력업체 등록 시 외주비/물품비가 자동 반영됩니다.
          </p>
        </CardContent>
      </Card>

      {/* Approve / Reject */}
      {!decided && (
        <div className="flex gap-3">
          <Button
            data-testid="vrb-approve-btn"
            onClick={handleApprove}
            disabled={!canApprove || isPending}
          >
            {isPending ? "처리 중…" : "VRB 승인"}
          </Button>
          <Button
            data-testid="vrb-reject-btn"
            variant="destructive"
            onClick={() => setShowReject(true)}
            disabled={!vrbReview || isPending}
          >
            반려
          </Button>
        </div>
      )}

      {showReject && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Input
              data-testid="vrb-reject-reason"
              placeholder="반려 사유를 입력하세요 (필수)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || isPending}
              >
                반려 확정
              </Button>
              <Button variant="outline" onClick={() => setShowReject(false)}>취소</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Simple SVG radar chart ── */
function RadarChart({ data }: { data: { dept: string; level: number }[] }) {
  const n = data.length;
  if (n < 3) return <p className="text-sm text-muted-foreground">3개 이상 부서 필요</p>;

  const cx = 100, cy = 100, r = 80;
  const angleStep = (2 * Math.PI) / n;

  const points = data.map((d, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const ratio = (d.level ?? 0) / 5;
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
      lx: cx + (r + 15) * Math.cos(angle),
      ly: cy + (r + 15) * Math.sin(angle),
      label: d.dept,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid circles
  const gridCircles = [1, 2, 3, 4, 5].map((level) => (
    <circle
      key={level}
      cx={cx}
      cy={cy}
      r={(r * level) / 5}
      fill="none"
      stroke="hsl(var(--border))"
      strokeWidth={0.5}
    />
  ));

  return (
    <svg viewBox="0 0 200 200" className="h-48 w-48">
      {gridCircles}
      <polygon
        points={polygon}
        fill="hsl(220 90% 56% / 0.2)"
        stroke="hsl(220 90% 56%)"
        strokeWidth={2}
      />
      {points.map((p, i) => (
        <text
          key={i}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          fontSize={8}
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
