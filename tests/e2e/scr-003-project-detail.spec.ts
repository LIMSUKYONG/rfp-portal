import { test, expect } from "@playwright/test";

test.describe("SCR-003 프로젝트 상세", () => {
  test("존재하지 않는 ID로 접근 시 404를 반환한다", async ({ page }) => {
    const res = await page.goto("/projects/00000000-0000-0000-0000-000000000000");
    expect(res?.status()).toBe(404);
  });

  test.describe("프로젝트가 있는 경우", () => {
    /**
     * 목록 페이지에서 첫 번째 프로젝트의 ID를 추출한 뒤 상세 페이지로 이동한다.
     * 프로젝트가 없으면 테스트를 건너뛴다.
     */
    let projectId: string;

    test.beforeEach(async ({ page }) => {
      await page.goto("/projects");
      const firstRow = page.locator('[data-testid^="project-row-"]').first();
      const count = await firstRow.count();
      if (count === 0) {
        test.skip();
        return;
      }
      const testId = await firstRow.getAttribute("data-testid");
      projectId = testId!.replace("project-row-", "");
      await page.goto(`/projects/${projectId}`);
    });

    test("상세 페이지가 렌더링된다", async ({ page }) => {
      await expect(page.locator('[data-testid="project-detail"]')).toBeVisible();
    });

    test("헤더에 프로젝트명, 코드, 상태 배지, D-day가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="project-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-code"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-phase"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-dday"]')).toBeVisible();
    });

    test("뒤로가기 링크가 /projects로 이동한다", async ({ page }) => {
      const backLink = page.locator('[data-testid="back-link"]');
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL(/\/projects$/);
    });

    test("기본 정보 카드가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="card-info"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="card-info"]').getByText("발주처"),
      ).toBeVisible();
    });

    test("트랙A 진행 현황 카드에 4개 진행률 바가 있다", async ({ page }) => {
      const card = page.locator('[data-testid="card-track-a"]');
      await expect(card).toBeVisible();
      await expect(page.locator('[data-testid="pct-qualification"]')).toBeVisible();
      await expect(page.locator('[data-testid="pct-document"]')).toBeVisible();
      await expect(page.locator('[data-testid="pct-partner"]')).toBeVisible();
      await expect(page.locator('[data-testid="pct-ref-table"]')).toBeVisible();
    });

    test("VRB 심의 현황 카드가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="card-vrb"]')).toBeVisible();
    });

    test("손익 현황 카드가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="card-pl"]')).toBeVisible();
    });

    test("적격 심사 카드가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="card-qualification"]')).toBeVisible();
    });

    test("서류 현황 카드가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="card-documents"]')).toBeVisible();
    });

    test("협력사 현황 카드가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="card-partners"]')).toBeVisible();
    });

    test("미해결 리스크 카드가 표시된다", async ({ page }) => {
      await expect(page.locator('[data-testid="card-risks"]')).toBeVisible();
    });
  });
});
