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

-- 3. 기존 데이터 마이그레이션용 default tenant 생성
INSERT INTO rfp_tenants (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'pro')
ON CONFLICT DO NOTHING;

-- 4. 모든 테이블에 tenant_id 추가 (실제 테이블명 사용)
ALTER TABLE projects                ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_rules               ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_law_references      ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE qualification_checks    ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE vrb_reviews             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE vrb_dept_reviews        ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE profit_loss             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE inhouse_members         ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE partners                ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE documents               ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE document_proof_items    ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE evaluation_criteria     ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE reference_table_items   ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE proposals               ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE reference_table_exports ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE price_simulations       ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE bid_results             ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE negotiations            ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE contracts               ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE mail_logs               ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE risk_logs               ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);
ALTER TABLE rfp_project_members     ADD COLUMN tenant_id UUID REFERENCES rfp_tenants(id);

-- 5. 기존 데이터 default tenant 할당
UPDATE projects                SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_rules               SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_law_references      SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE qualification_checks    SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE vrb_reviews             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE vrb_dept_reviews        SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE profit_loss             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE inhouse_members         SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE partners                SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE documents               SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE document_proof_items    SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE evaluation_criteria     SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE reference_table_items   SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE proposals               SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE reference_table_exports SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE price_simulations       SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE bid_results             SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE negotiations            SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE contracts               SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE mail_logs               SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE risk_logs               SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_users               SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE rfp_project_members     SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- 6. NOT NULL 제약조건 추가
ALTER TABLE projects                ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_rules               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_law_references      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE qualification_checks    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE vrb_reviews             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE vrb_dept_reviews        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE profit_loss             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE inhouse_members         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE partners                ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE documents               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE document_proof_items    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE evaluation_criteria     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE reference_table_items   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE proposals               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE reference_table_exports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE price_simulations       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE bid_results             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE negotiations            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE contracts               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE mail_logs               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE risk_logs               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rfp_project_members     ALTER COLUMN tenant_id SET NOT NULL;

-- 7. tenant_id 인덱스 (22개 테이블)
CREATE INDEX idx_projects_tenant            ON projects(tenant_id);
CREATE INDEX idx_rfp_rules_tenant           ON rfp_rules(tenant_id);
CREATE INDEX idx_law_refs_tenant            ON rfp_law_references(tenant_id);
CREATE INDEX idx_qual_checks_tenant         ON qualification_checks(tenant_id);
CREATE INDEX idx_vrb_reviews_tenant         ON vrb_reviews(tenant_id);
CREATE INDEX idx_vrb_dept_reviews_tenant    ON vrb_dept_reviews(tenant_id);
CREATE INDEX idx_profit_loss_tenant         ON profit_loss(tenant_id);
CREATE INDEX idx_inhouse_members_tenant     ON inhouse_members(tenant_id);
CREATE INDEX idx_partners_tenant            ON partners(tenant_id);
CREATE INDEX idx_documents_tenant           ON documents(tenant_id);
CREATE INDEX idx_doc_proof_items_tenant     ON document_proof_items(tenant_id);
CREATE INDEX idx_eval_criteria_tenant       ON evaluation_criteria(tenant_id);
CREATE INDEX idx_ref_table_items_tenant     ON reference_table_items(tenant_id);
CREATE INDEX idx_proposals_tenant           ON proposals(tenant_id);
CREATE INDEX idx_ref_table_exports_tenant   ON reference_table_exports(tenant_id);
CREATE INDEX idx_price_simulations_tenant   ON price_simulations(tenant_id);
CREATE INDEX idx_bid_results_tenant         ON bid_results(tenant_id);
CREATE INDEX idx_negotiations_tenant        ON negotiations(tenant_id);
CREATE INDEX idx_contracts_tenant           ON contracts(tenant_id);
CREATE INDEX idx_mail_logs_tenant           ON mail_logs(tenant_id);
CREATE INDEX idx_risk_logs_tenant           ON risk_logs(tenant_id);
CREATE INDEX idx_project_members_tenant     ON rfp_project_members(tenant_id);

-- 8. Helper function: 현재 사용자의 tenant_id
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 9. RLS tenant_isolation 정책 (모든 테이블)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'projects', 'rfp_rules', 'rfp_law_references',
      'qualification_checks', 'vrb_reviews', 'vrb_dept_reviews',
      'profit_loss', 'inhouse_members', 'partners',
      'documents', 'document_proof_items', 'evaluation_criteria',
      'reference_table_items', 'proposals', 'reference_table_exports',
      'price_simulations', 'bid_results', 'negotiations',
      'contracts', 'mail_logs', 'risk_logs',
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
