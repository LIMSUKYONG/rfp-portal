-- ================================================
-- RLS 무한루프 수정: is_superadmin() → SECURITY DEFINER
-- rfp_users 자체 정책에서 is_superadmin() 호출 제거
-- ================================================

-- 1. is_superadmin() 함수를 SECURITY DEFINER + STABLE로 재생성
--    SECURITY DEFINER = 함수 소유자(postgres) 권한으로 실행 → RLS 우회
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM rfp_users
    WHERE auth_uid = auth.uid()
    AND role = 'superadmin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. rfp_users 기존 정책 정리 (무한루프 원인)
DROP POLICY IF EXISTS "superadmin_all_rfp_users" ON rfp_users;
DROP POLICY IF EXISTS "users_own_read" ON rfp_users;
DROP POLICY IF EXISTS "users_pm_read_all" ON rfp_users;
DROP POLICY IF EXISTS "users_own_access" ON rfp_users;
DROP POLICY IF EXISTS "superadmin_bypass" ON rfp_users;

-- 3. rfp_users 새 정책: auth.uid() 직접 비교 (함수 호출 없음)
--    자기 자신 접근
CREATE POLICY "users_self_access" ON rfp_users
  FOR ALL USING (auth_uid = auth.uid());

--    같은 테넌트 PM은 팀원 조회 가능 (직접 서브쿼리, 함수 아님)
CREATE POLICY "users_pm_tenant_read" ON rfp_users
  FOR SELECT USING (
    tenant_id IN (
      SELECT u2.tenant_id FROM rfp_users u2
      WHERE u2.auth_uid = auth.uid() AND u2.role IN ('pm', 'superadmin')
    )
  );

--    superadmin은 전체 접근 (SECURITY DEFINER 함수 사용 — 안전)
CREATE POLICY "users_superadmin_all" ON rfp_users
  FOR ALL USING (is_superadmin());
