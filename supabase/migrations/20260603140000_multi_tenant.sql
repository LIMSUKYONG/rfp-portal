-- ================================================
-- 작업2: 멀티테넌트 구조 — SaaS 판매 대비
-- ================================================

-- 1. rfp_tenants 테이블
CREATE TABLE rfp_tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  plan       VARCHAR(20) DEFAULT 'free'
             CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. rfp_users.tenant_id에 FK 추가
ALTER TABLE rfp_users
  ADD CONSTRAINT fk_rfp_users_tenant
  FOREIGN KEY (tenant_id) REFERENCES rfp_tenants(id);

-- 3. default tenant 생성
INSERT INTO rfp_tenants (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'pro')
ON CONFLICT DO NOTHING;

-- 4. 모든 테이블에 tenant_id 추가 (원격 DB 실제 테이블명)
ALTER TABLE rfp_projects              ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_rules                 ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_law_references        ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_qualification_checks  ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_vrb_reviews           ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_vrb_dept_reviews      ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_profit_loss           ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_inhouse_members       ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_partners              ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_documents             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_document_proof_items  ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_evaluation_criteria   ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_reference_table_items ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_proposals             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_reference_table_exports ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_price_simulations     ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_bid_results           ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_negotiations          ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_contracts             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_mail_logs             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_risk_logs             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_project_members       ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);

-- 5. 기존 데이터 default tenant 할당
UPDATE rfp_projects              SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_rules                 SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_law_references        SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_qualification_checks  SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_vrb_reviews           SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_vrb_dept_reviews      SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_profit_loss           SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_inhouse_members       SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_partners              SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_documents             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_document_proof_items  SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_evaluation_criteria   SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_reference_table_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_proposals             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_reference_table_exports SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_price_simulations     SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_bid_results           SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_negotiations          SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_contracts             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_mail_logs             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_risk_logs             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_users                 SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_project_members       SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- 6. NOT NULL 제약조건
ALTER TABLE rfp_projects              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_rules                 ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_law_references        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_qualification_checks  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_vrb_reviews           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_vrb_dept_reviews      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_profit_loss           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_inhouse_members       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_partners              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_documents             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_document_proof_items  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_evaluation_criteria   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_reference_table_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_proposals             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_reference_table_exports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_price_simulations     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_bid_results           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_negotiations          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_contracts             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_mail_logs             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_risk_logs             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_project_members       ALTER COLUMN tenant_id SET NOT NULL;

-- 7. tenant_id 인덱스
CREATE INDEX idx_rfp_projects_tenant            ON rfp_projects(tenant_id);
CREATE INDEX idx_rfp_rules_tenant               ON rfp_rules(tenant_id);
CREATE INDEX idx_rfp_law_refs_tenant            ON rfp_law_references(tenant_id);
CREATE INDEX idx_rfp_qual_checks_tenant         ON rfp_qualification_checks(tenant_id);
CREATE INDEX idx_rfp_vrb_reviews_tenant         ON rfp_vrb_reviews(tenant_id);
CREATE INDEX idx_rfp_vrb_dept_reviews_tenant    ON rfp_vrb_dept_reviews(tenant_id);
CREATE INDEX idx_rfp_profit_loss_tenant         ON rfp_profit_loss(tenant_id);
CREATE INDEX idx_rfp_inhouse_members_tenant     ON rfp_inhouse_members(tenant_id);
CREATE INDEX idx_rfp_partners_tenant            ON rfp_partners(tenant_id);
CREATE INDEX idx_rfp_documents_tenant           ON rfp_documents(tenant_id);
CREATE INDEX idx_rfp_doc_proof_items_tenant     ON rfp_document_proof_items(tenant_id);
CREATE INDEX idx_rfp_eval_criteria_tenant       ON rfp_evaluation_criteria(tenant_id);
CREATE INDEX idx_rfp_ref_table_items_tenant     ON rfp_reference_table_items(tenant_id);
CREATE INDEX idx_rfp_proposals_tenant           ON rfp_proposals(tenant_id);
CREATE INDEX idx_rfp_ref_table_exports_tenant   ON rfp_reference_table_exports(tenant_id);
CREATE INDEX idx_rfp_price_simulations_tenant   ON rfp_price_simulations(tenant_id);
CREATE INDEX idx_rfp_bid_results_tenant         ON rfp_bid_results(tenant_id);
CREATE INDEX idx_rfp_negotiations_tenant        ON rfp_negotiations(tenant_id);
CREATE INDEX idx_rfp_contracts_tenant           ON rfp_contracts(tenant_id);
CREATE INDEX idx_rfp_mail_logs_tenant           ON rfp_mail_logs(tenant_id);
CREATE INDEX idx_rfp_risk_logs_tenant           ON rfp_risk_logs(tenant_id);
CREATE INDEX idx_rfp_project_members_tenant     ON rfp_project_members(tenant_id);

-- 8. Helper function
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 9. RLS tenant_isolation 정책
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
      'rfp_project_members'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_%1$s" ON %1$I FOR ALL USING (tenant_id = current_tenant_id())',
      tbl
    );
  END LOOP;
END;
$$;

-- rfp_tenants 자체 RLS
ALTER TABLE rfp_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_self_read" ON rfp_tenants
  FOR SELECT USING (id = current_tenant_id());

-- 10. JWT custom claim hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_tenant_id UUID;
BEGIN
  claims := event->'claims';

  SELECT tenant_id INTO user_tenant_id
  FROM rfp_users
  WHERE auth_uid = (event->>'user_id')::uuid
  LIMIT 1;

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
    claims := jsonb_set(claims, '{user_role}', (
      SELECT to_jsonb(role) FROM rfp_users
      WHERE auth_uid = (event->>'user_id')::uuid LIMIT 1
    ));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
