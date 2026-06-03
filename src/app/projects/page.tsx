import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PhaseFilter } from "./_components/phase-filter";
import { PHASE_STYLE, PHASE_LABEL, computeDday } from "@/lib/constants/phase";
import type {
  Project,
  ProjectCompletion,
  VrbReview,
} from "@/lib/types/database";

const VRB_LABEL: Record<string, { text: string; className: string }> = {
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

function trackAPercent(completion: ProjectCompletion | undefined): number {
  if (!completion) return 0;
  const vals = [
    completion.qualification_pct,
    completion.document_pct,
    completion.partner_pct,
    completion.ref_table_pct,
  ].filter((v): v is number => v !== null);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function vrbStatus(
  review: VrbReview | undefined,
): keyof typeof VRB_LABEL {
  if (!review) return "none";
  if (review.vrb_proceed === true) return "approved";
  if (review.vrb_proceed === false) return "rejected";
  return "pending";
}

/* ── page ── */
interface Props {
  searchParams: { phase?: string };
}

export default async function ProjectsPage({ searchParams }: Props) {
  const supabase = createClient();

  // 1. Fetch projects
  let projectQuery = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (searchParams.phase) {
    projectQuery = projectQuery.eq("phase", searchParams.phase);
  }

  const { data: projects, error: projectsError } = await projectQuery;

  // 2. Fetch completion view & latest VRB reviews
  const [completionRes, vrbRes] = await Promise.all([
    supabase.from("project_completion").select("*"),
    supabase
      .from("vrb_reviews")
      .select("*")
      .order("vrb_round", { ascending: false }),
  ]);

  const completionMap = new Map(
    ((completionRes.data ?? []) as ProjectCompletion[]).map((c) => [c.id, c]),
  );
  // Keep only latest VRB review per project
  const vrbMap = new Map<string, VrbReview>();
  for (const v of (vrbRes.data ?? []) as VrbReview[]) {
    if (!vrbMap.has(v.project_id)) vrbMap.set(v.project_id, v);
  }

  const rows = (projects ?? []) as Project[];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">프로젝트 목록</h1>
        <PhaseFilter />
      </div>

      {projectsError && (
        <p className="text-destructive">
          데이터를 불러오지 못했습니다: {projectsError.message}
        </p>
      )}

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
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  프로젝트가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const pct = trackAPercent(completionMap.get(p.id));
                const vrb = vrbStatus(vrbMap.get(p.id));
                const vrbInfo = VRB_LABEL[vrb];
                const dday = computeDday(p.bid_deadline);

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
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`vrb-status-${p.id}`}>
                      <Badge
                        variant="outline"
                        className={vrbInfo.className}
                      >
                        {vrbInfo.text}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`dday-${p.id}`}>
                      <span
                        className={
                          dday === "D-Day"
                            ? "font-semibold text-red-600"
                            : dday.startsWith("D+")
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }
                      >
                        {dday}
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
    </main>
  );
}
