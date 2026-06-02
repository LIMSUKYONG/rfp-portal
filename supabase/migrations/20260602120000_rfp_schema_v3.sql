-- ================================================
-- 핸디소프트 RFP 입찰 자동화 시스템 DB 스키마 v3.0
-- ================================================

CREATE TABLE projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(20) UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  client              TEXT NOT NULL,
  project_type        VARCHAR(20),
  category            VARCHAR(20),
  budget_amount       BIGINT,
  contract_method     TEXT,
  bid_deadline        DATE,
  announcement_date   DATE,
  project_period      TEXT,
  warranty_period     TEXT,
  phase               VARCHAR(30) DEFAULT 'rfp_registered',
  vrb_deadline        DATE,
  vrb_deadline_days   INT DEFAULT 3,
  abandoned_at        TIMESTAMPTZ,
  abandoned_reason    VARCHAR(50),
  abandoned_note      TEXT,
  abandoned_phase     VARCHAR(30),
  sales_rep           TEXT,
  pm                  TEXT,
  rfp_file_url        TEXT,
  rfp_file_size_mb    NUMERIC(6,1),
  rfp_parsed_at       TIMESTAMPTZ,
  rfp_parse_status    VARCHAR(20) DEFAULT 'pending',
  lukas_project_id    VARCHAR(50),
  lukas_synced_at     TIMESTAMPTZ,
  lukas_pipeline_data JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rfp_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  rule_type       VARCHAR(60) NOT NULL,
  rule_target     TEXT,
  condition_type  VARCHAR(30),
  condition_value JSONB NOT NULL,
  source_type     VARCHAR(20) NOT NULL DEFAULT 'rfp_direct',
  source_text     TEXT,
  source_page     VARCHAR(20),
  law_reference   TEXT,
  law_url         TEXT,
  law_verified_at TIMESTAMPTZ,
  is_verified     BOOLEAN DEFAULT FALSE,
  needs_review    BOOLEAN DEFAULT FALSE,
  review_note     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rfp_law_references (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  law_name        TEXT NOT NULL,
  law_number      TEXT,
  law_date        DATE,
  law_url         TEXT,
  rfp_context     TEXT,
  research_status VARCHAR(20) DEFAULT 'pending',
  researched_at   TIMESTAMPTZ,
  research_summary TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE qualification_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  item_code       VARCHAR(50),
  item_name       TEXT NOT NULL,
  item_type       VARCHAR(30),
  condition_text  TEXT,
  rfp_rule_id     UUID REFERENCES rfp_rules(id),
  check_result    VARCHAR(10),
  check_note      TEXT,
  checked_by      TEXT,
  checked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vrb_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  vrb_type            VARCHAR(20),
  vrb_round           INT DEFAULT 1,
  vrb_deadline        DATE,
  meeting_date        DATE,
  attendees           TEXT,
  vrb_proceed         BOOLEAN,
  proposal_proceed    BOOLEAN,
  bid_proceed         BOOLEAN,
  meeting_result      TEXT,
  risk_level_avg      NUMERIC(3,1),
  risk_grade          VARCHAR(20),
  strategic_reason    TEXT,
  lukas_submitted     BOOLEAN DEFAULT FALSE,
  lukas_submitted_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vrb_dept_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vrb_id          UUID REFERENCES vrb_reviews(id) ON DELETE CASCADE,
  dept_type       VARCHAR(30) NOT NULL,
  proceed_opinion VARCHAR(20),
  prerequisites   TEXT,
  risk_factors    TEXT,
  risk_solutions  TEXT,
  risk_level      INT CHECK (risk_level BETWEEN 1 AND 5),
  discussion_points TEXT,
  reviewer        TEXT,
  reviewed_at     TIMESTAMPTZ,
  win_strategy    TEXT,
  strength        TEXT,
  weakness        TEXT,
  strength_plan   TEXT,
  weakness_plan   TEXT,
  competitor_info JSONB,
  proposal_scope  TEXT,
  proposal_strategy TEXT,
  dev_items       TEXT,
  required_mm     NUMERIC(5,1),
  delivery_scope  TEXT,
  expected_team   TEXT,
  purchase_amount BIGINT,
  purchase_risks  TEXT,
  revenue_review  TEXT,
  cost_review     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profit_loss (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  vrb_id              UUID REFERENCES vrb_reviews(id),
  proposal_price      BIGINT,
  expected_price      BIGINT,
  license_cost        BIGINT DEFAULT 0,
  inhouse_labor_cost  BIGINT DEFAULT 0,
  outsource_cost      BIGINT DEFAULT 0,
  goods_cost          BIGINT DEFAULT 0,
  direct_expense      BIGINT DEFAULT 0,
  contingency         BIGINT DEFAULT 0,
  other_cost          BIGINT DEFAULT 0,
  direct_purchase_amount BIGINT DEFAULT 0,
  total_cost          BIGINT GENERATED ALWAYS AS (
    license_cost + inhouse_labor_cost + outsource_cost +
    goods_cost + direct_expense + contingency + other_cost
  ) STORED,
  pjt_profit          BIGINT GENERATED ALWAYS AS (
    COALESCE(proposal_price,0) - (
      license_cost + inhouse_labor_cost + outsource_cost +
      goods_cost + direct_expense + contingency + other_cost
    )
  ) STORED,
  target_margin_rate  NUMERIC(5,3),
  pjt_profit_rate     NUMERIC(5,3) GENERATED ALWAYS AS (
    CASE WHEN COALESCE(proposal_price,0) = 0 THEN 0
    ELSE ROUND((COALESCE(proposal_price,0) - (
      license_cost + inhouse_labor_cost + outsource_cost +
      goods_cost + direct_expense + contingency + other_cost
    ))::NUMERIC / proposal_price, 4)
    END
  ) STORED,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inhouse_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  member_name     TEXT,
  grade           VARCHAR(20),
  unit_price      BIGINT,
  mm              NUMERIC(4,1),
  is_resident     BOOLEAN DEFAULT FALSE,
  region          VARCHAR(20),
  role            TEXT,
  cost            BIGINT GENERATED ALWAYS AS (ROUND(unit_price * mm)) STORED,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE partners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  partner_type        VARCHAR(20) NOT NULL,
  company_name        TEXT NOT NULL,
  is_sme_sw           BOOLEAN DEFAULT FALSE,
  contact_email       TEXT,
  share_rate          NUMERIC(5,2),
  share_amount        BIGINT,
  sub_amount          BIGINT,
  sub_rate            NUMERIC(5,2),
  std_contract_used   BOOLEAN,
  mm                  NUMERIC(4,1),
  unit_price          BIGINT,
  work_scope          TEXT,
  goods_items         JSONB,
  goods_amount        BIGINT,
  is_direct_purchase  BOOLEAN DEFAULT FALSE,
  status              VARCHAR(20) DEFAULT 'registered',
  last_mail_sent_at   TIMESTAMPTZ,
  mail_sent_count     INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  partner_id          UUID REFERENCES partners(id),
  doc_category        VARCHAR(30),
  doc_name            TEXT NOT NULL,
  form_number         VARCHAR(20),
  is_required         BOOLEAN DEFAULT TRUE,
  rfp_rule_id         UUID REFERENCES rfp_rules(id),
  submit_timing       VARCHAR(20),
  file_url            TEXT,
  file_size_mb        NUMERIC(6,1),
  file_type           VARCHAR(20),
  file_uploaded_at    TIMESTAMPTZ,
  upload_method       VARCHAR(20) DEFAULT 'direct',
  ai_issue_date       DATE,
  ai_expiry_date      DATE,
  ai_extracted_data   JSONB,
  ai_extract_status   VARCHAR(20),
  validation_status   VARCHAR(20),
  validation_message  TEXT,
  validation_source   VARCHAR(20),
  validated_at        TIMESTAMPTZ,
  linked_score_item   VARCHAR(50),
  calculated_score    NUMERIC(4,2),
  needs_review        BOOLEAN DEFAULT FALSE,
  review_reason       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_proof_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
  rfp_rule_id     UUID REFERENCES rfp_rules(id),
  item_name       TEXT NOT NULL,
  item_section    TEXT,
  max_score       NUMERIC(5,1),
  condition_text  TEXT,
  fail_result     TEXT,
  proof_file_url  TEXT,
  proof_status    VARCHAR(20) DEFAULT 'pending',
  calculated_score NUMERIC(5,1),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE evaluation_criteria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  rfp_rule_id     UUID REFERENCES rfp_rules(id),
  requirement_id  VARCHAR(30),
  requirement_category VARCHAR(20),
  eval_type       VARCHAR(20),
  domain          TEXT,
  item_name       TEXT NOT NULL,
  sub_items       TEXT,
  max_score       NUMERIC(5,1),
  grade_formula   JSONB,
  calc_formula    TEXT,
  calc_logic      JSONB,
  linked_doc_type VARCHAR(30),
  expected_grade  VARCHAR(10),
  expected_score  NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reference_table_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  eval_criteria_id UUID REFERENCES evaluation_criteria(id),
  requirement_id  VARCHAR(30),
  requirement_category VARCHAR(20),
  requirement_name TEXT NOT NULL,
  impl_type       VARCHAR(30),
  impl_type_display VARCHAR(10),
  proposal_page   VARCHAR(50),
  proposal_section TEXT,
  description     TEXT,
  ai_mapped       BOOLEAN DEFAULT FALSE,
  ai_confidence   NUMERIC(3,2),
  ai_mapped_at    TIMESTAMPTZ,
  reviewed        BOOLEAN DEFAULT FALSE,
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  sort_order      INT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  version         INT DEFAULT 1,
  file_url        TEXT,
  file_size_mb    NUMERIC(6,1),
  uploaded_at     TIMESTAMPTZ,
  ai_evaluated_at TIMESTAMPTZ,
  coverage_rate   NUMERIC(5,2),
  weak_items      JSONB,
  recommendations JSONB,
  page_count      INT,
  format_valid    BOOLEAN,
  format_issues   JSONB,
  has_reference_table  BOOLEAN,
  has_glossary         BOOLEAN,
  vague_expr_count     INT,
  qualitative_score    NUMERIC(5,2),
  quantitative_score   NUMERIC(5,2),
  tech_score_total     NUMERIC(5,2),
  threshold_pct        NUMERIC(5,2),
  threshold_score      NUMERIC(5,2),
  meets_threshold      BOOLEAN,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reference_table_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  export_format   VARCHAR(10),
  file_url        TEXT,
  exported_by     TEXT,
  exported_at     TIMESTAMPTZ DEFAULT now(),
  item_count      INT,
  reviewed_count  INT
);

CREATE TABLE price_simulations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID REFERENCES projects(id) ON DELETE CASCADE,
  tech_score            NUMERIC(5,2),
  budget_amount         BIGINT,
  price_formula         JSONB,
  negotiation_rules     JSONB,
  scenarios             JSONB,
  competitor_tech_score NUMERIC(5,2),
  min_win_price         BIGINT,
  selected_price        BIGINT,
  selected_at           TIMESTAMPTZ,
  selected_by           TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bid_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID REFERENCES projects(id) ON DELETE CASCADE,
  submitted_price       BIGINT,
  submitted_at          TIMESTAMPTZ,
  result_type           VARCHAR(20),
  actual_tech_score     NUMERIC(5,2),
  actual_price_score    NUMERIC(5,2),
  actual_total_score    NUMERIC(5,2),
  rank                  INT,
  predicted_tech_score  NUMERIC(5,2),
  score_diff            NUMERIC(5,2),
  loss_reason           VARCHAR(30),
  loss_note             TEXT,
  notified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE negotiations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  negotiation_round   INT DEFAULT 1,
  negotiation_date    DATE,
  deadline            DATE,
  negotiation_status  VARCHAR(20),
  scope_changes       TEXT,
  price_changes       TEXT,
  final_amount        BIGINT,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contracts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID REFERENCES projects(id) ON DELETE CASCADE,
  contract_number       TEXT,
  contract_amount       BIGINT,
  contract_date         DATE,
  start_date            DATE,
  end_date              DATE,
  warranty_end_date     DATE,
  advance_rate          NUMERIC(5,2),
  advance_amount        BIGINT,
  interim_rate          NUMERIC(5,2),
  interim_amount        BIGINT,
  final_rate            NUMERIC(5,2),
  final_amount          BIGINT,
  contract_file_url     TEXT,
  contract_file_size_mb NUMERIC(6,1),
  lukas_updated         BOOLEAN DEFAULT FALSE,
  deal_room_closed      BOOLEAN DEFAULT FALSE,
  registered_as_experience BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mail_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  partner_id      UUID REFERENCES partners(id),
  mail_type       VARCHAR(30),
  recipient_email TEXT,
  recipient_name  TEXT,
  subject         TEXT,
  body_summary    TEXT,
  attachments     JSONB,
  sent_at         TIMESTAMPTZ DEFAULT now(),
  sent_by         TEXT
);

