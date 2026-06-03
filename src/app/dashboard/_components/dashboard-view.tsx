"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PHASE_STYLE, PHASE_LABEL, computeDday } from "@/lib/constants/phase";
import type { DashboardKpi, UrgentItem, ProjectCard } from "@/lib/api/dashboard";
import type { RiskLog } from "@/lib/types/database";
import { markRiskResolved } from "../_actions";

type FilterType = "all" | "in_progress" | "deadline" | "risk";

const RISK_STYLE: Record<string, string> = {
  danger: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

interface Props {
  kpi: DashboardKpi;
  urgentItems: UrgentItem[];
  projectCards: ProjectCard[];
  risks: RiskLog[];
}

export function DashboardView({ kpi: initialKpi, urgentItems, projectCards, risks: initialRisks }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [risks, setRisks] = useState(initialRisks);
  const [kpi, setKpi] = useState(initialKpi);
  const [clock, setClock] = useState("");
  const [isPending, startTransition] = useTransition();

  // Real-time clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;

  const filtered = projectCards.filter((p) => {
    if (filter === "all") return true;
    if (filter === "in_progress") return ["in_progress", "qualification_check", "track_a_done", "vrb_approved"].includes(p.phase);
    if (filter === "deadline") {
      if (!p.bid_deadline) return false;
      return Math.ceil((new Date(p.bid_deadline).getTime() - now) / msPerDay) <= 7;
    }
    if (filter === "risk") return p.danger_count > 0 || p.warning_count > 0;
    return true;
  });

  function handleResolve(riskId: string) {
    startTransition(async () => {
      await markRiskResolved(riskId);
      setRisks((prev) => prev.filter((r) => r.id !== riskId));
      setKpi((prev) => ({ ...prev, unresolvedRiskCount: prev.unresolvedRiskCount - 1 }));
    });
  }

  const trackAPct = (p: ProjectCard) => {
    const vals = [p.qualification_pct, p.document_pct, p.partner_pct, p.ref_table_pct].filter((v) => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Clock */}
      <div className="text-right text-sm text-muted-foreground">{clock}</div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-5">
        <KpiCard testId="kpi-total" label="전체 프로젝트" value={kpi.totalProjects} />
        <KpiCard testId="kpi-in-progress" label="진행중" value={kpi.inProgressCount} color="text-blue-600" />
        <KpiCard testId="kpi-deadline" label="이번주 마감" value={kpi.deadlineThisWeek} color="text-orange-600" />
        <KpiCard testId="kpi-risk-count" label="미해결 리스크" value={kpi.unresolvedRiskCount} color="text-red-600" />
        <KpiCard testId="kpi-gate-count" label="게이트 대기" value={kpi.gateWaitingCount} color="text-purple-600" />
      </div>

      {/* Urgent banner */}
      {urgentItems.length > 0 && (
        <div data-testid="urgent-banner" className="space-y-2">
          {urgentItems.map((item, i) => (
            <Link
              key={`${item.id}-${item.type}-${i}`}
              href={`/projects/${item.id}`}
              className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors hover:bg-red-100"
            >
              <span>
                <strong>{item.type === "bid_deadline" ? "입찰마감" : "VRB마감"}</strong>{" "}
                {item.name}
              </span>
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                D-{item.daysLeft === 0 ? "Day" : item.daysLeft}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2">
        {(["all", "in_progress", "deadline", "risk"] as FilterType[]).map((type) => {
          const labels: Record<FilterType, string> = { all: "전체", in_progress: "진행중", deadline: "마감임박", risk: "리스크" };
          return (
            <button
              key={type}
              data-testid={`filter-chip-${type}`}
              onClick={() => setFilter(type)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filter === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {labels[type]}
            </button>
          );
        })}
      </div>

      {/* Project cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full text-center text-sm text-muted-foreground py-8">프로젝트가 없습니다.</p>
        ) : (
          filtered.map((p) => {
            const tA = trackAPct(p);
            const dday = computeDday(p.bid_deadline);

            return (
              <Link key={p.id} href={`/projects/${p.id}`} data-testid={`project-card-${p.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{p.name}</CardTitle>
                      <Badge variant="outline" className={PHASE_STYLE[p.phase] ?? ""}>
                        {PHASE_LABEL[p.phase] ?? p.phase}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.client}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>트랙A</span><span>{tA}%</span>
                      </div>
                      <Progress value={tA} className="h-1.5" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={dday.startsWith("D+") ? "text-red-500" : "text-muted-foreground"}>{dday}</span>
                      <div className="flex gap-1">
                        {p.danger_count > 0 && <Badge variant="outline" className="bg-red-100 text-red-600 border-red-200 text-[10px]">{p.danger_count}</Badge>}
                        {p.warning_count > 0 && <Badge variant="outline" className="bg-yellow-100 text-yellow-600 border-yellow-200 text-[10px]">{p.warning_count}</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Risk table */}
      {risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">미해결 리스크 ({risks.length}건)</CardTitle>
          </CardHeader>
          <CardContent data-testid="risk-table">
            <div className="space-y-2">
              {risks.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3" data-testid={`risk-row-${r.id}`}>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={RISK_STYLE[r.risk_level ?? "info"] ?? RISK_STYLE.info}>
                      {r.risk_level ?? "info"}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{r.risk_title ?? "리스크"}</p>
                      {r.risk_message && <p className="text-xs text-muted-foreground">{r.risk_message}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`resolve-btn-${r.id}`}
                    onClick={() => handleResolve(r.id)}
                    disabled={isPending}
                  >
                    해결
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ testId, label, value, color }: { testId: string; label: string; value: number; color?: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="py-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${color ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
