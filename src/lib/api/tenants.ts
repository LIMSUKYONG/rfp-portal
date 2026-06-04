import { createAdminClient } from "@/lib/supabase/admin";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export interface Tenant {
  id: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
}

export interface AppUser {
  id: string;
  auth_uid: string | null;
  tenant_id: string;
  email: string;
  name: string;
  role: "pm" | "member";
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "owner" | "contributor" | "viewer";
  tenant_id: string;
  created_at: string;
}

/**
 * 가장 먼저 생성된 tenant id (개발/테스트 폴백용).
 * 로그인 세션이 없는 환경에서 화면을 확인할 때만 사용한다.
 */
export async function getFirstTenantId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("rfp_tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function registerTenant(input: {
  tenantName: string;
  pmEmail: string;
  pmName: string;
  authUid: string;
}): Promise<{ tenantId: string; userId: string; error: string | null }> {
  if (!isSupabaseConfigured()) return { tenantId: "", userId: "", error: "Supabase 미설정" };

  const supabase = createAdminClient();

  const { data: tenant, error: tenantErr } = await supabase
    .from("rfp_tenants")
    .insert({ name: input.tenantName })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    return { tenantId: "", userId: "", error: tenantErr?.message ?? "테넌트 생성 실패" };
  }

  // First user in the system gets superadmin, otherwise pm
  const { count } = await supabase
    .from("rfp_users")
    .select("id", { count: "exact", head: true });
  const role = (count ?? 0) === 0 ? "superadmin" : "pm";

  const { data: user, error: userErr } = await supabase
    .from("rfp_users")
    .insert({
      auth_uid: input.authUid,
      tenant_id: tenant.id as string,
      email: input.pmEmail,
      name: input.pmName,
      role,
    })
    .select("id")
    .single();

  if (userErr || !user) {
    return { tenantId: tenant.id as string, userId: "", error: userErr?.message ?? "PM 생성 실패" };
  }

  return { tenantId: tenant.id as string, userId: user.id as string, error: null };
}

export async function inviteMember(input: {
  tenantId: string;
  email: string;
  name: string;
}): Promise<{ userId: string; error: string | null }> {
  if (!isSupabaseConfigured()) return { userId: "", error: "Supabase 미설정" };

  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from("rfp_users")
    .insert({
      tenant_id: input.tenantId,
      email: input.email,
      name: input.name,
      role: "member",
    })
    .select("id")
    .single();

  if (error || !user) {
    return { userId: "", error: error?.message ?? "멤버 초대 실패" };
  }

  return { userId: user.id as string, error: null };
}

export async function fetchTeamMembers(
  tenantId: string,
): Promise<{ members: AppUser[]; error: string | null }> {
  if (!isSupabaseConfigured()) return { members: [], error: "Supabase 미설정" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rfp_users")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  return {
    members: (data ?? []) as AppUser[],
    error: error?.message ?? null,
  };
}
