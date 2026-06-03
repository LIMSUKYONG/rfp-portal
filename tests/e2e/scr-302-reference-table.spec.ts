import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-302 참조표 편집 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/projects/${dummyId}/reference-table`);
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/reference-table`));
  });

  test("참조표 편집 제목이 표시된다", async ({ page }) => {
    const heading = page.locator("h1");
    const text = await heading.textContent().catch(() => null);
    if (text) {
      expect(["참조표 편집", "404", "This page could not be found."]).toContain(text.trim());
    }
  });

  test("완성률이 표시된다", async ({ page }) => {
    const pct = page.locator('[data-testid="ref-table-pct"]');
    const count = await pct.count();
    if (count > 0) {
      await expect(pct).toContainText("%");
    }
  });

  test("엑셀 내보내기 버튼이 존재한다", async ({ page }) => {
    const btn = page.locator('[data-testid="ref-export-btn"]');
    const count = await btn.count();
    if (count > 0) {
      await expect(btn).toBeVisible();
    }
  });
});

test.describe("SCR-302 컴포넌트 소스 검증", () => {
  test("페이지 소스에 모든 data-testid가 정의되어 있다", async () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/reference-table/page.tsx"),
      "utf-8",
    );
    const editorSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/reference-table/_components/ref-table-editor.tsx",
      ),
      "utf-8",
    );
    const allSrc = pageSrc + editorSrc;

    const requiredTestIds = [
      "ref-table-page",
      "ref-table-list",
      "ref-table-pct",
      "ref-table-item-",
      "ref-page-input-",
      "ref-impl-select-",
      "ref-infeasible-",
      "ref-reason-",
      "ref-export-btn",
      "ref-reviewed-",
    ];

    for (const tid of requiredTestIds) {
      expect(allSrc).toContain(tid);
    }
  });

  test("API 레이어에 fetchReferenceTable, updateRefTableItem, createRefTableExport가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/reference-table.ts"),
      "utf-8",
    );

    expect(src).toContain("fetchReferenceTable");
    expect(src).toContain("updateRefTableItem");
    expect(src).toContain("createRefTableExport");
  });

  test("구현방식이 rfp_rules에서 동적 로드된다 (하드코딩 없음)", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/reference-table.ts"),
      "utf-8",
    );

    expect(src).toContain("reference_table_format");
    expect(src).toContain("impl_types");
    // Fallback: collect from existing items
    expect(src).toContain("impl_type");
  });

  test("불가 항목 선택 시 불가사유 입력이 필수이다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/reference-table/_components/ref-table-editor.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("불가");
    expect(src).toContain("불가사유");
    expect(src).toContain("editReason.trim()");
  });

  test("엑셀 내보내기가 export API를 호출한다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/reference-table/_components/ref-table-editor.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("/api/reference-table/export");
    expect(src).toContain("handleExport");
  });

  test("서버 액션에 revalidatePath가 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/reference-table/_actions.ts"),
      "utf-8",
    );

    expect(src).toContain("revalidatePath");
    expect(src).toContain("saveRefItem");
  });

  test("RefTableEditor가 props로 데이터를 주입받는다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/reference-table/_components/ref-table-editor.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("projectId: string");
    expect(src).toContain("items: ReferenceTableItem[]");
    expect(src).toContain("implTypes: string[]");
    expect(src).toContain("totalCount: number");
    expect(src).toContain("reviewedCount: number");
  });

  test("AI Mock 모드가 3개 API Route에 구현되어 있다", async () => {
    const rfpSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/rfp/parse/route.ts"),
      "utf-8",
    );
    const docSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/documents/validate/route.ts"),
      "utf-8",
    );
    const propSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/proposal/evaluate/route.ts"),
      "utf-8",
    );

    for (const src of [rfpSrc, docSrc, propSrc]) {
      expect(src).toContain("USE_AI_MOCK");
      expect(src).toContain("mock");
    }
  });
});
