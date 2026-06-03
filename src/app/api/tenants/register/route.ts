import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    tenantName?: string;
    pmEmail?: string;
    pmName?: string;
    password?: string;
  };

  if (!body.tenantName || !body.pmEmail || !body.pmName || !body.password) {
    return NextResponse.json(
      { error: "tenantName, pmEmail, pmName, password가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // 1. Auth 계정 생성 (admin API — 즉시 확정, email_confirm 생략)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: body.pmEmail,
    password: body.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Auth 계정 생성 실패" },
      { status: 500 },
    );
  }

  const authUid = authData.user.id;

  // 2. rfp_tenants INSERT
  const { data: tenant, error: tenantErr } = await supabase
    .from("rfp_tenants")
    .insert({ name: body.tenantName })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json(
      { error: tenantErr?.message ?? "테넌트 생성 실패" },
      { status: 500 },
    );
  }

  // 3. rfp_users INSERT (첫 번째 사용자 = superadmin)
  const { count } = await supabase
    .from("rfp_users")
    .select("id", { count: "exact", head: true });
  const role = (count ?? 0) === 0 ? "superadmin" : "pm";

  const { data: user, error: userErr } = await supabase
    .from("rfp_users")
    .insert({
      auth_uid: authUid,
      tenant_id: tenant.id as string,
      email: body.pmEmail,
      name: body.pmName,
      role,
    })
    .select("id")
    .single();

  if (userErr || !user) {
    return NextResponse.json(
      { error: userErr?.message ?? "사용자 생성 실패" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    tenantId: tenant.id,
    userId: user.id,
  });
}
