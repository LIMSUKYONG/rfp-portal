-- ================================================================
-- SCR-201 서류 체크리스트: doc_category / parent_document_id / check_result
-- ================================================================
-- 봉구 / 2026-06-04
--
-- 대상 테이블(원격 DB 실제 테이블명 = rfp_ 접두사):
--   rfp_documents, rfp_document_proof_items, rfp_qualification_checks
--
-- 모든 구문은 멱등(idempotent) — 재실행해도 동일 결과.
-- ================================================================


-- ── 작업 1: doc_category 초기값 채우기 ──────────────────────────
-- 임시 초기 규칙(향후 RFP 파싱 시 AI가 판단해 대체):
--   form_number 있음 → 'form'  (서식)
--   form_number 없음 → 'proof' (증빙)
UPDATE rfp_documents
   SET doc_category = 'form'
 WHERE form_number IS NOT NULL
   AND (doc_category IS NULL OR doc_category NOT IN ('form', 'proof'));

UPDATE rfp_documents
   SET doc_category = 'proof'
 WHERE form_number IS NULL
   AND (doc_category IS NULL OR doc_category NOT IN ('form', 'proof'));


-- ── 작업 2: 서식-증빙 부모-자식 연결 ────────────────────────────
-- 2-1) parent_document_id 컬럼 추가 (self-reference)
ALTER TABLE rfp_documents
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES rfp_documents(id);

COMMENT ON COLUMN rfp_documents.parent_document_id IS
  'form(서식)의 id를 가리키는 proof(증빙)의 부모 참조. form은 NULL(최상위).';

CREATE INDEX IF NOT EXISTS idx_rfp_documents_parent
  ON rfp_documents(parent_document_id);

-- 2-2) form 은 항상 최상위 → parent_document_id = NULL 보장
UPDATE rfp_documents
   SET parent_document_id = NULL
 WHERE doc_category = 'form'
   AND parent_document_id IS NOT NULL;

-- 2-3) proof → 같은 프로젝트 내 doc_name 이 가장 유사한 form 에 자동 연결.
--      trigram 유사도 임계값(0.3) 미만은 매칭 불가로 보고 NULL 유지(수동 연결 대상).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

WITH best_match AS (
  SELECT DISTINCT ON (p.id)
         p.id                                   AS proof_id,
         f.id                                   AS form_id,
         similarity(p.doc_name, f.doc_name)     AS sim
    FROM rfp_documents p
    JOIN rfp_documents f
      ON f.project_id    = p.project_id
     AND f.doc_category  = 'form'
   WHERE p.doc_category  = 'proof'
   ORDER BY p.id, similarity(p.doc_name, f.doc_name) DESC
)
UPDATE rfp_documents d
   SET parent_document_id = bm.form_id
  FROM best_match bm
 WHERE d.id = bm.proof_id
   AND bm.sim >= 0.3;


-- ── 작업 3: rfp_qualification_checks.check_result 보정 ──────────
-- NULL → 'pending' (미점검 상태)
UPDATE rfp_qualification_checks
   SET check_result = 'pending'
 WHERE check_result IS NULL;
