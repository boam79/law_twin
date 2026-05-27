# LawTwin — Planner / Executor 진행 기록

## Background and Motivation

- 구어체 유저 스토리 법령 검색 품질 개선 및 P1~P6 Executor 일괄 구현 완료 (2026-05-25).
- Google AI Studio **모델별 비율 제한** 기준 **Gemini Planner 모드** 정책 수립.
- 고도화 로드맵(A~G) Executor 1차: 단위 테스트·PR CI·audit 강화·상단 법제처 메타 표시.

## 현재 구현 스냅샷 (코드·문서 기준)

| 영역 | 확인된 사실 |
|------|-------------|
| 스택 | Next.js 15, React 19, JS, `"type": "module"` (v0.5.5~) |
| 분석 엔진 | `lib/analyzer.js` ~1,021줄, `lib/lawData.js` ~547줄, 내부 법령 규칙 ~31건 |
| 법제처 | `lawSearch.do` 검색만, 0건 시 emergency 재시도 |
| Gemini | 요약 1회(기본); `GEMINI_PLANNER_MODE=on` 시 Planner 1회·요약 자동 off |
| UI | `app/page.js` ~993줄 (컴포넌트 분리 미완) |
| 검증 | `npm test` 7케이스, `audit:casual` 24+ 시나리오, CI: pr-check + casual-audit |
| 레이트리밋 | Middleware 24회/분, in-memory Map |
| 함수 | `vercel.json` maxDuration 15초 |

## 고도화 로드맵 (A~G)

### A. 법령 매칭·데이터 품질 — 핵심

| ID | 제안 | 상태 |
|----|------|------|
| A1 | audit 실패 → lawData·키워드·expansion 동기 PR 체크리스트 | 문서화(본 표) |
| A2 | `lib/topicFallbacks.js` 분리 | **완료** v0.5.6 |
| A3 | 모호 입력 audit (`vague-law`, `vague-weird`, minLaws, forbidden) | **완료** v0.5.5 |

### B. 법제처 API

| ID | 제안 | 상태 |
|----|------|------|
| B1 | 조문 API — 스펙 확정 후 `lawApi.js` 확장 | 대기 |
| B2 | PR CI 로컬 audit (시크릿) | 부분: pr-check는 build+test만 |
| B3 | UI 법제처 키 vs 이번 결과 표기 | **완료** topbar-lawapi-meta |

### C. Gemini

| ID | 제안 | 상태 |
|----|------|------|
| C1 | `GEMINI_SUMMARY_MODE` / Planner 분리 문서 | README·env 예시 |
| C2 | `GEMINI_PLANNER_MODE` + 전용 model chain | **완료** v0.5.6 |

### D. 테스트·CI

| ID | 제안 | 상태 |
|----|------|------|
| D1 | `lawSearchTerms`·`analyzeScenario` 단위 테스트 | **완료** `tests/*.test.mjs` |
| D2 | PR: build + test | **완료** `.github/workflows/pr-check.yml` |
| D3 | PR simulate:casual | 대기 |

### E. UI·구조

| ID | 제안 | 상태 |
|----|------|------|
| E1 | `app/components/` 분리 | 대기 |
| E2 | dataQuality 상단 노출 | **완료** v0.5.5 |

### F. 보안·운영

| ID | 제안 | 상태 |
|----|------|------|
| F1 | README 서버리스 레이트리밋 한계 | 대기 |
| F2 | analyze 구조화 로그 | 대기 |
| F3 | `LAW_API_MAX_QUERIES` env | 대기 |

### G. 제품·UX

| ID | 제안 | 상태 |
|----|------|------|
| G1 | 분석 후 nextSteps 스크롤 | 대기 |
| G2 | 분석 이력·공유 (DB) | 별도 기획 |
| G3 | 지자체 조례 API | 별도 프로젝트 |

### 하지 않는 것

- AI 확정 판단, 전국 법령 100% 커버, Gemini 검색+요약 동시 풀가동(429 정책과 상충).

### 실행 순서 (잔여)

1. ~~audit + 단위 테스트 + PR CI~~
2. topicFallbacks 분리 + lawData·audit 동기화
3. page.js 컴포넌트 분리
4. Gemini Planner 모드 구현
5. (정책 후) 법제처 조문 API

---

## Key Challenges and Analysis — Gemini Planner 모드

(변경 없음 — `GEMINI_PLANNER_MODE`, flash-lite → flash → pro, 2.0 제외, Summary off 권장)

## High-level Task Breakdown (Executor)

| # | 작업 | 성공 기준 | 상태 |
|---|------|-----------|------|
| E-1 | scratchpad 로드맵 A~G 반영 | 본 문서 | 완료 |
| E-2 | `npm test` + analyzer import `.js` | 7 pass, build OK | 완료 |
| E-3 | audit minLaws·forbidden·adminOnly | 스크립트 반영 | 완료 |
| E-4 | pr-check.yml | build+test on PR | 완료 |
| E-5 | topbar 법제처 메타 | UI 표시 | 완료 |
| E-6 | topicFallbacks 분리 | `lib/topicFallbacks.js`, 테스트 3건 | **완료** |

## Project Status Board

- [x] P1~P6, 보안, Gemini 0.5.2, law-api 0.5.4, checklist layout
- [x] E-1~E-5 (로드맵 1차)
- [x] E-6 topicFallbacks 분리
- [x] Gemini Planner 모드 구현 (C2)
- [ ] 프로덕션 `audit:casual` strict 재확인

## Current Status / Progress Tracking

- **v0.5.6** (Executor): `lib/topicFallbacks.js`, `GEMINI_PLANNER_MODE` + `getGeminiPlannerModelChain`, route 병합 검색어.
- 로컬: `npm test` 10/10, `npm run build` 성공.
- 프로덕션 audit는 배포 후 `LAW_TWIN_BASE_URL=... npm run audit:casual` 로 확인 필요.

## Executor's Feedback or Assistance Requests

- **사용자 확인 요청**: v0.5.6 배포 후 ① Planner off 동작 동일 ② (선택) `GEMINI_PLANNER_MODE=on` 시 검색어·법령 품질 ③ v0.5.5 UI 3가지(메타·산재·체크리스트).
- 다음 Executor 후보: E1 page 컴포넌트 분리, D3 PR simulate:casual, B2 로컬 audit CI.

## Lessons

- `표시` 단독 필터 → 학원은 화이트리스트.
- 프로덕션 audit은 배포된 코드 기준.
- Gemini `x-goog-api-key` 헤더.
- 429 시 모델 폴백 중단.
- AI Studio: Lite RPM10·RPD20, Flash RPM5·RPD20.
- `node --test`는 analyzer가 `./lawData.js` 확장자 필요 (`type:module`).
- `.check-item` grid는 `details.check-item-q`에 적용 금지.
