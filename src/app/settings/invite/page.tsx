import Link from "next/link";
import { fetchTeamMembers } from "@/lib/api/tenants";
import { InviteForm } from "./_components/invite-form";

// In production, tenantId comes from the JWT/session.
// For now, use a placeholder that works with the default tenant.
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export default async function InvitePage() {
  const { members, error } = await fetchTeamMembers(DEFAULT_TENANT_ID);

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

      <InviteForm tenantId={DEFAULT_TENANT_ID} members={members} />
    </main>
  );
}
