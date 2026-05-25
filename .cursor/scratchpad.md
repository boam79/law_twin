# LawTwin — Planner 분석 (Vercel 프로덕션 전체 검증)

## Background and Motivation

- **요청**: Planner 모드로 LawTwin 전체 분석. Vercel에 `GEMINI_API_KEY`, `LAW_API_KEY`, `GEMINI_MODEL` 등 환경변수가 설정되어 있다는 전제.
- **목표**: 프로덕션(`https://law-twin.vercel.app`)에서 규칙 엔진 + 법제처 API + Gemini 연동을 포함한 **실동작·품질·리스크**를 문서화하고, Executor가 수행할 개선 작업의 우선순위를 정한다.
- **검증 일시**: 2026-05-25 (Cloud Agent 환경)

## Key Challenges and Analysis

### 1. 프로덕션 인프라 (확인됨)

| 항목 | 상태 |
|------|------|
| URL | `https://law-twin.vercel.app` |
| Region | `icn1` (vercel.json·런타임 일치) |
| `GET /api/analyze` | `integrations.gemini: true`, `integrations.lawApi: true` |
| Function `maxDuration` | 15초 |
| 로컬 `.env.local` | 없음 (프로덕션만 키 보유) |

### 2. 요청당 파이프라인 (현재 동작)

```
POST /api/analyze
  → analyzeScenario()           [규칙/키워드/로컬 lawData ~30건]
  → planLawSearchWithGemini()   [검색어 JSON, 실패 시 searchQueries fallback]
  → fetchLawSearchBatch()       [법제처 최대 8쿼리, 30건 병합]
  → hydrateAnalysisWithLiveLaws()
  → summarizeWithGemini()       [실무 요약]
```

- **법제처 API**: 7개 대표 시나리오 모두 `lawApiCount` 5~18건, `lawApiErrors: 0`. 검색어는 내부 규칙(`queryExpansionRules`, `topicSearchFallback`)만으로도 대체로 정확.
- **Gemini**: 동일 배치에서 **전 요청 `Gemini API 429`**. 요청당 `planLawSearch` + `summarize` **2회 호출** → 짧은 시간 다건 테스트 시 할당량/Rate limit에 걸림. 키는 유효하나 **현재 프로덕션에서 LLM 기능은 사실상 비활성**.
- **Fallback**: `planLawSearchWithGemini`는 빈 queries 시 `analysis.searchQueries` 사용 → **법령 검색·UI 핵심 경로는 429 없이 동작**.

### 3. 프로덕션 품질 검증 결과

#### 3.1 시뮬레이션 (`npm run simulate`)

| 실행 | baseUrl | limit | 결과 |
|------|---------|-------|------|
| 1 | `https://law-twin.vercel.app` | 30 | **PASS** (`ok: true`) |
| 2 | (로컬, 서버 없음) | - | FAIL (fetch failed) |

- 전체 스토리 수(추정): 생성형 **3,240** + 일상 구어 **66** ≈ **3,306** (`domains×subjects×actions×details×4지역×3모드` + `casualStories×3모드`).
- 30건 샘플은 통과했으나 **전량 3,306건 CI는 미실시** (429·시간·비용 리스크).

#### 3.2 대표 시나리오 수동 검증 (프로덕션 POST)

| 시나리오 | 업종/주제 | 검색어 | 법령 출처 | 이슈 |
|----------|-----------|--------|-----------|------|
| 포괄임금/선택근로 | 노동·서울 | 근로기준법, 최저임금법 | 전부 lawApi | 충돌 0건 (아래 버그) |
| 알바/주휴/야근 | 노동 | 동일 | lawApi | Gemini 429 |
| 홍보문자/개인정보 | 개인정보 | 개보법, 정보통신망법 | lawApi | 정상 |
| 환불/광고 (conflict) | 전자상거래 | 5개 검색어 | lawApi | 충돌 1건 |
| 소방/소화기 | 소방 | 5개 검색어 | lawApi | 정상 |
| 의료+앱+광고 | 의료 | 의료법, 응급의료, 개보법… | lawApi | **의료법 검색 오매칭** (공공보건의료법 등) |
| 폐수/소음 | 환경 | 4개 환경법 | lawApi | 정상 |

#### 3.3 구조적 버그: 충돌 탐지가 lawApi 전용 결과에서 무력화

- `detectConflicts()`는 `law.id`가 로컬 DB id (`labor-standards-hours`, `minimum-wage-act` 등)일 때만 `add()` 성공.
- `hydrateAnalysisWithLiveLaws()` 이후 id는 `lawapi-{index}-...` → **근로기준법+최저임금법 동시 노출 시나리오에서도 충돌 0건** (로컬만 쓸 때는 1건 나옴).
- UI `RelationshipMap`은 `graph` 미사용; API는 `graph` 생성·시뮬은 `graph` 필수 검증.

#### 3.4 법제처 검색 정밀도

- 쿼리 `의료법` → 상위 결과가 **의료법 본법이 아닌** 「공공보건의료에 관한 법률」 등 부분 문자 매칭.
- 시뮬 `expectedAny`는 `searchQueries`·`plannedQueries`·`laws.title` **합집합**으로 검사 → 검색어에만 기대법령이 있어도 PASS 가능.
- `staleResultHints` (구직자 취업촉진 등)는 30건 샘플에서 미발견.

#### 3.5 Gemini 429 영향

| 기능 | 429 시 동작 |
|------|-------------|
| 검색어 계획 | 내부 `searchQueries` 사용 |
| 요약 | `gemini.text` null, UI 첫 줄 빈 값 |
| 연동 태그 | `integrations.gemini: true` (키 존재) — **실제 호출 성공과 불일치** |

