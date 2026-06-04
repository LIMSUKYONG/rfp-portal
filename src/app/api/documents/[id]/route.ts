import { NextResponse, type NextRequest } from "next/server";
import { updateDocumentFile } from "@/lib/api/documents";
import { VALIDATION_STATUS_CONFIG } from "@/lib/constants/checklist";
import type { DocValidationStatus } from "@/lib/types/database";

const VALID_STATUSES = Object.keys(VALIDATION_STATUS_CONFIG);

/** PATCH /api/documents/[id] — file_url / validation_status 부분 업데이트 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await request.json().catch(() => ({}))) as {
    file_url?: unknown;
    file_size_mb?: unknown;
    validation_status?: unknown;
  };

  const hasFileUrl = typeof body.file_url === "string" && body.file_url.length > 0;
  const hasStatus =
    typeof body.validation_status === "string" &&
    VALID_STATUSES.includes(body.validation_status);

  if (!hasFileUrl && !hasStatus) {
    return NextResponse.json(
      { error: "file_url 또는 validation_status가 필요합니다." },
      { status: 400 },
    );
  }

  const { error } = await updateDocumentFile(params.id, {
    ...(hasFileUrl ? { file_url: body.file_url as string } : {}),
    ...(typeof body.file_size_mb === "number" ? { file_size_mb: body.file_size_mb } : {}),
    ...(hasStatus ? { validation_status: body.validation_status as DocValidationStatus } : {}),
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    id: params.id,
    ...(hasFileUrl ? { file_url: body.file_url } : {}),
    ...(hasStatus ? { validation_status: body.validation_status } : {}),
  });
}
