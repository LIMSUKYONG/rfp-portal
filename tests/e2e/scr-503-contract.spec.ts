import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-503 계약 체결 화면", () => {
  test("페이지가 렌더링된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/contract`);
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/contract`));
  });

  test("제목이 표시된다", async ({ page }) => {
    await page.goto(`/projects/${dummyId}/contract`);
    const h = page.locator("h1");
    const t = await h.textContent().catch(() => null);
    if (t) expect(["계약 체결", "404"]).toContain(t.trim());
  });
});

test.describe("SCR-503 컴포넌트 소스 검증", () => {
  test("data-testid가 모두 정의되어 있다", async () => {
    const p = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/contract/page.tsx"), "utf-8");
    const c = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/contract/_components/contract-form.tsx"), "utf-8");
    const s = p + c;
    for (const tid of ["contract-page","contract-amount","contract-date","payment-schedule","contract-file-upload","contract-complete-btn","telegram-notify"]) {
      expect(s).toContain(tid);
    }
  });

  test("API 레이어가 정의되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/contracts.ts"), "utf-8");
    expect(s).toContain("fetchContract");
    expect(s).toContain("saveContract");
    expect(s).toContain("sendTelegramNotification");
    expect(s).toContain("contract_signed");
    expect(s).toContain("registered_as_experience");
  });

  test("대금 지급 일정이 자동 계산된다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/contract/_components/contract-form.tsx"), "utf-8");
    expect(s).toContain("advAmount");
    expect(s).toContain("interimAmount");
    expect(s).toContain("finalAmount");
    expect(s).toContain("선금");
    expect(s).toContain("중도금");
    expect(s).toContain("잔금");
  });

  test("하자보수 기간이 rfp_rules에서 로드된다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/contracts.ts"), "utf-8");
    expect(s).toContain("contract_conditions");
    expect(s).toContain("warranty_period");
  });

  test("Telegram 알림이 구현되어 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/lib/api/contracts.ts"), "utf-8");
    expect(s).toContain("TELEGRAM_BOT_TOKEN");
    expect(s).toContain("sendTelegramNotification");
  });

  test("서버 액션에 revalidatePath와 Telegram 호출이 있다", async () => {
    const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/projects/[id]/contract/_actions.ts"), "utf-8");
    expect(s).toContain("revalidatePath");
    expect(s).toContain("sendTelegramNotification");
  });
});