CREATE TABLE risk_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase           VARCHAR(30),
  risk_type       VARCHAR(40),
  risk_level      VARCHAR(10),
  risk_title      TEXT,
  risk_message    TEXT,
  rfp_rule_id     UUID REFERENCES rfp_rules(id),
  auto_detected   BOOLEAN DEFAULT TRUE,
  is_resolved     BOOLEAN DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  resolved_note   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_projects_phase           ON projects(phase);
CREATE INDEX idx_projects_deadline        ON projects(bid_deadline);
CREATE INDEX idx_rfp_rules_project        ON rfp_rules(project_id);
CREATE INDEX idx_rfp_rules_type           ON rfp_rules(rule_type);
CREATE INDEX idx_rfp_rules_needs_review   ON rfp_rules(needs_review);
CREATE INDEX idx_partners_project         ON partners(project_id);
CREATE INDEX idx_partners_type            ON partners(partner_type);
CREATE INDEX idx_documents_project        ON documents(project_id);
CREATE INDEX idx_documents_status         ON documents(validation_status);
CREATE INDEX idx_eval_criteria_project    ON evaluation_criteria(project_id);
CREATE INDEX idx_eval_criteria_req_id     ON evaluation_criteria(requirement_id);
CREATE INDEX idx_ref_table_project        ON reference_table_items(project_id);
CREATE INDEX idx_ref_table_req_id         ON reference_table_items(requirement_id);
CREATE INDEX idx_ref_table_reviewed       ON reference_table_items(reviewed);
CREATE INDEX idx_risk_logs_project        ON risk_logs(project_id);
CREATE INDEX idx_risk_logs_resolved       ON risk_logs(is_resolved);
CREATE INDEX idx_law_refs_project         ON rfp_law_references(project_id);

