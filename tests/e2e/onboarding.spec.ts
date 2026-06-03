import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("회사 가입 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
  });

  test("모든 입력 필드가 표시된다", async ({ page }) => {
    for (const tid of ["register-company", "register-name", "register-email", "register-password", "register-confirm"]) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }
  });

  test("가입 버튼이 존재한다", async ({ page }) => {
    await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
  });

  test("로그인 링크가 존재한다", async ({ page }) => {
    await expect(page.locator("text=이미 계정이 있으신가요")).toBeVisible();
  });
});

test.describe("팀원 초대 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/invite");
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(/\/settings\/invite/);
  });

  test("팀원 관리 제목이 표시된다", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("팀원 관리");
  });

  test("초대 필드가 표시된다", async ({ page }) => {
    for (const tid of ["invite-name", "invite-email", "invite-submit"]) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }
  });

  test("역할 표시가 있다", async ({ page }) => {
    await expect(page.locator('[data-testid="invite-role"]')).toBeVisible();
  });
});

test.describe("로그인 화면 수정 검증", () => {
  test("회사 가입하기 링크가 존재한다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=회사 가입하기")).toBeVisible();
  });
});

test.describe("온보딩 소스 검증", () => {
  test("회사 가입 페이지 data-testid가 모두 정의되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/register/page.tsx"), "utf-8");
    for (const tid of ["register-company", "register-name", "register-email", "register-password", "register-confirm", "register-submit"]) {
      expect(s).toContain(tid);
    }
  });

  test("팀원 초대 페이지 data-testid가 모두 정의되어 있다", async () => {
    const p = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/settings/invite/page.tsx"), "utf-8");
    const c = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/settings/invite/_components/invite-form.tsx"), "utf-8");
    const s = p + c;
    for (const tid of ["invite-page", "invite-name", "invite-email", "invite-role", "invite-submit", "team-list", "team-member-"]) {
      expect(s).toContain(tid);
    }
  });

  test("API 레이어에 fetchTeamMembers가 정의되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/tenants.ts"), "utf-8");
    expect(s).toContain("fetchTeamMembers");
    expect(s).toContain("rfp_users");
  });

  test("회사 가입이 signUp + register API를 호출한다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/register/page.tsx"), "utf-8");
    expect(s).toContain("/api/tenants/register");
    expect(s).toContain("signInWithPassword");
  });

  test("팀원 초대가 invite API를 호출한다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/settings/invite/_components/invite-form.tsx"), "utf-8");
    expect(s).toContain("/api/tenants/invite");
  });
});
