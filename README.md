# rfp-portal

RFP 입찰 자동화 시스템

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- src/ 폴더 구조

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # macOS / Linux
copy .env.local.example .env.local # Windows (cmd)
npm run dev
```

개발 서버: http://localhost:3000

## Scripts

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드된 앱 실행 |
| `npm run lint` | ESLint |

## 개발 환경

이 프로젝트는 Windows(사무실) / macOS(집) 두 환경에서 번갈아 작업합니다.
줄바꿈은 `.gitattributes`로 LF 정규화되며, npm 스크립트는 양쪽 모두에서 동작합니다.
