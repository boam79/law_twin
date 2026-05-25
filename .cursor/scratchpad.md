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
- [ ] Planner: 프로덕션 배포 후 `audit:casual` strict 22/22 재확인

## Current Status / Progress Tracking

- 로컬(법제처 키 없음): strict 20/22 — API 미연동 시 `lawApi` 빈 결과.
- 프로덕션 배포 후 `LAW_TWIN_BASE_URL=https://law-twin.vercel.app npm run audit:casual` 로 최종 검증 필요.

## Executor's Feedback or Assistance Requests

- Vercel에 main 머지·배포 후 구어체 audit strict 통과 여부 사용자 확인 요청.

## Lessons

- `표시` 단독 필터는 `표시ㆍ광고법`까지 제거함 → 학원 시나리오는 화이트리스트 필터 사용.
- 프로덕션 audit은 배포된 코드 기준으로만 의미 있음.
