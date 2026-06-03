import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function sanitizeFileName(name: string): string {
  const ext = name.split(".").pop() ?? "pdf";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}_${rand}.${ext}`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { fileName?: string };

  if (!body.fileName) {
    return NextResponse.json({ error: "fileName이 필요합니다." }, { status: 400 });
  }

  const safeName = sanitizeFileName(body.fileName);
  const path = `${crypto.randomUUID()}/${safeName}`;
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from("rfp-files")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "presigned URL 생성 실패" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    path,
    signedUrl: data.signedUrl,
    token: data.token,
    originalName: body.fileName,
  });
}
