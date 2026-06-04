import { NextResponse, type NextRequest } from "next/server";
import { fetchDocuments } from "@/lib/api/documents";

/** GET /api/documents?projectId=xxx — 계층형(서식→증빙) 서류 목록 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
  }

  const data = await fetchDocuments(projectId);
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }

  return NextResponse.json(data);
}
