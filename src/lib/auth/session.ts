/**
 * 인증 세션 ↔ tenant_id 연결 공통 모듈.
 *
 * 저장/조회 모든 경로에서 tenant_id 가 필요할 때는 반드시 이 파일의
 * getCurrentTenantId() / getCurrentUser() 만 사용한다.
 * (Default tenant 하드코딩 금지 — 일관성의 단일 출처)
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CurrentUser {
  id: string;
  auth_uid: string | null;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  /** 소속 회사명 (rfp_tenants.name) */
  tenant_name: string | null;
}

/**
 * 현재 로그인 사용자의 tenant_id.
 * 비로그인이거나 rfp_users 매핑이 없으면 null.
 */
export async function getCurrentTenantId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: rfpUser } = await admin
      .from("rfp_users")
      .select("tenant_id")
      .eq("auth_uid", user.id)
      .single();

    return (rfpUser?.tenant_id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * 현재 로그인 사용자 전체 정보 (+ 소속 회사명).
 * 비로그인이거나 매핑이 없으면 null.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: rfpUser } = await admin
      .from("rfp_users")
      .select("*, tenant:rfp_tenants(name)")
      .eq("auth_uid", user.id)
      .single();

    if (!rfpUser) return null;

    const { tenant, ...rest } = rfpUser as Record<string, unknown> & {
      tenant?: { name: string } | null;
    };

    return {
      ...(rest as Omit<CurrentUser, "tenant_name">),
      tenant_name: tenant?.name ?? null,
    };
  } catch {
    return null;
  }
}
