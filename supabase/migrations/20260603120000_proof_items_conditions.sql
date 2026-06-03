-- ================================================
-- 증빙서류 조건 컬럼 추가 (AND/OR 조건 지원)
-- ================================================

ALTER TABLE rfp_document_proof_items
  ADD COLUMN condition_type  VARCHAR(3)  NOT NULL DEFAULT 'AND',
  ADD COLUMN condition_group INTEGER     NOT NULL DEFAULT 1,
  ADD COLUMN min_required    INTEGER     NOT NULL DEFAULT 1,
  ADD COLUMN condition_note  TEXT,
  ADD COLUMN needs_review    BOOLEAN     DEFAULT FALSE;

COMMENT ON COLUMN rfp_document_proof_items.condition_type  IS 'AND: 전부 필수, OR: 택1 이상';
COMMENT ON COLUMN rfp_document_proof_items.condition_group IS '같은 그룹끼리 묶임 — 복합 조건 분리용';
COMMENT ON COLUMN rfp_document_proof_items.min_required    IS 'OR: 최소 제출 수, AND: 그룹 전체';
COMMENT ON COLUMN rfp_document_proof_items.condition_note  IS 'RFP 주) 원문 텍스트 보존';
COMMENT ON COLUMN rfp_document_proof_items.needs_review    IS '조건 불명확 시 true';