### 4. 코드베이스 자산 요약

| 모듈 | 역할 | 규모/특징 |
|------|------|-----------|
| `lib/analyzer.js` | 핵심 규칙 엔진 | 키워드·점수·충돌·체크리스트·히트맵 |
| `lib/lawData.js` | 샘플 법령·시나리오 | ~30법령, 6개 샘플 문장 |
| `lib/lawSearchTerms.js` | 법령명 정규화·별칭 | Gemini/검색어 필터 |
| `lib/gemini.js` | 검색 계획 + 요약 | 8~10s timeout, JSON parse |
| `lib/lawApi.js` | law.go.kr DRF | HTTPS→HTTP fallback, IPv4 node fallback |
| `app/page.js` | 콘솔 UI | 15 업종, 3 모드, 자동 초기 분석 |
| `scripts/simulate-user-stories.mjs` | 회귀 | 3306+ 케이스, `--limit`, `--base-url` |

### 5. 보안·운영

- API 키: 서버 라우트만 사용 (양호).
- `lawApi` 상세 링크에서 `OC` 쿼리 제거 (`sanitizeDetailPath`).
- 프로덕션 UI에 Gemini 실패 사유 미노출 → 사용자는 "연동 OK"로 오해 가능.

## High-level Task Breakdown

> Executor는 **한 번에 한 작업만** 수행. 완료 후 사용자·Planner 확인.

### Task P1 — 충돌 탐지 lawApi 호환 (우선순위: 높음)

- **작업**: `detectConflicts`를 `law.title` 정규화 매칭 또는 로컬 `lawData` id 매핑으로 변경. `hydrate` 후에도 근로기준법↔최저임금법 등 템플릿 충돌 노출.
- **성공 기준**: 프로덕션 POST 포괄임금 시나리오 `mode=conflict`에서 `conflicts.length >= 1`. 시뮬 30건 PASS 유지.

### Task P2 — Gemini Rate limit 완화 (우선순위: 높음)

- **작업**: (a) 단일 요청으로 plan+summarize 병합 또는 (b) 429 시 exponential backoff 1회 재시도, (c) `integrations.gemini`를 "키 존재"가 아닌 "마지막 호출 성공"으로 분리.
- **성공 기준**: 프로덕션 1회 분석에서 `gemini.text` non-empty 또는 `lawSearchPlan.queries` Gemini 유래. 연속 10회 중 429 비율 < 50% (할당량 정책 내).

### Task P3 — 법제처 검색 정밀도 (의료법 등) (우선순위: 중)

- **작업**: 검색 결과 후처리: 쿼리와 `법령명한글` 정규화 일치/시작일치 우선 정렬; 본법 없으면 로컬 `lawData` 고신뢰도 항목 슬롯 유지.
- **성공 기준**: "의료법" 시나리오 상위 3건에 「의료법」 포함. `casualStories` healthcare expectedAny 시뮬 PASS.

### Task P4 — 프로덕션 CI 시뮬 (우선순위: 중)

- **작업**: GitHub Action 또는 Vercel cron에서 `LAW_TWIN_BASE_URL=https://law-twin.vercel.app`, `--limit=66` (casual only) 또는 nightly full.
- **성공 기준**: PR/schedule에서 simulate exit 0.

### Task P5 — UI 투명성 (우선순위: 낮음)

- **작업**: 연동 상태에 `gemini.error` / `lawSearchPlan.rationale` 요약 표시; AI 요약 없을 때 fallback 문구.
- **성공 기준**: 429 시 사용자에게 "요약 일시 불가(할당량)" 표시.

### Task P6 — 검색어 중복 정리 (우선순위: 낮음)

- **작업**: `표시ㆍ광고` vs `표시 광고` 등 alias 통합 (`lawSearchTerms` / expansion rules).
- **성공 기준**: commerce 시나리오 `searchQueries` 중복 제거, 법제처 호출 수 감소.

## Project Status Board

- [x] Planner: 프로덕션 URL·환경변수 존재 확인 (`GET /api/analyze`)
- [x] Planner: 법제처 연동 7시나리오 검증
- [x] Planner: Gemini 429 현상 및 fallback 경로 문서화
- [x] Planner: simulate 30건 프로덕션 PASS
- [x] Planner: 충돌 탐지 lawApi id 버그 식별
- [x] Planner: 의료법 검색 오매칭 식별
- [ ] Executor: P1 충돌 탐지 수정
- [ ] Executor: P2 Gemini 429/연동 상태
- [ ] Executor: P3 법제처 정밀도
- [ ] Executor: P4 CI 시뮬
- [ ] Executor: P5 UI 투명성
- [ ] Executor: P6 검색어 중복

## Current Status / Progress Tracking

- **Planner 단계 완료**: Vercel 프로덕션 기준 전체 분석 및 작업 분해 반영.
- **다음 단계**: 사용자가 Executor 모드 지정 시 **P1**부터 착수 권장.

## Executor's Feedback or Assistance Requests

- (비어 있음 — Executor 착수 전)

## Lessons

- 프로덕션 분석 시 `LAW_TWIN_BASE_URL=https://law-twin.vercel.app` 로 simulate 실행.
- `integrations.*`는 키 존재만 반영; 실제 API 성공 여부는 POST 응답의 `error` 필드 확인 필요.
- Gemini는 요청당 2호출 — 부하·429 테스트 시 요청 간격 필요.
- `detectConflicts`는 lawApi id와 로컬 id 불일치 시 항상 빈 결과에 가깝다.
