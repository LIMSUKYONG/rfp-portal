import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRefTableExport } from "@/lib/api/reference-table";
import type { ReferenceTableItem } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    projectId?: string;
    projectName?: string;
  };

  if (!body.projectId) {
    return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
  }

  const supabase = createClient();

  // Fetch items
  const { data, error } = await supabase
    .from("rfp_reference_table_items")
    .select("*")
    .eq("project_id", body.projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []) as ReferenceTableItem[];
  const reviewedCount = items.filter((i) => i.reviewed).length;

  // Build CSV (tab-separated for Excel compatibility)
  const header = "요구사항ID\t요구사항명\t카테고리\t구현방식\t표시\t제안서페이지\t설명\tAI매핑\t검토완료";
  const rows = items.map((i) =>
    [
      i.requirement_id ?? "",
      i.requirement_name,
      i.requirement_category ?? "",
      i.impl_type ?? "",
      i.impl_type_display ?? "",
      i.proposal_page ?? "",
      i.description ?? "",
      i.ai_mapped ? "Y" : "N",
      i.reviewed ? "Y" : "N",
    ].join("\t"),
  );

  const tsvContent = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + tsvContent], { type: "text/tab-separated-values;charset=utf-8" });

  // Store export record
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${body.projectName ?? "project"}_참조표_${date}.xlsx`;

  await createRefTableExport(
    body.projectId,
    fileName,
    items.length,
    reviewedCount,
  );

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "text/tab-separated-values;charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
