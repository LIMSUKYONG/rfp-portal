-- ================================================
-- 뷰 생성 (rfp_ prefix 테이블 기준)
-- ================================================

CREATE OR REPLACE VIEW rfp_project_completion AS
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
FROM rfp_projects p
LEFT JOIN rfp_qualification_checks qc ON qc.project_id=p.id
LEFT JOIN rfp_documents d ON d.project_id=p.id
LEFT JOIN rfp_partners pt ON pt.project_id=p.id
LEFT JOIN rfp_proposals prop ON prop.project_id=p.id
LEFT JOIN rfp_risk_logs rl ON rl.project_id=p.id
LEFT JOIN rfp_rules r ON r.project_id=p.id
LEFT JOIN rfp_reference_table_items rt ON rt.project_id=p.id
GROUP BY p.id,p.name,p.phase,p.bid_deadline,p.vrb_deadline,
  prop.tech_score_total,prop.meets_threshold,prop.threshold_score,
  prop.has_reference_table,prop.has_glossary,prop.vague_expr_count;

CREATE OR REPLACE VIEW rfp_experience_records AS
SELECT p.id AS project_id, p.name, p.client, p.category,
  c.contract_amount, c.contract_date, c.end_date, p.sales_rep, p.pm
FROM rfp_projects p JOIN rfp_contracts c ON c.project_id=p.id
WHERE c.registered_as_experience=TRUE AND p.phase='contract_signed';

CREATE OR REPLACE VIEW rfp_reference_table_status AS
SELECT rt.project_id, p.name AS project_name,
  COUNT(*) AS total_items,
  COUNT(CASE WHEN rt.reviewed=TRUE THEN 1 END) AS reviewed_items,
  COUNT(CASE WHEN rt.reviewed=FALSE THEN 1 END) AS pending_items,
  COUNT(CASE WHEN rt.ai_mapped=TRUE THEN 1 END) AS ai_mapped_items,
  ROUND(COUNT(CASE WHEN rt.reviewed=TRUE THEN 1 END)::NUMERIC / NULLIF(COUNT(*),0)*100,0) AS completion_pct
FROM rfp_reference_table_items rt
JOIN rfp_projects p ON p.id=rt.project_id
GROUP BY rt.project_id, p.name;

CREATE OR REPLACE VIEW rfp_rules_pending_review AS
SELECT r.id, r.project_id, p.name AS project_name,
  r.rule_type, r.rule_target, r.source_type, r.source_text,
  r.needs_review, r.review_note, r.created_at
FROM rfp_rules r JOIN rfp_projects p ON p.id=r.project_id
WHERE r.needs_review=TRUE AND r.is_verified=FALSE
ORDER BY r.created_at DESC;
