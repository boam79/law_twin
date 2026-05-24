# LawTwin

AI 기반 법령 영향·관계 분석 MVP입니다. 현재 구현은 노동법 시나리오를 기본 예시로 사용하며, 서버 라우트에서 Gemini API와 법제처 OpenAPI를 환경변수로 연결합니다.

## 기술 스택

- Next.js App Router
- React
- CSS Modules 없이 전역 CSS
- Server Route: `/api/analyze`
- Gemini REST API
- 법제처 국가법령정보센터 OpenAPI

## 환경변수

`.env.local`을 만들고 다음 값을 설정합니다. 실제 키는 Git에 커밋하지 않습니다.

```bash
GEMINI_API_KEY=...
LAW_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 구현된 기능

- 자연어 상황 입력
- 업종·지역·주제 조건 추출
- 샘플 법령 데이터 기반 영향 분석
- 법령 관계 네트워크 시각화
- 법제처 OpenAPI 실시간 법령 검색
- Gemini 기반 실무 요약 생성
- 충돌 가능성 후보 표시
- 행정 대응 체크리스트 생성 및 복사

## 보안 메모

API 키는 브라우저 번들에 포함되지 않습니다. 모든 외부 API 호출은 `/api/analyze` 서버 라우트에서 처리합니다.