-- 트리거 1
CREATE OR REPLACE FUNCTION update_profit_loss_from_partners()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profit_loss pl SET
    outsource_cost = (SELECT COALESCE(SUM(CASE WHEN p.partner_type='subcontract' THEN COALESCE(p.sub_amount,ROUND(COALESCE(p.unit_price,0)*COALESCE(p.mm,0))) ELSE 0 END),0) FROM partners p WHERE p.project_id=NEW.project_id AND p.is_direct_purchase=FALSE),
    goods_cost = (SELECT COALESCE(SUM(CASE WHEN p.partner_type='goods_supply' AND p.is_direct_purchase=FALSE THEN COALESCE(p.goods_amount,0) ELSE 0 END),0) FROM partners p WHERE p.project_id=NEW.project_id),
    direct_purchase_amount = (SELECT COALESCE(SUM(COALESCE(p.goods_amount,0)),0) FROM partners p WHERE p.project_id=NEW.project_id AND p.is_direct_purchase=TRUE),
    updated_at = now()
  WHERE pl.project_id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partners_update_pl
AFTER INSERT OR UPDATE ON partners
FOR EACH ROW EXECUTE FUNCTION update_profit_loss_from_partners();

-- 트리거 2
CREATE OR REPLACE FUNCTION update_inhouse_labor_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profit_loss pl SET
    inhouse_labor_cost = (SELECT COALESCE(SUM(unit_price * mm),0) FROM inhouse_members WHERE project_id=NEW.project_id),
    updated_at = now()
  WHERE pl.project_id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inhouse_update_pl
