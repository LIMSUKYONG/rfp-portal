import { NextResponse, type NextRequest } from "next/server";
import { fetchQualifications } from "@/lib/api/qualification";

/**
 * GET /api/qualification-checks?projectId=xxx — 적격심사 항목 목록.
 * 빈 결과/에러에도 항상 배열을 반환해 클라이언트 JSON 파싱이 깨지지 않게 한다.
 */
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json([], { status: 400 });
    }
    const data = await fetchQualifications(projectId);
    return NextResponse.json(data.items ?? []);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
