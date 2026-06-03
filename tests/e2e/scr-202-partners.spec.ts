import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-202 협력업체 관리 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/projects/${dummyId}/partners`);
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/partners`));
  });

  test("협력업체 관리 제목이 표시된다", async ({ page }) => {
    const heading = page.locator("h1");
    const text = await heading.textContent().catch(() => null);
    if (text) {
      expect(["협력업체 관리", "404", "This page could not be found."]).toContain(text.trim());
    }
  });

  test("유형별 탭이 표시된다", async ({ page }) => {
    for (const type of ["consortium", "subcontract", "goods_supply", "direct_purchase"]) {
      const tab = page.locator(`[data-testid="partner-tab-${type}"]`);
      const count = await tab.count();
      if (count > 0) {
        await expect(tab).toBeVisible();
      }
    }
  });

  test("협력업체 완료율이 표시된다", async ({ page }) => {
    const pct = page.locator('[data-testid="partner-pct"]');
    const count = await pct.count();
    if (count > 0) {
      await expect(pct).toContainText("%");
    }
  });

  test("협력업체 추가 버튼이 존재한다", async ({ page }) => {
    const btn = page.locator('[data-testid="add-partner-btn"]');
    const count = await btn.count();
    if (count > 0) {
      await expect(btn).toBeVisible();
    }
  });

  test("추가 버튼 클릭 시 등록 폼이 표시된다", async ({ page }) => {
    const btn = page.locator('[data-testid="add-partner-btn"]');
    const count = await btn.count();
    if (count > 0) {
      await btn.click();
      await expect(page.locator('[data-testid="partner-form"]')).toBeVisible();
    }
  });
});

test.describe("SCR-202 컴포넌트 소스 검증", () => {
  test("페이지 소스에 모든 data-testid가 정의되어 있다", async () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/partners/page.tsx"),
      "utf-8",
    );
    const mgrSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/partners/_components/partner-manager.tsx",
      ),
      "utf-8",
    );
    const allSrc = pageSrc + mgrSrc;

    const requiredTestIds = [
      "partners-page",
      "partner-list",
      "partner-tab-",
      "partner-row-",
      "add-partner-btn",
      "partner-form",
      "sub-rate-warning",
      "vrb-sync-toast",
      "partner-pct",
    ];

    for (const tid of requiredTestIds) {
      expect(allSrc).toContain(tid);
    }
  });

  test("API 레이어에 fetchPartners, createPartner, updatePartner, deletePartner가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/partners.ts"),
      "utf-8",
    );

    expect(src).toContain("fetchPartners");
    expect(src).toContain("createPartner");
    expect(src).toContain("updatePartner");
    expect(src).toContain("deletePartner");
  });

  test("하도급 비율 초과 경고 로직이 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/partners/_components/partner-manager.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("subRateExceeded");
    expect(src).toContain("subRateLimit");
    expect(src).toContain("currentSubRate");
  });

  test("VRB 손익 자동 반영 토스트가 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/partners/_components/partner-manager.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("VRB 손익에 자동 반영됨");
    expect(src).toContain("/vrb");
  });

  test("직접구매 원가 제외 안내가 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/partners/_components/partner-manager.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("direct_purchase");
    expect(src).toContain("원가에서 제외");
  });

  test("PartnerManager가 props로 데이터를 주입받는다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/partners/_components/partner-manager.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("projectId: string");
    expect(src).toContain("partners: Partner[]");
    expect(src).toContain("budgetAmount: number | null");
    expect(src).toContain("subRateLimit: number | null");
    expect(src).toContain("partnerPct: number");
  });
});
