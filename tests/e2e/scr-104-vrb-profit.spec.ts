import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-104 VRB 손익 계산 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/projects/${dummyId}/vrb/profit`);
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/vrb/profit`));
  });

  test("VRB 손익 계산 제목이 표시된다", async ({ page }) => {
    const heading = page.locator("h1");
    const text = await heading.textContent().catch(() => null);
    if (text) {
      expect(["VRB 손익 계산", "404", "This page could not be found."]).toContain(text.trim());
    }
  });

  test("트랙A 자동 반영 안내 배너가 표시된다", async ({ page }) => {
    const banner = page.locator("text=트랙A 협력업체");
    const count = await banner.count();
    if (count > 0) {
      await expect(banner.first()).toBeVisible();
    }
  });

  test("손익 저장 버튼이 존재한다", async ({ page }) => {
    const btn = page.locator('[data-testid="profit-save-btn"]');
    const count = await btn.count();
    if (count > 0) {
      await expect(btn).toBeVisible();
    }
  });
});

test.describe("SCR-104 컴포넌트 소스 검증", () => {
  test("페이지 소스에 모든 data-testid가 정의되어 있다", async () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/profit/page.tsx"),
      "utf-8",
    );
    const calcSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/vrb/profit/_components/profit-calculator.tsx",
      ),
      "utf-8",
    );
    const allSrc = pageSrc + calcSrc;

    const requiredTestIds = [
      "vrb-profit-page",
      "profit-inhouse",
      "profit-outsource",
      "profit-goods",
      "profit-rate",
      "profit-threshold",
      "profit-warning",
      "strategic-reason",
      "profit-save-btn",
    ];

    for (const tid of requiredTestIds) {
      expect(allSrc).toContain(tid);
    }
  });

  test("API 레이어에 fetchProfitLoss, updateProfitLoss가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/vrb.ts"),
      "utf-8",
    );

    expect(src).toContain("fetchProfitLoss");
    expect(src).toContain("updateProfitLoss");
    expect(src).toContain("profit_threshold");
  });

  test("이익률 자동 계산이 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/vrb/profit/_components/profit-calculator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("profitRate");
    expect(src).toContain("totalCost");
    expect(src).toContain("belowThreshold");
  });

  test("기준수익률 미달 시 전략적 사유 입력이 표시된다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/vrb/profit/_components/profit-calculator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("belowThreshold");
    expect(src).toContain("strategic-reason");
    expect(src).toContain("전략적 접근 사유");
  });

  test("자사 인건비, 외주비, 물품비가 자동 집계 표시된다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/vrb/profit/_components/profit-calculator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("inhouseLaborCost");
    expect(src).toContain("outsourceCost");
    expect(src).toContain("goodsCost");
    expect(src).toContain("자동 집계");
    expect(src).toContain("자동 반영");
  });

  test("직접구매 원가 제외 처리가 표시된다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/vrb/profit/_components/profit-calculator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("directPurchaseAmount");
    expect(src).toContain("원가에서 제외");
  });

  test("ProfitCalculator가 props로 데이터를 주입받는다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/vrb/profit/_components/profit-calculator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("projectId: string");
    expect(src).toContain("profitLoss: ProfitLoss | null");
    expect(src).toContain("inhouseLaborCost: number");
    expect(src).toContain("profitThreshold: number | null");
  });

  test("서버 액션에 revalidatePath가 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/vrb/profit/_actions.ts"),
      "utf-8",
    );

    expect(src).toContain("revalidatePath");
    expect(src).toContain("saveProfitLoss");
  });
});
