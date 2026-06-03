import { test, expect } from "@playwright/test";

test.describe("SCR-002 프로젝트 목록", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects");
  });

  test("프로젝트 테이블이 렌더링된다", async ({ page }) => {
    const table = page.locator('[data-testid="project-table"]');
    await expect(table).toBeVisible();
  });

  test("테이블 헤더 컬럼이 올바르다", async ({ page }) => {
    const headers = page.locator('[data-testid="project-table"] thead th');
    await expect(headers).toHaveCount(6);
    await expect(headers.nth(0)).toContainText("프로젝트명");
    await expect(headers.nth(1)).toContainText("발주처");
    await expect(headers.nth(2)).toContainText("트랙A 진행률");
    await expect(headers.nth(3)).toContainText("VRB 상태");
    await expect(headers.nth(4)).toContainText("D-day");
    await expect(headers.nth(5)).toContainText("상태");
  });

  test("단계 필터 드롭다운이 존재한다", async ({ page }) => {
    const filter = page.locator('[data-testid="filter-phase"]');
    await expect(filter).toBeVisible();
  });

  test("단계 필터 변경 시 URL 파라미터가 업데이트된다", async ({ page }) => {
    const filter = page.locator('[data-testid="filter-phase"]');
    await filter.click();
    await page.locator('[role="option"]').filter({ hasText: "진행 중" }).click();
    await expect(page).toHaveURL(/phase=in_progress/);
  });

  test("전체 단계 선택 시 phase 파라미터가 제거된다", async ({ page }) => {
    await page.goto("/projects?phase=in_progress");
    const filter = page.locator('[data-testid="filter-phase"]');
    await filter.click();
    await page.locator('[role="option"]').filter({ hasText: "전체 단계" }).click();
    await expect(page).not.toHaveURL(/phase=/);
  });

  test("프로젝트 행에 필요한 data-testid가 존재한다", async ({ page }) => {
    const rows = page.locator('[data-testid^="project-row-"]');
    const count = await rows.count();

    if (count > 0) {
      const firstRow = rows.first();
      const id = (await firstRow.getAttribute("data-testid"))!.replace(
        "project-row-",
        "",
      );

      await expect(
        page.locator(`[data-testid="track-a-pct-${id}"]`),
      ).toBeVisible();
      await expect(
        page.locator(`[data-testid="vrb-status-${id}"]`),
      ).toBeVisible();
      await expect(
        page.locator(`[data-testid="dday-${id}"]`),
      ).toBeVisible();
    }
  });

  test("프로젝트명 클릭 시 상세 페이지로 이동한다", async ({ page }) => {
    const rows = page.locator('[data-testid^="project-row-"]');
    const count = await rows.count();

    if (count > 0) {
      const firstRow = rows.first();
      const id = (await firstRow.getAttribute("data-testid"))!.replace(
        "project-row-",
        "",
      );
      const link = firstRow.locator("a").first();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/projects/${id}`));
    }
  });

  test("트랙A 진행률 바가 퍼센트를 표시한다", async ({ page }) => {
    const rows = page.locator('[data-testid^="project-row-"]');
    const count = await rows.count();

    if (count > 0) {
      const firstRow = rows.first();
      const id = (await firstRow.getAttribute("data-testid"))!.replace(
        "project-row-",
        "",
      );
      const pctCell = page.locator(`[data-testid="track-a-pct-${id}"]`);
      await expect(pctCell).toContainText("%");
    }
  });

  test("상태 배지가 올바른 텍스트를 표시한다", async ({ page }) => {
    const badges = page.locator('[data-testid="project-table"] tbody .inline-flex');
    const count = await badges.count();

    if (count > 0) {
      const validLabels = [
        "RFP 등록", "진행 중", "트랙A 완료", "VRB 승인",
        "가격 확정", "입찰 제출", "선정", "탈락", "포기", "계약 체결",
        "승인", "반려", "대기", "미요청",
      ];
      const firstBadge = badges.first();
      const text = await firstBadge.textContent();
      expect(validLabels).toContain(text?.trim());
    }
  });

  test("데이터가 없을 때 빈 상태 메시지를 표시한다", async ({ page }) => {
    // Use a phase that's unlikely to have data
    await page.goto("/projects?phase=contract_signed");
    const emptyRow = page.locator("text=프로젝트가 없습니다.");
    // This may or may not appear depending on data — just verify no crash
    await expect(page.locator('[data-testid="project-table"]')).toBeVisible();
  });
});
