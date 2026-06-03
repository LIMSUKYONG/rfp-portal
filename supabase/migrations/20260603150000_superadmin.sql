-- ================================================
-- superadmin 역할 추가
-- ================================================

-- 1. rfp_users role에 superadmin 추가
ALTER TABLE rfp_users
  DROP CONSTRAINT IF EXISTS rfp_users_role_check;
ALTER TABLE rfp_users
  ADD CONSTRAINT rfp_users_role_check
  CHECK (role IN ('superadmin', 'pm', 'member'));

-- 2. superadmin 판별 함수
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM rfp_users
    WHERE auth_uid = auth.uid()
    AND role = 'superadmin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. 모든 rfp_ 테이블에 superadmin 전체 접근 정책 추가
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'rfp_projects', 'rfp_rules', 'rfp_law_references',
      'rfp_qualification_checks', 'rfp_vrb_reviews', 'rfp_vrb_dept_reviews',
      'rfp_profit_loss', 'rfp_inhouse_members', 'rfp_partners',
      'rfp_documents', 'rfp_document_proof_items', 'rfp_evaluation_criteria',
      'rfp_reference_table_items', 'rfp_proposals', 'rfp_reference_table_exports',
      'rfp_price_simulations', 'rfp_bid_results', 'rfp_negotiations',
      'rfp_contracts', 'rfp_mail_logs', 'rfp_risk_logs',
      'rfp_project_members', 'rfp_tenants'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "superadmin_all_%1$s" ON %1$I FOR ALL USING (is_superadmin())',
      tbl
    );
  END LOOP;
END;
$$;

-- 4. rfp_users 자체에도 superadmin 전체 접근
CREATE POLICY "superadmin_all_rfp_users" ON rfp_users
  FOR ALL USING (is_superadmin());
