import Link from "next/link";
import { fetchTeamMembers } from "@/lib/api/tenants";
import { getCurrentTenantId } from "@/lib/auth/session";
import { InviteForm } from "./_components/invite-form";

export default async function InvitePage() {
  const tenantId = await getCurrentTenantId();
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
