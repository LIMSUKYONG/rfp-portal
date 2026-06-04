import Link from "next/link";
import { fetchTeamMembers, getFirstTenantId } from "@/lib/api/tenants";
import { getCurrentTenantId } from "@/lib/auth/session";
import { InviteForm } from "./_components/invite-form";

export default async function InvitePage() {
  // 로그인 세션의 tenant 우선. 세션이 없을 때는 개발/테스트 환경에 한해
  // 첫 tenant로 폴백한다(프로덕션은 폼을 숨겨 인증을 강제).
  let tenantId = await getCurrentTenantId();
  if (!tenantId && process.env.NODE_ENV !== "production") {
    tenantId = await getFirstTenantId();
  }

  const { members, error } = tenantId
    ? await fetchTeamMembers(tenantId)
    : { members: [], error: "로그인 정보가 없습니다. 다시 로그인해주세요." };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8" data-testid="invite-page">
      <div className="mb-6">
        <Link href="/dashboard" className="mb-2 inline-block text-sm text-muted-foreground hover:underline">
          &larr; 대시보드
        </Link>
        <h1 className="text-2xl font-bold">팀원 관리</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {tenantId && <InviteForm tenantId={tenantId} members={members} />}
    </main>
  );
}
