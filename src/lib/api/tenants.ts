import { createClient } from "@/lib/supabase/server";

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

export async function registerTenant(input: {
  tenantName: string;
  pmEmail: string;
  pmName: string;
  authUid: string;
}): Promise<{ tenantId: string; userId: string; error: string | null }> {
  if (!isSupabaseConfigured()) return { tenantId: "", userId: "", error: "Supabase 미설정" };

  const supabase = createClient();

  // 1. Create tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("rfp_tenants")
    .insert({ name: input.tenantName })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    return { tenantId: "", userId: "", error: tenantErr?.message ?? "테넌트 생성 실패" };
  }

  // 2. Create PM user
  const { data: user, error: userErr } = await supabase
    .from("rfp_users")
    .insert({
      auth_uid: input.authUid,
      tenant_id: tenant.id as string,
      email: input.pmEmail,
      name: input.pmName,
      role: "pm",
    })
    .select("id")
    .single();

  if (userErr || !user) {
    return { tenantId: tenant.id as string, userId: "", error: userErr?.message ?? "PM 사용자 생성 실패" };
  }

  return { tenantId: tenant.id as string, userId: user.id as string, error: null };
}

export async function inviteMember(input: {
  tenantId: string;
  email: string;
  name: string;
}): Promise<{ userId: string; error: string | null }> {
  if (!isSupabaseConfigured()) return { userId: "", error: "Supabase 미설정" };

  const supabase = createClient();

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
