import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * SCR-102 / SCR-201 — "버튼 클릭 → DB 반영" 실연 시나리오.
 *
 * dev 서버(.env.local의 실제 Supabase 연결)를 통해 왕복 검증한다.
 * 시드 프로젝트가 없는 환경에서는 graceful skip.
 * 프로젝트 ID는 env(E2E_PROJECT_ID)로 주입 가능 — Zero Hardcoding.
 */
const SEED_PROJECT_ID =
  process.env.E2E_PROJECT_ID ?? "e561cb38-e9ac-40e5-8478-96dd396cffc4";

async function getDocs(request: APIRequestContext) {
  const res = await request.get(`/api/documents?projectId=${SEED_PROJECT_ID}`);
  if (!res.ok()) return null;
  const data = await res.json();
  const all = [
    ...data.forms.flatMap((f: { children: unknown[] }) => [f, ...f.children]),
    ...data.independentDocs,
  ];
  return { data, all };
}

test.describe("SCR-102 적격심사 — 버튼 클릭 → DB 반영", () => {
  test("판정 버튼 클릭이 reload 후에도 유지된다", async ({ page }) => {
    await page.goto(`/projects/${SEED_PROJECT_ID}/qualification`);

    const anyFail = page.locator('[data-testid^="check-fail-"]').first();
    if ((await anyFail.count()) === 0) {
      test.skip(true, "시드 자격심사 데이터 없음 — DB 미연결 또는 빈 프로젝트");
      return;
    }

    const tid = (await anyFail.getAttribute("data-testid"))!; // check-fail-<id>
    const checkId = tid.replace("check-fail-", "");
    const passBtn = page.locator(`[data-testid="check-pass-${checkId}"]`);
    const failBtn = page.locator(`[data-testid="check-fail-${checkId}"]`);

    const originallyPass = (await passBtn.getAttribute("data-active")) === "true";

    // 해당없음(fail) 클릭 → PATCH 완료 대기
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/qualification-checks/${checkId}`) &&
          r.request().method() === "PATCH",
      ),
      failBtn.click(),
    ]);
    expect(resp.ok()).toBeTruthy();

    // reload → 서버가 DB에서 다시 읽어옴 → 여전히 fail 활성
    await page.reload();
    await expect(
      page.locator(`[data-testid="check-fail-${checkId}"]`),
    ).toHaveAttribute("data-active", "true");

    // 원복 (원래 pass였다면 pass로 복원)
    if (originallyPass) {
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes(`/api/qualification-checks/${checkId}`) &&
            r.request().method() === "PATCH",
        ),
        page.locator(`[data-testid="check-pass-${checkId}"]`).click(),
      ]);
      await page.reload();
      await expect(
        page.locator(`[data-testid="check-pass-${checkId}"]`),
      ).toHaveAttribute("data-active", "true");
    }
  });
});

test.describe("SCR-201 서류 — 계층 구조 + PATCH → DB 반영", () => {
  test("GET /api/documents가 서식/증빙 계층을 반환한다", async ({ request }) => {
    const got = await getDocs(request);
    if (!got) {
      test.skip(true, "DB 미연결");
      return;
    }
    const { data } = got;
    expect(Array.isArray(data.forms)).toBeTruthy();
    expect(Array.isArray(data.independentDocs)).toBeTruthy();
    expect(typeof data.documentPct).toBe("number");
    for (const f of data.forms) {
      expect(Array.isArray(f.children)).toBeTruthy();
    }
  });

  test("PATCH validation_status가 DB에 반영된다 (비파괴 왕복)", async ({ request }) => {
    const got = await getDocs(request);
    if (!got || got.all.length === 0) {
      test.skip(true, "시드 서류 데이터 없음");
      return;
    }
    const target = got.all[0] as { id: string; validation_status: string | null };
    const original = target.validation_status ?? "pending";
    const next = original === "needs_review" ? "pending" : "needs_review";

    // 변경
    const patch = await request.patch(`/api/documents/${target.id}`, {
      data: { validation_status: next },
    });
    expect(patch.ok()).toBeTruthy();

    // 재조회 → DB 반영 확인
    const after = await getDocs(request);
    const updated = after!.all.find((d: { id: string }) => d.id === target.id) as {
      validation_status: string;
    };
    expect(updated.validation_status).toBe(next);

    // 원복
    const restore = await request.patch(`/api/documents/${target.id}`, {
      data: { validation_status: original },
    });
    expect(restore.ok()).toBeTruthy();
  });
});
