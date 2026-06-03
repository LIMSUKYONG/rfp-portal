import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("SCR-101 법령 웹서치 검증", () => {
  test("파싱 API에 법령 추출 규칙이 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/rfp/parse/route.ts"),
      "utf-8",
    );

    expect(src).toContain("법령");
    expect(src).toContain("law_name");
    expect(src).toContain("is_current");
    expect(src).toContain("laws");
  });

  test("파싱 API system prompt에 하드코딩 금지 원칙이 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/rfp/parse/route.ts"),
      "utf-8",
    );

    expect(src).toContain("추측 금지");
    expect(src).toContain("문서에 없으면");
  });

  test("파싱 API가 documents와 laws를 함께 반환한다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/rfp/parse/route.ts"),
      "utf-8",
    );

    // The prompt schema includes both documents and laws arrays
    expect(src).toContain('"documents"');
    expect(src).toContain('"laws"');
  });

  test("클라이언트 API에 laws 필드가 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/rfp.client.ts"),
      "utf-8",
    );

    expect(src).toContain("RfpParsedLaw");
    expect(src).toContain("laws: RfpParsedLaw[]");
  });

  test("SCR-101 페이지에 4단계 step indicator가 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(authenticated)/projects/new/page.tsx"),
      "utf-8",
    );

    expect(src).toContain("step-indicator");
    expect(src).toContain("PDF 업로드");
    expect(src).toContain("AI 파싱");
    expect(src).toContain("법령 검증");
    expect(src).toContain("확인 및 저장");
  });

  test("SCR-101 페이지에 법령 검증 단계 UI가 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(authenticated)/projects/new/page.tsx"),
      "utf-8",
    );

    expect(src).toContain("law-search-step");
    expect(src).toContain("법령");
    expect(src).toContain("확인 중");
  });

  test("SCR-101 페이지에 법령 결과 표시 영역이 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(authenticated)/projects/new/page.tsx"),
      "utf-8",
    );

    expect(src).toContain("law-results");
    expect(src).toContain("law-stale-warning");
    expect(src).toContain("law-row-");
    expect(src).toContain("현행");
    expect(src).toContain("확인필요");
  });

  test("타입에 LawReference와 RfpParsedLaw가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/types/database.ts"),
      "utf-8",
    );

    expect(src).toContain("interface LawReference");
    expect(src).toContain("interface RfpParsedLaw");
    expect(src).toContain("is_current");
  });

  test("AND/OR 조건 추출 규칙이 파싱 prompt에 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/rfp/parse/route.ts"),
      "utf-8",
    );

    expect(src).toContain("AND");
    expect(src).toContain("OR");
    expect(src).toContain("condition_group");
    expect(src).toContain("proof_items");
  });
});
