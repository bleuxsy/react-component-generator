# src/AGENTS.md

## Module Context

Vite + React 19 SPA. 사용자 프롬프트와 제공자/키 설정을 받아 `/api/generate`를 호출하고, 결과 코드를 카드 단위로 미리보기(react-live)와 코드 보기로 보여준다.

## Tech Stack & Constraints

- 상태 관리는 React 내장 훅만 사용한다. 생성 상태는 `useComponentGenerator` 하나에 모여 있다 (`src/hooks/useComponentGenerator.ts:13-60`). 전역 상태 라이브러리를 도입하지 마라.
- 스타일은 일반 CSS 클래스(`src/App.css`, `src/index.css`)로 작성한다. CSS 모듈, Tailwind, CSS-in-JS는 사용하지 않는다. 생성된 컴포넌트의 인라인 스타일 규칙과 혼동하지 마라.
- 서버 호출은 상대 경로 `fetch('/api/...')`만 사용한다 (`src/App.tsx:25`, `src/hooks/useComponentGenerator.ts:23`). 절대 URL(`http://localhost:3002`)을 쓰면 프록시를 우회한다.
- 타입은 `src/types/index.ts`에 모은다. `Provider` 타입은 `server/index.ts:57`에 중복 정의되어 있으므로 제공자를 추가하면 양쪽과 `src/App.tsx:8-11`의 `PROVIDER_CONFIG`를 함께 수정한다.

## Implementation Patterns

- 컴포넌트는 named export 함수 컴포넌트 + 같은 파일 상단 `interface XxxProps`. 근거: `src/components/PromptInput.tsx:3-6,17`, `src/components/CodeView.tsx:3-7`. 예외는 `App.tsx`의 default export.
- 미리보기 새로고침은 `key`를 바꿔 `LivePreview`를 리마운트하는 방식이다 (`src/components/ComponentCard.tsx:47,82`). 애니메이션 재생을 위해 이 패턴을 유지한다.
- 생성 결과는 최신이 앞에 오도록 prepend한다 (`src/hooks/useComponentGenerator.ts:42`).
- 클라이언트 API 키는 입력값이 있을 때만 요청 바디에 포함한다 (`src/hooks/useComponentGenerator.ts:26`, `src/App.tsx:39`). 서버는 클라이언트 키가 없을 때만 `.env` 키를 쓴다(`server/index.ts:65`). 키 필드에 공백 등 기본값을 넣지 마라.
- 제공자 변경 시 입력된 API 키를 비운다 (`src/App.tsx:42-45`). 다른 제공자로 키가 전송되는 것을 막는 동작이므로 제거하지 마라.

## Testing Strategy

- 실행: `bun run test -- src/`
- 환경: jsdom, 전역 setup `src/test/setup.ts`(jest-dom 매처 + 테스트별 `cleanup`). 근거: `vite.config.ts:17-18`.
- 패턴: `@testing-library/react`의 `render/screen`, 사용자 입력은 `userEvent.setup()`, 요소 조회는 접근성 role + 한국어 accessible name. 근거: `src/components/PromptInput.test.tsx:12-23`.
- 테스트 파일은 대상 컴포넌트 옆에 `Xxx.test.tsx`로 둔다.

## Local Golden Rules

- 버튼 문구와 aria 라벨은 테스트 셀렉터로 쓰인다. `'컴포넌트 생성'`, `'생성 중...'` 문구를 바꾸면 `src/components/PromptInput.test.tsx:9,18,27`이 깨진다. 문구 변경 시 테스트를 함께 수정한다.
- `PromptInput`의 제출 가드(`prompt.trim() && !isLoading`, `src/components/PromptInput.tsx:22`)와 버튼 `disabled` 조건(`src/components/PromptInput.tsx:64`)은 같은 조건을 두 번 검사한다. Ctrl+Enter 단축키(`src/components/PromptInput.tsx:48-52`)는 버튼을 거치지 않으므로 핸들러 가드를 제거하면 로딩 중 중복 요청이 발생한다.
- `LivePreview`의 `noInline` 속성(`src/components/LivePreview.tsx:10`)을 제거하지 마라. 서버가 `render(...)` 호출 형식으로 코드를 반환하는 계약(`server/generator.ts:12-24`)과 짝을 이룬다.
- `/api/config` 조회 실패는 조용히 무시하고 env 키 없음으로 간주한다 (`src/App.tsx:24-29`). 서버가 떠 있지 않아도 UI가 렌더링되어야 하므로 이 catch를 에러 표시로 바꾸지 마라.
