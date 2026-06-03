# HANDOVER — RFP 포털 향후 작업

---

## 봉구 향후 작업 (화면 개발 완료 후 진행)

### [작업 1] 팀 구조 (역할 기반 접근 제어)

**목적:** PM + 팀원 멀티유저 운영

#### DB 변경

- `rfp_users` 테이블 생성
  - `id`, `tenant_id`, `email`, `name`, `role`: `pm` | `member`, `created_at`
- `rfp_project_members` 테이블 생성
  - `project_id`, `user_id`, `role`: `owner` | `contributor` | `viewer`

#### RLS 정책 수정

- 모든 `rfp_` 테이블 RLS 정책 수정
  - 팀원: 자신이 배정된 프로젝트만 접근
  - PM: 전체 접근 + 승인 권한

#### 승인 워크플로우

- `rfp_projects`에 컬럼 추가:
  - `review_status`: `draft` | `requested` | `approved` | `rejected`
  - `requested_at`, `approved_at`, `approved_by`

#### 인증 연동

- Supabase Auth 연동 (이미 설정됨 — RLS `user_id` 연결만 추가)

---

### [작업 2] 멀티테넌트 구조 (SaaS 판매 대비)

**목적:** 회사별 완전 데이터 분리 — 외부 판매 가능한 구조

> ⚠️ 작업 1(팀 구조) 완료 후 진행

#### DB 변경

- `rfp_tenants` 테이블 생성
  - `id`, `name`, `plan`: `free` | `pro` | `enterprise`, `created_at`
- 모든 `rfp_` 테이블에 `tenant_id` UUID 컬럼 추가
- 인덱스 추가: 모든 테이블 `tenant_id` 인덱스

#### RLS 정책 수정

- 모든 RLS 정책 수정
  - `tenant_id = auth.jwt()->>tenant_id` 조건 추가
- Supabase Auth custom claim에 `tenant_id` 추가
  - JWT에 `tenant_id` 포함 → 모든 쿼리 자동 필터링

#### 테넌트 온보딩 API

- `POST /api/tenants/register` — 회사 가입 + 테넌트 자동 생성
- `POST /api/tenants/invite` — PM이 팀원 초대

#### 주의사항

- 기존 데이터 마이그레이션 스크립트 포함 필요
- 멀티테넌트 전환 후 전체 E2E 재실행 필수

---

**추가일:** 2026-06-03 | **PM:** 임석용
