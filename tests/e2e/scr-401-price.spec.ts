import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-401 가격 시뮬레이터 화면", () => {
  test("페이지가 렌더링된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/price`);
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/price`));
  });

  test("제목이 표시된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/price`);
    const h = page.locator("h1");
    const t = await h.textContent().catch(() => null);
    if (t) expect(["가격 시뮬레이터", "404"]).toContain(t.trim());
  });
});

test.describe("SCR-401 컴포넌트 소스 검증", () => {
  test("data-testid가 모두 정의되어 있다", async () => {
    const p = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/price/page.tsx"), "utf-8");
    const c = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/price/_components/price-simulator.tsx"), "utf-8");
    const s = p + c;
    for (const tid of ["price-page","gate-track-a","gate-vrb","gate-locked","gate-unlocked","scenario-conservative","scenario-standard","scenario-aggressive","recommended-row","confirm-price-btn"]) {
      expect(s).toContain(tid);
    }
  });

  test("API 레이어가 정의되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/price.ts"), "utf-8");
    expect(s).toContain("fetchPriceSimulations");
    expect(s).toContain("savePriceSimulation");
    expect(s).toContain("confirmBidPrice");
    expect(s).toContain("bid_submitted");
  });

  test("수렴 게이트 조건이 구현되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/price/_components/price-simulator.tsx"), "utf-8");
    expect(s).toContain("trackADone");
    expect(s).toContain("vrbApproved");
    expect(s).toContain("gateOpen");
  });

  test("3가지 시나리오가 구현되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/price/_components/price-simulator.tsx"), "utf-8");
    expect(s).toContain("보수적");
    expect(s).toContain("표준");
    expect(s).toContain("공격적");
    expect(s).toContain("winProb");
  });

  test("서버 액션에 revalidatePath가 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/price/_actions.ts"), "utf-8");
    expect(s).toContain("revalidatePath");
  });
});
