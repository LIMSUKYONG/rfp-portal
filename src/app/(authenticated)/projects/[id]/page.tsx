export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PHASE_STYLE,
  PHASE_LABEL,
  computeDday,
  formatKrw,
} from "@/lib/constants/phase";
import { fetchProjectDetail } from "@/lib/api/projects";
import type { ProjectDetail } from "@/lib/api/projects";

/* ── small presentation helpers ── */
function PctBar({ label, value, testId }: { label: string; value: number | null; testId: string }) {
  const pct = value ?? 0;
  return (
    <div data-testid={testId}>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between border-b border-dashed py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "-"}</span>
    </div>
  );
}

const RISK_STYLE: Record<string, string> = {
  danger: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

const CHECK_STYLE: Record<string, { text: string; className: string }> = {
  pass: { text: "적합", className: "bg-green-100 text-green-700 border-green-200" },
  fail: { text: "부적합", className: "bg-red-100 text-red-700 border-red-200" },
  pending: { text: "미확인", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const DOC_STATUS: Record<string, { text: string; className: string }> = {
  valid: { text: "유효", className: "bg-green-100 text-green-700 border-green-200" },
  invalid: { text: "무효", className: "bg-red-100 text-red-700 border-red-200" },
  needs_review: { text: "검토 필요", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  pending: { text: "대기", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const PARTNER_TYPE_LABEL: Record<string, string> = {
  subcontract: "하도급",
  goods_supply: "물품",
  consortium: "컨소시엄",
};

/* ── page ── */
interface Props {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: Props) {
  const detail = await fetchProjectDetail(params.id);
  if (!detail) notFound();

  const {
    project,
    completion,
    latestVrb,
    profitLoss: pl,
    risks,
    qualifications: quals,
    documents: docs,
    partners,
  } = detail;

  const dday = computeDday(project.bid_deadline);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" data-testid="project-detail">
      {/* ── Header ── */}
      <div className="mb-6" data-testid="project-header">
        <Link
          href="/projects"
          className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
          data-testid="back-link"
        >
          &larr; 프로젝트 목록
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold" data-testid="project-name">
            {project.name}
          </h1>
          <span className="text-sm text-muted-foreground" data-testid="project-code">
            {project.code}
          </span>
          <Badge
            variant="outline"
            className={PHASE_STYLE[project.phase] ?? ""}
            data-testid="project-phase"
          >
            {PHASE_LABEL[project.phase] ?? project.phase}
          </Badge>
          <span
            className={
              dday === "D-Day"
                ? "text-sm font-semibold text-red-600"
                : dday.startsWith("D+")
                  ? "text-sm text-red-500"
                  : "text-sm text-muted-foreground"
            }
            data-testid="project-dday"
          >
            {dday}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── 기본 정보 ── */}
        <Card data-testid="card-info">
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="발주처" value={project.client} />
            <InfoRow label="사업 유형" value={project.project_type} />
            <InfoRow label="분류" value={project.category} />
            <InfoRow label="사업 예산" value={project.budget_amount != null ? formatKrw(project.budget_amount) : null} />
            <InfoRow label="계약 방식" value={project.contract_method} />
            <InfoRow label="입찰 마감" value={project.bid_deadline} />
            <InfoRow label="공고일" value={project.announcement_date} />
            <InfoRow label="사업 기간" value={project.project_period} />
            <InfoRow label="하자보수 기간" value={project.warranty_period} />
            <InfoRow label="영업 담당" value={project.sales_rep} />
            <InfoRow label="PM" value={project.pm} />
          </CardContent>
        </Card>

        {/* ── 트랙A 진행 현황 ── */}
        <Card data-testid="card-track-a">
          <CardHeader>
            <CardTitle className="text-base">트랙A 진행 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PctBar label="적격 심사" value={completion?.qualification_pct ?? null} testId="pct-qualification" />
            <PctBar label="서류 검증" value={completion?.document_pct ?? null} testId="pct-document" />
            <PctBar label="협력사 관리" value={completion?.partner_pct ?? null} testId="pct-partner" />
            <PctBar label="대비표 검토" value={completion?.ref_table_pct ?? null} testId="pct-ref-table" />
          </CardContent>
        </Card>

        {/* ── VRB 심의 현황 ── */}
        <Card data-testid="card-vrb">
          <CardHeader>
            <CardTitle className="text-base">VRB 심의 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {latestVrb ? (
              <div className="space-y-0">
                <InfoRow label="회차" value={`${latestVrb.vrb_round}차`} />
                <InfoRow label="유형" value={latestVrb.vrb_type} />
                <InfoRow label="심의 마감" value={latestVrb.vrb_deadline} />
                <InfoRow label="회의일" value={latestVrb.meeting_date} />
                <InfoRow
                  label="진행 여부"
                  value={
                    latestVrb.vrb_proceed === true
                      ? "승인"
                      : latestVrb.vrb_proceed === false
                        ? "반려"
                        : "대기"
                  }
                />
                <InfoRow label="리스크 등급" value={latestVrb.risk_grade} />
                <InfoRow
                  label="리스크 평균"
                  value={latestVrb.risk_level_avg != null ? `${latestVrb.risk_level_avg}` : null}
                />
                {latestVrb.meeting_result && (
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">심의 결과</p>
                    <p className="mt-1 text-sm">{latestVrb.meeting_result}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">VRB 심의 내역이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* ── 손익 현황 ── */}
        <Card data-testid="card-pl">
          <CardHeader>
            <CardTitle className="text-base">손익 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {pl ? (
              <div className="space-y-0">
                <InfoRow label="제안가" value={formatKrw(pl.proposal_price)} />
                <InfoRow label="예상 수주가" value={formatKrw(pl.expected_price)} />
                <InfoRow label="총 원가" value={formatKrw(pl.total_cost)} />
                <InfoRow label="프로젝트 이익" value={formatKrw(pl.pjt_profit)} />
                <InfoRow
                  label="이익률"
                  value={pl.pjt_profit_rate != null ? `${(pl.pjt_profit_rate * 100).toFixed(1)}%` : null}
                />
                <div className="mt-2 border-t pt-2">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">원가 내역</p>
                  <InfoRow label="라이선스" value={formatKrw(pl.license_cost)} />
                  <InfoRow label="자체 인건비" value={formatKrw(pl.inhouse_labor_cost)} />
                  <InfoRow label="외주비" value={formatKrw(pl.outsource_cost)} />
                  <InfoRow label="물품비" value={formatKrw(pl.goods_cost)} />
                  <InfoRow label="직접경비" value={formatKrw(pl.direct_expense)} />
                  <InfoRow label="예비비" value={formatKrw(pl.contingency)} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">손익 데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 적격 심사 ── */}
      <Card className="mt-6" data-testid="card-qualification">
        <CardHeader>
          <CardTitle className="text-base">적격 심사 ({quals.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {quals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>항목</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>조건</TableHead>
                  <TableHead>결과</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quals.map((q) => {
                  const status = CHECK_STYLE[q.check_result ?? "pending"] ?? CHECK_STYLE.pending;
                  return (
                    <TableRow key={q.id} data-testid={`qual-row-${q.id}`}>
                      <TableCell className="font-medium">{q.item_name}</TableCell>
                      <TableCell>{q.item_type ?? "-"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{q.condition_text ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>{status.text}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{q.check_note ?? "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">적격 심사 항목이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* ── 서류 현황 ── */}
      <Card className="mt-6" data-testid="card-documents">
        <CardHeader>
          <CardTitle className="text-base">서류 현황 ({docs.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>서류명</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead>필수</TableHead>
                  <TableHead>검증 상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => {
                  const status = DOC_STATUS[d.validation_status ?? "pending"] ?? DOC_STATUS.pending;
                  return (
                    <TableRow key={d.id} data-testid={`doc-row-${d.id}`}>
                      <TableCell className="font-medium">{d.doc_name}</TableCell>
                      <TableCell>{d.doc_category ?? "-"}</TableCell>
                      <TableCell>{d.is_required ? "필수" : "선택"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>{status.text}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">등록된 서류가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* ── 협력사 현황 ── */}
      <Card className="mt-6" data-testid="card-partners">
        <CardHeader>
          <CardTitle className="text-base">협력사 현황 ({partners.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {partners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업체명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>업무 범위</TableHead>
                  <TableHead>하도급액</TableHead>
                  <TableHead>비율</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((pt) => (
                  <TableRow key={pt.id} data-testid={`partner-row-${pt.id}`}>
                    <TableCell className="font-medium">{pt.company_name}</TableCell>
                    <TableCell>{PARTNER_TYPE_LABEL[pt.partner_type] ?? pt.partner_type}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{pt.work_scope ?? "-"}</TableCell>
                    <TableCell>{formatKrw(pt.sub_amount)}</TableCell>
                    <TableCell>{pt.sub_rate != null ? `${pt.sub_rate}%` : "-"}</TableCell>
                    <TableCell>{pt.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">등록된 협력사가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* ── 리스크 현황 ── */}
      <Card className="mt-6" data-testid="card-risks">
        <CardHeader>
          <CardTitle className="text-base">미해결 리스크 ({risks.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {risks.length > 0 ? (
            <div className="space-y-3">
              {risks.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                  data-testid={`risk-row-${r.id}`}
                >
                  <Badge
                    variant="outline"
                    className={RISK_STYLE[r.risk_level ?? "info"] ?? RISK_STYLE.info}
                  >
                    {r.risk_level ?? "info"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.risk_title ?? "리스크"}</p>
                    {r.risk_message && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{r.risk_message}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.risk_type ?? ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">미해결 리스크가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
