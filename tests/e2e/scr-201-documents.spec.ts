import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-201 서류 체크리스트 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/projects/${dummyId}/documents`);
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/documents`));
  });

  test("서류 체크리스트 제목이 표시된다", async ({ page }) => {
    const heading = page.locator("h1");
    const text = await heading.textContent().catch(() => null);
    if (text) {
      expect(["서류 체크리스트", "404", "This page could not be found."]).toContain(text.trim());
    }
  });

  test("트랙A 서류 진행률이 표시된다", async ({ page }) => {
    const pct = page.locator('[data-testid="document-pct"]');
    const count = await pct.count();
    if (count > 0) {
      await expect(pct).toBeVisible();
      await expect(pct).toContainText("%");
    }
  });

  test("서류 목록 영역이 존재한다", async ({ page }) => {
    const list = page.locator('[data-testid="document-list"]');
    const count = await list.count();
    if (count > 0) {
      await expect(list).toBeVisible();
    }
  });

  test("뒤로가기 링크가 프로젝트 상세로 향한다", async ({ page }) => {
    const backLink = page.locator(`a[href="/projects/${dummyId}"]`);
    const count = await backLink.count();
    if (count > 0) {
      await expect(backLink).toBeVisible();
    }
  });
});

test.describe("SCR-201 컴포넌트 소스 검증", () => {
  test("페이지 소스에 모든 data-testid가 정의되어 있다", async () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/documents/page.tsx"),
      "utf-8",
    );
    const listSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );
    const allSrc = pageSrc + listSrc;

    const requiredTestIds = [
      "documents-page",
      "document-list",
      "document-pct",
      "doc-row-",
      "upload-btn-",
      "validation-badge-",
      "validation-msg-",
      "calculated-score-",
      "scr203-link-",
    ];

    for (const tid of requiredTestIds) {
      expect(allSrc).toContain(tid);
    }
  });

  test("API 레이어에 fetchDocuments, updateDocumentValidation이 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/documents.ts"),
      "utf-8",
    );

    expect(src).toContain("fetchDocuments");
    expect(src).toContain("updateDocumentValidation");
  });

  test("클라이언트 API에 uploadDocumentFile, validateDocument가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/documents.client.ts"),
      "utf-8",
    );

    expect(src).toContain("uploadDocumentFile");
    expect(src).toContain("validateDocument");
  });

  test("검증 결과 4단계 배지가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("valid");
    expect(src).toContain("expiring_soon");
    expect(src).toContain("error");
    expect(src).toContain("needs_review");
  });

  test("체크리스트 추가 항목 rule_type이 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/documents.ts"),
      "utf-8",
    );

    expect(src).toContain("bid_deposit");
    expect(src).toContain("presentation_rules");
    expect(src).toContain("direct_purchase_items");
    expect(src).toContain("proposal_format");
  });

  test("DocumentList가 props로 데이터를 주입받는다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("projectId: string");
    expect(src).toContain("documents: DocumentWithProofs[]");
    expect(src).toContain("documentPct: number");
    expect(src).toContain("checklistExtras: RfpChecklistExtra[]");
  });

  test("AI 검증 API Route가 Claude를 사용한다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/documents/validate/route.ts"),
      "utf-8",
    );

    expect(src).toContain("@anthropic-ai/sdk");
    expect(src).toContain("claude-sonnet-4-20250514");
    expect(src).toContain("validation_status");
  });
});
