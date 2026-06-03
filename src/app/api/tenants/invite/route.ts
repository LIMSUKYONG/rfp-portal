import { NextResponse, type NextRequest } from "next/server";
import { inviteMember } from "@/lib/api/tenants";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    tenantId?: string;
    email?: string;
    name?: string;
  };

  if (!body.tenantId || !body.email || !body.name) {
    return NextResponse.json(
      { error: "tenantId, email, name이 필요합니다." },
      { status: 400 },
    );
  }

  const result = await inviteMember({
    tenantId: body.tenantId,
    email: body.email,
    name: body.name,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ userId: result.userId });
}
