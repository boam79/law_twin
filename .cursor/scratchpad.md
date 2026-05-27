# LawTwin — Planner / Executor 진행 기록

## Background and Motivation

- 구어체 유저 스토리 법령 검색 품질 개선 및 P1~P6 Executor 일괄 구현 완료 (2026-05-25).
- Google AI Studio **모델별 비율 제한** 기준 **Gemini Planner 모드** 정책 수립.
- 고도화 로드맵(A~G) Executor 일괄 완료 (2026-05-26).

## 현재 구현 스냅샷 (코드·문서 기준)

| 영역 | 확인된 사실 |
|------|-------------|
| 스택 | Next.js 15, React 19, JS, `"type": "module"` |
| 분석 엔진 | `lib/analyzer.js`, `lib/topicFallbacks.js`, `lib/lawData.js` |
| 법제처 | `lawSearch.do`, emergency 재시도, `LAW_API_MAX_QUERIES` |
| Gemini | 요약 1회; `GEMINI_PLANNER_MODE=on` 시 Planner 1회·요약 자동 off |
| UI | `app/page.js` ~270줄, `app/components/` 19파일 |
| 검증 | `npm test` 14케이스, PR: simulate+audit 로컬, casual-audit 프로덕션 |
| 레이트리밋 | Middleware in-memory, `ANALYZE_RATE_LIMIT` env |
| 로그 | `lib/analyzeLog.js` JSON 한 줄 (`ANALYZE_STRUCTURED_LOG`) |

## 고도화 로드맵 (A~G) — 잔여만

| ID | 제안 | 상태 |
|----|------|------|
| B1 | 조문 API | 별도 스펙 후 |
| G2 | 분석 이력·공유 (DB) | 별도 기획 |
| G3 | 지자체 조례 API | 별도 프로젝트 |

### 완료 요약 (A~G)

- A2, A3, B2, B3, C2, D1–D3, E1, E2, F1–F3, G1

## High-level Task Breakdown (Executor)

| # | 작업 | 상태 |
|---|------|------|
| E-6 ~ E-11 | topicFallbacks, Planner, CI simulate, G1 scroll, E1 1~3차 | 완료 |
| E-12 | B2 `audit:casual:ci` + PR CI | **완료** |
| E-13 | F1–F3 README·로그·max queries | **완료** |
| E-14 | LawList·Detail·Source 컴포넌트 | **완료** |

## Project Status Board

- [x] 로드맵 Executor 일괄 (0.5.6 → 0.5.12)
- [ ] 프로덕션 `LAW_TWIN_AUDIT_STRICT=1` 배포 후 재확인 (사용자/배포)

## Current Status / Progress Tracking

- **v0.5.12**: B2 PR audit, F1–F3, AnalyzeDetailView·LawListPanel, `lawApiConfig`, `analyzeLog`.
- PR [#4](https://github.com/boam79/law_twin/pull/4) — `main` 머지 대기.
- 로컬: `npm test`, `simulate:casual:ci`, `audit:casual:ci` (서버 기동 후).

## Executor's Feedback or Assistance Requests

- GitHub **Secrets**에 `LAW_API_KEY` 설정 시 PR CI에서 법제처 연동까지 검증됩니다.
- 배포 후: `LAW_TWIN_BASE_URL=https://law-twin.vercel.app LAW_TWIN_AUDIT_STRICT=1 npm run audit:casual`

## Lessons

- `표시` 단독 필터 → 학원은 화이트리스트.
- 프로덕션 audit은 배포된 코드 기준.
- Gemini `x-goog-api-key` 헤더.
- 429 시 모델 폴백 중단.
- audit 실패 시: `lawData` 키워드·`topicFallbacks`·`queryExpansionRules`·`scripts/audit-casual-stories.mjs` expectedAny 동기 PR.
- PR CI: `ANALYZE_RATE_LIMIT=120`, Gemini off, 로컬 서버 3007.
