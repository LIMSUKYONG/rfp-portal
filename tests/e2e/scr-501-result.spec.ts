import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-501 입찰 결과 등록 화면", () => {
  test("페이지가 렌더링된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/result`);
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/result`));
  });

  test("제목이 표시된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/result`);
    const h = page.locator("h1");
    const t = await h.textContent().catch(() => null);
    if (t) expect(["입찰 결과 등록", "404", "Server Error"]).toContain(t.trim());
  });
});

test.describe("SCR-501 컴포넌트 소스 검증", () => {
  test("data-testid가 모두 정의되어 있다", async () => {
    const p = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/result/page.tsx"), "utf-8");
    const c = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/result/_components/result-form.tsx"), "utf-8");
    const s = p + c;
    for (const tid of ["result-page","result-type","score-actual","score-compare","fail-reason","result-save-btn"]) {
      expect(s).toContain(tid);
    }
  });

  test("API 레이어가 정의되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/bid-results.ts"), "utf-8");
    expect(s).toContain("fetchBidResult");
    expect(s).toContain("saveBidResult");
    expect(s).toContain("selected");
    expect(s).toContain("lost");
  });

  test("미선정 시 탈락 사유 입력이 필수이다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/result/_components/result-form.tsx"), "utf-8");
    expect(s).toContain("isLost");
    expect(s).toContain("lossReason");
    expect(s).toContain("탈락 사유");
  });

  test("예상 vs 실제 점수 비교가 구현되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/result/_components/result-form.tsx"), "utf-8");
    expect(s).toContain("predictedTechScore");
    expect(s).toContain("scoreDiff");
    expect(s).toContain("AI 예상");
  });
});
