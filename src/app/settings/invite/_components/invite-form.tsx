"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AppUser } from "@/lib/api/tenants";

interface Props {
  tenantId: string;
  members: AppUser[];
}

export function InviteForm({ tenantId, members: initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleInvite() {
    if (!name.trim() || !email.trim()) return;
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const res = await fetch("/api/tenants/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, email: email.trim(), name: name.trim() }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "초대 실패");
        return;
      }

      const { userId } = await res.json();
      setMembers((prev) => [...prev, {
        id: userId,
        auth_uid: null,
        tenant_id: tenantId,
        email: email.trim(),
        name: name.trim(),
        role: "member" as const,
        created_at: new Date().toISOString(),
      }]);
      setName("");
      setEmail("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Card>
        <CardHeader><CardTitle className="text-base">팀원 초대</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>이름</Label>
              <Input data-testid="invite-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="팀원 이름" />
            </div>
            <div>
              <Label>이메일</Label>
              <Input data-testid="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@company.com" />
            </div>
          </div>
          <div data-testid="invite-role" className="text-xs text-muted-foreground">역할: member (기본)</div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">초대 완료!</p>}
          <Button data-testid="invite-submit" onClick={handleInvite} disabled={isPending || !name.trim() || !email.trim()}>
            {isPending ? "초대 중..." : "팀원 초대"}
          </Button>
        </CardContent>
      </Card>

      {/* Team list */}
      <Card>
        <CardHeader><CardTitle className="text-base">팀원 목록 ({members.length}명)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>가입일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="team-list">
              {members.map((m) => (
                <TableRow key={m.id} data-testid={`team-member-${m.id}`}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={m.role === "pm" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>
                      {m.role === "pm" ? "PM" : "멤버"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