AFTER INSERT OR UPDATE ON inhouse_members
FOR EACH ROW EXECUTE FUNCTION update_inhouse_labor_cost();

-- 트리거 3
CREATE OR REPLACE FUNCTION update_sub_rate()
RETURNS TRIGGER AS $$
DECLARE v_budget BIGINT;
BEGIN
  SELECT budget_amount INTO v_budget FROM projects WHERE id = NEW.project_id;
  IF NEW.partner_type = 'subcontract' AND v_budget > 0 THEN
    NEW.sub_rate := ROUND(COALESCE(NEW.sub_amount,0)::NUMERIC / v_budget * 100, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_sub_rate
BEFORE INSERT OR UPDATE ON partners
FOR EACH ROW EXECUTE FUNCTION update_sub_rate();

-- 트리거 4
CREATE OR REPLACE FUNCTION flag_doc_needs_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rfp_rule_id IS NULL THEN
    NEW.needs_review := TRUE;
    NEW.review_reason := 'RFP에서 유효기간 조건을 찾지 못했습니다. 직접 확인해주세요.';
    NEW.validation_status := 'needs_review';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doc_flag_review
BEFORE INSERT ON documents
FOR EACH ROW EXECUTE FUNCTION flag_doc_needs_review();

-- 뷰 1
CREATE VIEW project_completion AS
SELECT p.id, p.name, p.phase, p.bid_deadline, p.vrb_deadline,
  DATE_PART('day', p.bid_deadline::TIMESTAMP - now()) AS dday,
  DATE_PART('day', p.vrb_deadline::TIMESTAMP - now()) AS vrb_dday,
  ROUND(COUNT(CASE WHEN qc.check_result='pass' THEN 1 END)::NUMERIC / NULLIF(COUNT(qc.id),0)*100,0) AS qualification_pct,
  ROUND(COUNT(CASE WHEN d.validation_status='valid' THEN 1 END)::NUMERIC / NULLIF(COUNT(d.id),0)*100,0) AS document_pct,
  ROUND(COUNT(CASE WHEN pt.status='docs_complete' THEN 1 END)::NUMERIC / NULLIF(COUNT(pt.id),0)*100,0) AS partner_pct,
  ROUND(COUNT(CASE WHEN rt.reviewed=TRUE THEN 1 END)::NUMERIC / NULLIF(COUNT(rt.id),0)*100,0) AS ref_table_pct,
  COUNT(CASE WHEN r.needs_review=TRUE THEN 1 END) AS rules_needs_review,
  prop.tech_score_total, prop.meets_threshold, prop.threshold_score,
  prop.has_reference_table, prop.has_glossary, prop.vague_expr_count,
  COUNT(CASE WHEN rl.risk_level='danger' AND NOT rl.is_resolved THEN 1 END) AS danger_count,
  COUNT(CASE WHEN rl.risk_level='warning' AND NOT rl.is_resolved THEN 1 END) AS warning_count
FROM projects p
LEFT JOIN qualification_checks qc ON qc.project_id=p.id
LEFT JOIN documents d ON d.project_id=p.id
LEFT JOIN partners pt ON pt.project_id=p.id
LEFT JOIN proposals prop ON prop.project_id=p.id
LEFT JOIN risk_logs rl ON rl.project_id=p.id
LEFT JOIN rfp_rules r ON r.project_id=p.id
LEFT JOIN reference_table_items rt ON rt.project_id=p.id
GROUP BY p.id,p.name,p.phase,p.bid_deadline,p.vrb_deadline,
  prop.tech_score_total,prop.meets_threshold,prop.threshold_score,
  prop.has_reference_table,prop.has_glossary,prop.vague_expr_count;

-- 뷰 2
CREATE VIEW experience_records AS
SELECT p.id AS project_id, p.name, p.client, p.category,
  c.contract_amount, c.contract_date, c.end_date, p.sales_rep, p.pm
FROM projects p JOIN contracts c ON c.project_id=p.id
WHERE c.registered_as_experience=TRUE AND p.phase='contract_signed';

-- 뷰 3
CREATE VIEW reference_table_status AS
SELECT rt.project_id, p.name AS project_name,
  COUNT(*) AS total_items,
  COUNT(CASE WHEN rt.reviewed=TRUE THEN 1 END) AS reviewed_items,
  COUNT(CASE WHEN rt.reviewed=FALSE THEN 1 END) AS pending_items,
  COUNT(CASE WHEN rt.ai_mapped=TRUE THEN 1 END) AS ai_mapped_items,
  ROUND(COUNT(CASE WHEN rt.reviewed=TRUE THEN 1 END)::NUMERIC / NULLIF(COUNT(*),0)*100,0) AS completion_pct
FROM reference_table_items rt
JOIN projects p ON p.id=rt.project_id
GROUP BY rt.project_id, p.name;

-- 뷰 4
CREATE VIEW rules_pending_review AS
SELECT r.id, r.project_id, p.name AS project_name,
  r.rule_type, r.rule_target, r.source_type, r.source_text,
  r.needs_review, r.review_note, r.created_at
FROM rfp_rules r JOIN projects p ON p.id=r.project_id
WHERE r.needs_review=TRUE AND r.is_verified=FALSE
ORDER BY r.created_at DESC;
