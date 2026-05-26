# LawTwin

AI 기반 법령 영향·관계 분석 웹 앱(MVP)입니다. 자연어 상황을 입력하면 관련 법령·연관 히트맵·검토 체크리스트·(선택) Gemini 요약을 제공합니다.

**현재 버전:** `0.5.2` · **프로덕션:** [law-twin.vercel.app](https://law-twin.vercel.app)

## 기술 스택

- Next.js 15 App Router (`/api/analyze`, Middleware)
- React 19
- 내부 규칙 엔진 (`lib/analyzer.js`, `lib/lawData.js`)
- Gemini REST API (요약, 무료 티어 모델 폴백)
- 법제처 국가법령정보센터 OpenAPI
- Vercel 배포 (`icn1`, 함수 `maxDuration` 15초)

## 환경 변수

`.env.local` (또는 Vercel Environment Variables). **키는 Git에 커밋하지 않습니다.**

```bash
GEMINI_API_KEY=...
LAW_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash-lite
# 선택: 404/5xx 시만 시도 (429는 추가 호출 안 함)
# GEMINI_MODEL_FALLBACK=gemini-2.5-pro
# GEMINI_SUMMARY_MODE=lite
# GEMINI_SUMMARY_MAX_TOKENS=400
```

| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | Google AI Studio API 키 |
| `LAW_API_KEY` | 법제처 OpenAPI `OC` 키 |
| `GEMINI_MODEL` | 요약 모델 (기본 `gemini-2.5-flash-lite`) |
| `GEMINI_MODEL_FALLBACK` | 404·5xx 시만 순차 시도 (쉼표 구분) |
| `GEMINI_SUMMARY_MODE` | `lite`(기본) · `full` · `off` |
| `GEMINI_SUMMARY_MAX_TOKENS` | 출력 토큰 상한 (lite 기본 400) |
| `SKIP_GEMINI_SUMMARY` | `1`이면 요약 API 호출 생략 |

## 로컬 실행

```bash
npm install
npm run dev
```

- UI: `http://localhost:3000`
- 연동 확인: `GET /api/analyze`

### 검증 스크립트

```bash
npm run build
npm run simulate:casual    # 구어체 시나리오 시뮬레이션
npm run audit:casual       # 프로덕션 URL 대상 audit (LAW_TWIN_BASE_URL 설정)
```

## 주요 기능

- 자연어 상황 입력 (**Enter** 분석, **Shift+Enter** 줄바꿈)
- 업종·지역·주제 자동 추출 및 영향/충돌/대응 보기 모드
- 법령 연관 **히트맵**, 법령·**검토 체크리스트**, 지역·업무 **우선순위** 탭
- 법제처 실시간 검색(키 설정 시) + 내부 규칙 후보 병합
- Gemini AI 요약(키 설정 시, **분석당 1회**)
- 데이터 출처 안내·「이렇게 보세요」 단계 가이드
- 로고 클릭 시 초기화 · 제작 **Boam79** 표시

## 보안

- API 키는 서버 라우트에서만 사용 (`/api/analyze`)
- 요청 본문·필드 검증, IP 기반 레이트리밋(Middleware)
- CSP·보안 헤더, `law.go.kr` 링크 화이트리스트
- Gemini: `x-goog-api-key` 헤더, URL 쿼리 키 미사용

## Gemini API 사용 최적화 (0.5.2)

- 분석당 Gemini **1회** (검색 계획은 내부 검색어, API 미호출)
- 기본 모델 **Flash Lite**, `GEMINI_SUMMARY_MODE=lite` — 짧은 프롬프트·출력 400토큰
- **429** 시 **추가 모델 시도 없음** (무료 티어는 쿼터 풀 공유 → RPM 3배 소모 방지)
- 404·503 등만 `GEMINI_MODEL_FALLBACK`(기본 Pro)로 1회 폴백
- 요약 실패·한도 초과 시 **law-only**: 체크리스트·법령·히트맵·`dataQuality` 유지
- `GEMINI_SUMMARY_MODE=off` 또는 `SKIP_GEMINI_SUMMARY=1`로 요약 완전 생략 가능

---

## 버전 히스토리

| 버전 | 날짜 | 요약 |
|------|------|------|
| **0.5.2** | 2026-05-26 | Gemini API 최적화: Flash Lite 기본, lite 프롬프트, 429 폴백 중단, 요약 모드 env |
| **0.5.1** | 2026-05 | Gemini 폴백 순서 수정(404/503 포함), 시도 순서 UI 표시, 초기 상황 입력 비움 |
| **0.5.0** | 2026-05 | Gemini 모델 폴백 체인, 429 쿨다운 UI, 검토 체크리스트 설명, Enter 분석, 로고 초기화, 제작자 표시 |
| **0.4.0** | 2026-05 | 보안 하드닝(검증·레이트리밋·CSP·Gemini 헤더), `lib/security.js`, `middleware.js` |
| **0.3.0** | 2026-05 | UI v0.4: 법령 연관 히트맵, 탭 UX, 데이터 출처·이용 가이드, 지역 히트맵 휴리스틱 명시 |
| **0.2.0** | 2026-05 | 법령 품질(P1–P6): 충돌 제목 매칭, 검색어 정규화, 구어체 CI(`audit:casual`), Gemini 재시도 |
| **0.1.0** | 2026-05 | 초기 MVP: 자연어 분석, 체크리스트, 법제처·Gemini 연동 |

### 0.5.2 상세

- 기본 모델 `gemini-2.5-flash-lite`, 폴백 기본 `gemini-2.5-pro` (404·5xx만)
- `GEMINI_SUMMARY_MODE` (`lite` / `full` / `off`), `GEMINI_SUMMARY_MAX_TOKENS`, `SKIP_GEMINI_SUMMARY`
- 429 시 추가 모델 시도 중단 — 무료 티어 RPM 3배 소모 방지
- lite 모드: 압축 프롬프트·출력 400토큰, 요약 실패 시 law-only 응답 유지
- UI: 요약 생략(`off`) 안내, 429 메시지 단일 모델 기준으로 정리

### 0.5.1 상세

- `getGeminiModelChain()` — 404/503 포함 서버 오류 시 폴백 체인 순차 시도
- AI 요약 카드: `modelsTriedLabel` 시도 순서 표시
- 초기 상황 입력란 비움, 쉬운 설명 3단 구조·질문형 체크리스트

### 0.5.0 상세

- `GEMINI_MODEL_FALLBACK` / `getGeminiModelChain()` — 429·404 시 Flash·Flash Lite·Pro 순 시도 *(0.5.2에서 429 폴백 중단)*
- AI 요약 카드: 사용 모델·폴백 안내 문구
- 검토 체크리스트: 역할 설명·우선순위 뱃지 범례 (법률 자문 아님 명시)
- 분석 API: Gemini 검색 계획 호출 제거( RPM 절약 ), 504 완화

### 0.4.0 상세

- `readAnalyzeRequestBody`, enum 화이트리스트, 본문 크기 제한
- Middleware: POST `/api/analyze` 24회/분, 보안 헤더
- `sanitizeLawDetailPath`, HTTPS-only 법제처 호출

### 0.3.0 상세

- `lib/analysisMeta.js`: `dataQuality`, `nextSteps`
- 지역·업무 표 = 연관 법령 수 기반 참고용(공식 통계 아님)
- 검색어·표시 법령 불일치 경고

### 0.2.0 상세

- `.github/workflows/casual-audit.yml`
- `lawTitlesMatch` 충돌 탐지, `rankLawSearchItems`, 학원·의료 시나리오 보강

### 0.1.0 상세

- `lib/lawData.js` 규칙 엔진, `/api/analyze`, 기본 UI

---

## 저장소·브랜치

- 기본 브랜치: `main`
- 기능 개발: `cursor/*` 브랜치 → `main` 머지

## 라이선스

Private (`package.json` — `"private": true`).
