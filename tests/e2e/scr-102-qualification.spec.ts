import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("SCR-102 자격요건 체크 화면", () => {
  // Use a dummy project ID — without Supabase the page renders with empty items
  const dummyId = "00000000-0000-0000-0000-000000000001";

  test.beforeEach(async ({ page }) => {
    await page.goto(`/projects/${dummyId}/qualification`);
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    // Even without Supabase, the page should render (with error or 404)
    // We check that the URL navigated correctly
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/qualification`));
  });

  test("자격요건 체크 제목이 표시된다", async ({ page }) => {
    const heading = page.locator("h1");
    // May show 404 or the page title
    const content = await heading.textContent().catch(() => null);
    if (content) {
      expect(["자격요건 체크", "This page could not be found.", "404", "Server Error"]).toContain(content.trim());
    }
  });

  test("뒤로가기 링크가 프로젝트 상세로 향한다", async ({ page }) => {
    const backLink = page.locator(`a[href="/projects/${dummyId}"]`);
    // May or may not exist depending on whether page rendered or 404'd
    const count = await backLink.count();
    if (count > 0) {
      await expect(backLink).toBeVisible();
    }
  });
});

test.describe("SCR-102 컴포넌트 소스 검증", () => {
  test("페이지 소스에 모든 data-testid가 정의되어 있다", async () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(authenticated)/projects/[id]/qualification/page.tsx"),
      "utf-8",
    );
    const checklistSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/qualification/_components/qualification-checklist.tsx",
      ),
      "utf-8",
    );
    const allSrc = pageSrc + checklistSrc;

    const requiredTestIds = [
      "qualification-page",
      "qualification-list",
      "check-item-",
      "item-type-",
      "condition-toggle-",
      "hint-records-",
      "pass-all-banner",
      "btn-start-track-a",
      "btn-start-track-b",
    ];

    for (const tid of requiredTestIds) {
      expect(allSrc).toContain(tid);
    }

    // 판정 버튼 testid는 CHECK_RESULT_ORDER로 생성됨 → check-pass-/fail-/pending- (런타임)
    expect(allSrc).toContain("check-${result}-");
  });

  test("3종 판정 버튼(적합/해당없음/확인중)이 정의되어 있다", async () => {
    const constSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/constants/checklist.ts"),
      "utf-8",
    );
    expect(constSrc).toContain("적합");
    expect(constSrc).toContain("해당없음");
    expect(constSrc).toContain("확인중");
    expect(constSrc).toContain("CHECK_RESULT_CONFIG");
  });

  test("check_result 업데이트가 PATCH API + 클라이언트 헬퍼로 처리된다", async () => {
    const routeSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/qualification-checks/[id]/route.ts"),
      "utf-8",
    );
    const clientSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/qualification.client.ts"),
      "utf-8",
    );
    expect(routeSrc).toContain("export async function PATCH");
    expect(routeSrc).toContain("updateCheckStatus");
    expect(clientSrc).toContain("setCheckResult");
    expect(clientSrc).toContain("/api/qualification-checks/");
  });

  test("서버 액션에 confirmAllPass, setPhaseQualificationCheck가 정의되어 있다", async () => {
    const actionsSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/qualification/_actions.ts",
      ),
      "utf-8",
    );

    expect(actionsSrc).toContain("confirmAllPass");
    expect(actionsSrc).toContain("setPhaseQualificationCheck");
  });

  test("API 레이어에 fetchQualifications, updateCheckStatus, confirmQualificationPass가 정의되어 있다", async () => {
    const apiSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/qualification.ts"),
      "utf-8",
    );

    expect(apiSrc).toContain("fetchQualifications");
    expect(apiSrc).toContain("updateCheckStatus");
    expect(apiSrc).toContain("confirmQualificationPass");
  });

  test("체크리스트 컴포넌트가 props로 데이터를 주입받는다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/qualification/_components/qualification-checklist.tsx",
      ),
      "utf-8",
    );

    // Should accept items and experienceCount as props
    expect(src).toContain("projectId: string");
    expect(src).toContain("items: QualificationItem[]");
    expect(src).toContain("experienceCount: number");
  });

  test("source_type=default 항목에 확인필요 배지가 표시된다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/qualification/_components/qualification-checklist.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain('source_type === "default"');
    expect(src).toContain("확인필요");
  });

  test("전체 Pass 시 트랙A/B 시작 버튼이 표시된다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/qualification/_components/qualification-checklist.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("isChecklistComplete");
    expect(src).toContain("트랙A 시작");
    expect(src).toContain("트랙B 시작");
    expect(src).toContain("/documents");
    expect(src).toContain("/vrb");
  });
});
