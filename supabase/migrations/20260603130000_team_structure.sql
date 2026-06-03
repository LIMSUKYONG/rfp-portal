-- ================================================
-- 작업1: 팀 구조 — 역할 기반 접근 제어
-- ================================================

-- 1. rfp_users 테이블
CREATE TABLE rfp_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid   UUID UNIQUE REFERENCES auth.users(id),
  tenant_id  UUID NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  role       VARCHAR(10) NOT NULL DEFAULT 'member'
             CHECK (role IN ('pm', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rfp_users_tenant ON rfp_users(tenant_id);
CREATE INDEX idx_rfp_users_auth   ON rfp_users(auth_uid);

-- 2. rfp_project_members 테이블
CREATE TABLE rfp_project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES rfp_users(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'contributor'
             CHECK (role IN ('owner', 'contributor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_user    ON rfp_project_members(user_id);
CREATE INDEX idx_project_members_project ON rfp_project_members(project_id);

-- 3. projects 테이블에 승인 워크플로우 컬럼 추가
ALTER TABLE projects
  ADD COLUMN review_status VARCHAR(20) DEFAULT 'draft'
             CHECK (review_status IN ('draft', 'requested', 'approved', 'rejected')),
  ADD COLUMN requested_at  TIMESTAMPTZ,
  ADD COLUMN approved_at   TIMESTAMPTZ,
  ADD COLUMN approved_by   UUID REFERENCES rfp_users(id);

-- 4. RLS 활성화
ALTER TABLE rfp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_project_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 — rfp_users
CREATE POLICY "users_own_read" ON rfp_users
  FOR SELECT USING (auth_uid = auth.uid());

CREATE POLICY "users_pm_read_all" ON rfp_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rfp_users u
      WHERE u.auth_uid = auth.uid() AND u.role = 'pm'
        AND u.tenant_id = rfp_users.tenant_id
    )
  );

-- 6. RLS 정책 — rfp_project_members
CREATE POLICY "members_own_projects" ON rfp_project_members
  FOR SELECT USING (
    user_id = (SELECT id FROM rfp_users WHERE auth_uid = auth.uid())
  );

CREATE POLICY "members_pm_all" ON rfp_project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rfp_users u
      WHERE u.auth_uid = auth.uid() AND u.role = 'pm'
    )
  );

-- 7. RLS 정책 — projects (member 제한)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_member_access" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rfp_project_members pm
      JOIN rfp_users u ON u.id = pm.user_id
      WHERE pm.project_id = projects.id AND u.auth_uid = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rfp_users u
      WHERE u.auth_uid = auth.uid() AND u.role = 'pm'
    )
  );

CREATE POLICY "projects_pm_modify" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rfp_users u
      WHERE u.auth_uid = auth.uid() AND u.role = 'pm'
    )
  );
