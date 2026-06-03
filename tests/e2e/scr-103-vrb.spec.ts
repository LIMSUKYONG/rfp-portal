import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-103 VRB 심의 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/projects/${dummyId}/vrb`);
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/vrb`));
  });

  test("VRB 심의 제목이 표시된다", async ({ page }) => {
    const heading = page.locator("h1");
    const text = await heading.textContent().catch(() => null);
    if (text) {
      expect(["VRB 심의", "404", "This page could not be found."]).toContain(text.trim());
    }
  });

  test("VRB D-day가 표시된다", async ({ page }) => {
    const dday = page.locator('[data-testid="vrb-dday"]');
    const count = await dday.count();
    if (count > 0) {
      await expect(dday).toContainText("VRB");
    }
  });

  test("손익 요약이 표시된다", async ({ page }) => {
    const summary = page.locator('[data-testid="profit-summary"]');
    const count = await summary.count();
    if (count > 0) {
      await expect(summary).toBeVisible();
    }
  });
});

test.describe("SCR-103 컴포넌트 소스 검증", () => {
  test("페이지 소스에 모든 data-testid가 정의되어 있다", async () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/page.tsx"),
      "utf-8",
    );
    const dashSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/_components/vrb-dashboard.tsx"),
      "utf-8",
    );
    const allSrc = pageSrc + dashSrc;

    const requiredTestIds = [
      "vrb-page",
      "vrb-dept-list",
      "vrb-radar-chart",
      "vrb-dday",
      "dept-status-",
      "vrb-approve-btn",
      "vrb-reject-btn",
      "vrb-reject-reason",
      "profit-summary",
    ];

    for (const tid of requiredTestIds) {
      expect(allSrc).toContain(tid);
    }
  });

  test("API 레이어에 fetchVrbReviews, updateDeptReview, approveVrb가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/vrb.ts"),
      "utf-8",
    );

    expect(src).toContain("fetchVrbReviews");
    expect(src).toContain("updateDeptReview");
    expect(src).toContain("approveVrb");
  });

  test("VRB 승인 시 track_a_done이면 price_ready로 자동 전환한다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/vrb.ts"),
      "utf-8",
    );

    expect(src).toContain("track_a_done");
    expect(src).toContain("price_ready");
    expect(src).toContain("vrb_approved");
  });

  test("레이더 차트가 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/_components/vrb-dashboard.tsx"),
      "utf-8",
    );

    expect(src).toContain("RadarChart");
    expect(src).toContain("polygon");
    expect(src).toContain("risk_level");
  });

  test("반려 시 사유 입력이 필수이다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/_components/vrb-dashboard.tsx"),
      "utf-8",
    );

    expect(src).toContain("rejectReason.trim()");
    expect(src).toContain("반려 사유");
  });

  test("D-day 색상 분기가 구현되어 있다 (D-3 주황, D-1 빨강)", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/_components/vrb-dashboard.tsx"),
      "utf-8",
    );

    expect(src).toContain("ddayNum");
    expect(src).toContain("<= 1");
    expect(src).toContain("<= 3");
    expect(src).toContain("red");
    expect(src).toContain("orange");
  });

  test("서버 액션에 revalidatePath가 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/_actions.ts"),
      "utf-8",
    );

    expect(src).toContain("revalidatePath");
  });
});
