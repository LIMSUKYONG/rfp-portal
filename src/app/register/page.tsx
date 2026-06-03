"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!company.trim() || !name.trim()) {
      setError("모든 필드를 입력하세요.");
      return;
    }

    setIsSubmitting(true);

    // 1. Supabase Auth signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "회원가입 실패");
      setIsSubmitting(false);
      return;
    }

    // 2. Create tenant + PM user
    const res = await fetch("/api/tenants/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantName: company.trim(),
        pmEmail: email,
        pmName: name.trim(),
        authUid: authData.user.id,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "테넌트 생성 실패");
      setIsSubmitting(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle>회사 가입</CardTitle>
          <CardDescription>새 회사를 등록하고 PM 계정을 생성합니다.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">회사명</Label>
              <Input data-testid="register-company" id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="핸디소프트" required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input data-testid="register-name" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input data-testid="register-email" id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pm@company.com" required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input data-testid="register-password" id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">비밀번호 확인</Label>
              <Input data-testid="register-confirm" id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={isSubmitting} />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button data-testid="register-submit" type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "가입 중..." : "회사 가입"}
            </Button>
            <a href="/" className="text-sm text-muted-foreground hover:underline">이미 계정이 있으신가요?</a>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
