import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PHASE_STYLE, PHASE_LABEL, computeDday } from "@/lib/constants/phase";
import type { ProjectListRow, VrbStatusKey } from "@/lib/api/projects";

const VRB_LABEL: Record<VrbStatusKey, { text: string; className: string }> = {
  approved: {
    text: "승인",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  rejected: {
    text: "반려",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  pending: {
    text: "대기",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  none: {
    text: "미요청",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

export interface ProjectTableProps {
  rows: ProjectListRow[];
}

export function ProjectTable({ rows }: ProjectTableProps) {
  return (
    <div className="rounded-lg border">
      <Table data-testid="project-table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">프로젝트명</TableHead>
            <TableHead>발주처</TableHead>
            <TableHead className="w-[160px]">트랙A 진행률</TableHead>
            <TableHead>VRB 상태</TableHead>
            <TableHead>D-day</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                프로젝트가 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ project: p, trackAPct, vrbStatus, dday }) => {
              const vrbInfo = VRB_LABEL[vrbStatus];
              const ddayText = computeDday(p.bid_deadline);

              return (
                <TableRow
                  key={p.id}
                  data-testid={`project-row-${p.id}`}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{p.client}</TableCell>
                  <TableCell data-testid={`track-a-pct-${p.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${trackAPct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-muted-foreground">
                        {trackAPct}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`vrb-status-${p.id}`}>
                    <Badge variant="outline" className={vrbInfo.className}>
                      {vrbInfo.text}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`dday-${p.id}`}>
                    <span
                      className={
                        ddayText === "D-Day"
                          ? "font-semibold text-red-600"
                          : ddayText.startsWith("D+")
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }
                    >
                      {ddayText}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PHASE_STYLE[p.phase] ?? ""}
                    >
                      {PHASE_LABEL[p.phase] ?? p.phase}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
