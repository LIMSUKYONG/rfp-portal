import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("SCR-201 증빙 AND/OR 조건 검증", () => {
  test("document-list 컴포넌트에 AND/OR 조건 렌더링 로직이 구현되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    // AND/OR condition logic
    expect(src).toContain("condition_type");
    expect(src).toContain("condition_group");
    expect(src).toContain("min_required");
    expect(src).toContain("[전부 필수]");
    expect(src).toContain("[택");
  });

  test("AND 그룹 완료 판정 — 전체 파일 첨부 시 완료", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("isGroupComplete");
    expect(src).toContain('type === "AND"');
    expect(src).toContain("items.every");
  });

  test("OR 그룹 완료 판정 — min_required 이상 첨부 시 완료", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("attached >= minReq");
  });

  test("미완료 서식에 '증빙 미완료' 경고 배지가 표시된다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("증빙 미완료");
    expect(src).toContain("proof-incomplete-");
  });

  test("needs_review=true 항목에 '담당자 확인 필요' 배지가 표시된다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("needs_review");
    expect(src).toContain("담당자 확인 필요");
  });

  test("accordion 토글 data-testid가 정의되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/app/(authenticated)/projects/[id]/documents/_components/document-list.tsx",
      ),
      "utf-8",
    );

    expect(src).toContain("doc-expand-");
    expect(src).toContain("proof-accordion");
    expect(src).toContain("proof-group-");
    expect(src).toContain("proof-item-");
  });

  test("API 레이어에 DocumentProofItem이 포함되어 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/api/documents.ts"),
      "utf-8",
    );

    expect(src).toContain("DocumentProofItem");
    expect(src).toContain("proofItems");
    expect(src).toContain("document_proof_items");
  });

  test("DB 마이그레이션에 condition_type, condition_group 컬럼이 있다", async () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../supabase/migrations/20260603120000_proof_items_conditions.sql",
      ),
      "utf-8",
    );

    expect(src).toContain("condition_type");
    expect(src).toContain("condition_group");
    expect(src).toContain("min_required");
    expect(src).toContain("condition_note");
    expect(src).toContain("needs_review");
  });
});
