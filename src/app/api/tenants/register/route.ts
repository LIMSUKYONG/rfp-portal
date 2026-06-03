import { NextResponse, type NextRequest } from "next/server";
import { registerTenant } from "@/lib/api/tenants";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    tenantName?: string;
    pmEmail?: string;
    pmName?: string;
    authUid?: string;
  };

  if (!body.tenantName || !body.pmEmail || !body.pmName || !body.authUid) {
    return NextResponse.json(
      { error: "tenantName, pmEmail, pmName, authUid가 필요합니다." },
      { status: 400 },
    );
  }

  const result = await registerTenant({
    tenantName: body.tenantName,
    pmEmail: body.pmEmail,
    pmName: body.pmName,
    authUid: body.authUid,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    tenantId: result.tenantId,
    userId: result.userId,
  });
}
