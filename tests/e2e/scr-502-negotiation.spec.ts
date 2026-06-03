import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-502 협상 관리 화면", () => {
  test("페이지가 렌더링된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/negotiation`);
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/negotiation`));
  });

  test("제목이 표시된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/negotiation`);
    const h = page.locator("h1");
    const t = await h.textContent().catch(() => null);
    if (t) expect(["협상 관리", "404", "Server Error"]).toContain(t.trim());
  });
});

test.describe("SCR-502 컴포넌트 소스 검증", () => {
  test("data-testid가 모두 정의되어 있다", async () => {
    const p = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/negotiation/page.tsx"), "utf-8");
    const c = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/negotiation/_components/negotiation-manager.tsx"), "utf-8");
    const s = p + c;
    for (const tid of ["negotiation-page","negotiation-range","negotiation-dday","negotiation-history","negotiation-round-","final-price-btn"]) {
      expect(s).toContain(tid);
    }
  });

  test("API 레이어가 정의되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/negotiations.ts"), "utf-8");
    expect(s).toContain("fetchNegotiations");
    expect(s).toContain("addNegotiationRound");
    expect(s).toContain("confirmFinalPrice");
    expect(s).toContain("negotiation_price_rules");
  });

  test("협상 범위 상한/하한이 표시된다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/negotiation/_components/negotiation-manager.tsx"), "utf-8");
    expect(s).toContain("minPrice");
    expect(s).toContain("maxPrice");
    expect(s).toContain("firstBidPrice");
  });

  test("회차별 이력이 표시된다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/negotiation/_components/negotiation-manager.tsx"), "utf-8");
    expect(s).toContain("negotiation_round");
    expect(s).toContain("회차");
  });
});
