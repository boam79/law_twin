# LawTwin — Planner / Executor 진행 기록

## Background and Motivation

- 구어체 유저 스토리 법령 검색 품질 개선 및 P1~P6 Executor 일괄 구현 완료 (2026-05-25).

## Project Status Board

- [x] P1 충돌 탐지: `lawTitlesMatch` 기반 제목 매칭
- [x] P2 Gemini: 429 재시도, `integrations.geminiPlan` / `geminiSummary` 분리
- [x] P3 법제처: `rankLawSearchItems` + `anchorLocalLawsFromQueries` + `prioritizeDisplayLaws`
- [x] P4 CI: `.github/workflows/casual-audit.yml`, `npm run audit:casual`
- [x] P5 UI: 연동 오류·요약 fallback 표시
- [x] P6 검색어: `canonicalizeLawQuery`, 문장형 검색어 필터
- [x] 구어체: 학원+학원차 주제 오염 제거, 인터넷 판매·의료 시나리오 보강
- [x] 보안: 요청 검증·레이트리밋·CSP·Gemini 헤더 인증·law.go.kr 링크 화이트리스트
- [x] Gemini API 최적화 (0.5.2): Flash Lite 기본, lite 모드, 429 폴백 중단, `GEMINI_SUMMARY_MODE`
- [ ] Planner: 프로덕션 배포 후 `audit:casual` strict 22/22 재확인

## Current Status / Progress Tracking

- 로컬(법제처 키 없음): strict 20/22 — API 미연동 시 `lawApi` 빈 결과.
- 보안 하드닝 커밋 `86b2621`: `lib/security.js`, `lib/rateLimit.js`, `middleware.js`, route/gemini/lawApi/page 연동 완료. `npm audit` 0, `npm run build` 성공.
- `main`에 `cursor/executor-law-quality-663c` fast-forward 머지·푸시 완료 (`0ecb507`, 2026-05-25).
- 프로덕션 배포 후 `LAW_TWIN_BASE_URL=https://law-twin.vercel.app npm run audit:casual` 로 최종 검증 필요.

## Executor's Feedback or Assistance Requests

- Vercel에 main 머지·배포 후 구어체 audit strict 통과 여부 사용자 확인 요청.
- 보안: in-memory 레이트리밋은 서버리스 인스턴스별로 분리됨. 트래픽 급증 시 Vercel WAF/Edge rate limit 추가 검토 권장.

## Lessons

- `표시` 단독 필터는 `표시ㆍ광고법`까지 제거함 → 학원 시나리오는 화이트리스트 필터 사용.
- 프로덕션 audit은 배포된 코드 기준으로만 의미 있음.
- Gemini API 키는 URL 쿼리(`?key=`) 대신 `x-goog-api-key` 헤더 사용.
- `sanitizeLawDetailPath`는 URL 정규화 시 경로가 percent-encoding 될 수 있음(동일 호스트 HTTPS만 허용).
