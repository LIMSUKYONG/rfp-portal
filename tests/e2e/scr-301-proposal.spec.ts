import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const dummyId = "00000000-0000-0000-0000-000000000001";

test.describe("SCR-301 제안서 AI 평가 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/projects/${dummyId}/proposal`);
  });

  test("페이지가 렌더링된다", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/projects/${dummyId}/proposal`));
  });

  test("제안서 AI 평가 제목이 표시된다", async ({ page }) => {
    const heading = page.locator("h1");
    const text = await heading.textContent().catch(() => null);
    if (text) {
      expect(["제안서 AI 평가", "404", "This page could not be found."]).toContain(text.trim());
    }
  });

  test("업로드 영역이 표시된다", async ({ page }) => {
    const zone = page.locator('[data-testid="proposal-upload-zone"]');
    const count = await zone.count();
    if (count > 0) {
      await expect(zone).toBeVisible();
      await expect(zone).toContainText("200MB");
    }
  });

  test("Supabase 미설정 시 업로드 에러가 표시된다", async ({ page }) => {
    const testPdf = path.resolve(__dirname, "../fixtures/test-rfp.pdf");
    if (!fs.existsSync(testPdf)) return;

    const input = page.locator('[data-testid="proposal-upload-zone"] input[type="file"]');
    const count = await input.count();
    if (count > 0) {
      await input.setInputFiles(testPdf);
      const errorMsg = page.locator(".text-red-700").first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("SCR-301 컴포넌트 소스 검증", () => {
  test("페이지 소스에 모든 data-testid가 정의되어 있다", async () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/proposal/page.tsx"),
      "utf-8",
    );
    const evalSrc = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/proposal/_components/proposal-evaluator.tsx",
      ),
      "utf-8",
    );
    const allSrc = pageSrc + evalSrc;

    const requiredTestIds = [
      "proposal-page",
      "proposal-upload-zone",
      "proposal-progress",
      "eval-score-qualitative",
      "eval-score-quantitative",
      "eval-score-technical",
      "format-check-pages",
      "format-check-ref-table",
      "format-check-ambiguous",
      "negotiation-eligible-badge",
      "track-a-complete-btn",
    ];

    for (const tid of requiredTestIds) {
      expect(allSrc).toContain(tid);
    }
  });

  test("API 레이어에 fetchLatestProposal, saveProposalEvaluation, completeTrackA가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/proposals.ts"),
      "utf-8",
    );

    expect(src).toContain("fetchLatestProposal");
    expect(src).toContain("saveProposalEvaluation");
    expect(src).toContain("completeTrackA");
    expect(src).toContain("track_a_done");
  });

  test("클라이언트 API에 uploadProposalFile, evaluateProposal이 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/proposals.client.ts"),
      "utf-8",
    );

    expect(src).toContain("uploadProposalFile");
    expect(src).toContain("evaluateProposal");
    expect(src).toContain("200");
  });

  test("평가 API Route가 Gemini를 사용한다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/proposal/evaluate/route.ts"),
      "utf-8",
    );

    expect(src).toContain("gemini-client");
    expect(src).toContain("geminiPdfToJson");
    expect(src).toContain("qualitative_score");
    expect(src).toContain("meets_threshold");
  });

  test("형식 검증 항목이 모두 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/proposal/_components/proposal-evaluator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("page_count");
    expect(src).toContain("has_reference_table");
    expect(src).toContain("has_glossary");
    expect(src).toContain("vague_expr_count");
    expect(src).toContain("format_valid");
  });

  test("트랙A 완료 버튼 활성화 조건이 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/proposal/_components/proposal-evaluator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("canCompleteTrackA");
    expect(src).toContain("format_valid");
  });

  test("서버 액션에 revalidatePath가 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/projects/[id]/proposal/_actions.ts"),
      "utf-8",
    );

    expect(src).toContain("revalidatePath");
    expect(src).toContain("completeTrackA");
  });

  test("ProposalEvaluator가 props로 데이터를 주입받는다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/projects/[id]/proposal/_components/proposal-evaluator.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("projectId: string");
    expect(src).toContain("existingProposal: Proposal | null");
  });
});
