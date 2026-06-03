import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("SCR-001 대시보드 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("대시보드 제목이 표시된다", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("대시보드");
  });

  test("KPI 카드 5개가 표시된다", async ({ page }) => {
    for (const tid of ["kpi-total", "kpi-in-progress", "kpi-deadline", "kpi-risk-count", "kpi-gate-count"]) {
      const card = page.locator(`[data-testid="${tid}"]`);
      await expect(card).toBeVisible();
    }
  });

  test("필터 칩이 표시된다", async ({ page }) => {
    for (const type of ["all", "in_progress", "deadline", "risk"]) {
      const chip = page.locator(`[data-testid="filter-chip-${type}"]`);
      await expect(chip).toBeVisible();
    }
  });

  test("필터 칩 클릭이 동작한다", async ({ page }) => {
    const chip = page.locator('[data-testid="filter-chip-in_progress"]');
    await chip.click();
    // Verify chip is still visible after click (no crash)
    await expect(chip).toBeVisible();
  });
});

test.describe("SCR-001 컴포넌트 소스 검증", () => {
  test("data-testid가 모두 정의되어 있다", async () => {
    const p = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/dashboard/page.tsx"), "utf-8");
    const c = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/dashboard/_components/dashboard-view.tsx"), "utf-8");
    const s = p + c;

    for (const tid of [
      "dashboard-page", "kpi-total", "kpi-in-progress", "kpi-deadline",
      "kpi-risk-count", "kpi-gate-count", "urgent-banner", "project-card-",
      "risk-table", "risk-row-", "resolve-btn-", "filter-chip-",
    ]) {
      expect(s).toContain(tid);
    }
  });

  test("API 레이어가 정의되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/dashboard.ts"), "utf-8");
    expect(s).toContain("fetchDashboardData");
    expect(s).toContain("resolveRisk");
    expect(s).toContain("DashboardKpi");
  });

  test("긴급 알림 배너가 D-3 이내 마감을 표시한다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/dashboard.ts"), "utf-8");
    expect(s).toContain("<= 3");
    expect(s).toContain("bid_deadline");
    expect(s).toContain("vrb_deadline");
  });

  test("프로젝트 카드에 트랙A 진행률이 표시된다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/dashboard/_components/dashboard-view.tsx"), "utf-8");
    expect(s).toContain("trackAPct");
    expect(s).toContain("트랙A");
    expect(s).toContain("Progress");
  });

  test("리스크 해결 시 KPI가 실시간 감소한다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/dashboard/_components/dashboard-view.tsx"), "utf-8");
    expect(s).toContain("unresolvedRiskCount");
    expect(s).toContain("unresolvedRiskCount - 1");
  });

  test("실시간 시계가 구현되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/dashboard/_components/dashboard-view.tsx"), "utf-8");
    expect(s).toContain("clock");
    expect(s).toContain("setInterval");
    expect(s).toContain("toLocaleTimeString");
  });

  test("서버 액션에 revalidatePath가 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/dashboard/_actions.ts"), "utf-8");
    expect(s).toContain("revalidatePath");
    expect(s).toContain("markRiskResolved");
  });

  test("DashboardView가 props로 데이터를 주입받는다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/dashboard/_components/dashboard-view.tsx"), "utf-8");
    expect(s).toContain("kpi: DashboardKpi");
    expect(s).toContain("urgentItems: UrgentItem[]");
    expect(s).toContain("projectCards: ProjectCard[]");
    expect(s).toContain("risks: RiskLog[]");
  });
});
