# server/AGENTS.md

## Module Context

Bun 런타임에서 동작하는 LLM 프록시 서버. 클라이언트 요청을 받아 Anthropic 또는 Google API를 호출하고, 응답을 react-live 실행 가능 코드로 정규화해 반환한다.

## Tech Stack & Constraints

- 런타임은 Bun (`Bun.serve`, `server/index.ts:138`). Node 전용 서버 프레임워크(express 등)를 도입하지 마라.
- 외부 API 호출은 SDK 없이 전역 `fetch`로 직접 한다 (`server/index.ts:69,101`). 새 제공자도 같은 방식을 따른다.
- `server/`는 어떤 tsconfig의 `include`에도 없다 (`tsconfig.app.json:27` include `src`, `tsconfig.node.json:25` include `vite.config.ts`). 따라서 `bun run build`는 서버 코드를 타입체크하지 않는다. 서버 타입 오류는 `bun run lint`, `bun run test`, `bun run server` 실행으로만 드러난다.

## Implementation Patterns

- 부수효과 분리: `index.ts`는 라우팅과 HTTP 응답만 담당하고, 테스트할 로직은 부수효과 없는 모듈(`generator.ts`, `fallback.ts`)에 순수 함수로 둔다. 근거: `server/generator.ts:1-2`. `index.ts`를 테스트에서 import하면 `Bun.serve`가 실행되므로 import하지 마라.
- 모든 응답(에러, 404, OPTIONS 포함)에 `CORS_HEADERS`를 붙인다. 근거: `server/index.ts:142,155,172,190,211,217`.
- 키 해석 우선순위: 클라이언트 입력 키 > `.env` 키. 근거: `server/index.ts:64-66`. UI 문구(`src/App.tsx:120`)가 이 우선순위를 전제한다.
- 새 엔드포인트 경로는 `/api/` 접두사를 유지한다. Vite 프록시는 `/api`만 전달한다 (`vite.config.ts:10`).

## Testing Strategy

- 실행: `bun run test -- server/`
- 패턴: `vitest`의 `describe/it/expect/vi`를 사용하고 테스트명은 한국어 행동 서술로 쓴다. 근거: `server/fallback.test.ts`, `server/generator.test.ts`.
- 비동기 실패 검증은 `await expect(...).rejects.toThrow(...)`, 호출 횟수는 `vi.fn` + `toHaveBeenCalledTimes`. 근거: `server/fallback.test.ts:27-33`.
- 실제 네트워크를 호출하는 테스트를 작성하지 마라. 제공자 호출은 `attempt` 콜백처럼 주입 가능한 형태로 분리해 모킹한다.

## Local Golden Rules

- 에러 상태 매핑은 에러 메시지 문자열에 `503`/`429`가 포함되는지로 판단한다 (`server/index.ts:194,201`). 제공자 호출 함수가 던지는 에러 메시지에 HTTP 상태 코드를 반드시 포함하라 (`server/index.ts:85,112` 형식 `... API error: ${status}`). 이 형식을 바꾸면 사용자에게 과부하/레이트리밋 안내가 사라지고 500으로 떨어진다.
- 비대칭 주의: Google 경로만 모델 폴백(`server/index.ts:5,134-136`)과 `MAX_TOKENS` 잘림 감지(`server/index.ts:123-125`)를 가진다. Anthropic 경로는 단일 모델(`server/index.ts:77`), 폴백 없음, `max_tokens` 4096 대 Google 8192. 한쪽 제공자만 수정할 때 이 차이가 의도인지 확인하고, 공통 동작(예: 잘림 감지)을 추가할 때는 양쪽 모두 적용 여부를 판단한다.
- `GOOGLE_MODELS` 배열 순서가 곧 폴백 우선순위다 (`server/index.ts:4-5`). 정렬하거나 순서를 바꾸지 마라.
- `withModelFallback`은 빈 배열에서 즉시 throw하고, 모두 실패 시 마지막 에러를 던진다 (`server/fallback.ts:7-9,19`). 마지막 에러 메시지가 상태 코드 매핑에 쓰이므로 에러를 감싸거나 메시지를 바꾸지 마라.
- 응답 후처리 순서는 `stripCodeFences` 후 `ensureRenderCall`이다 (`server/index.ts:188`). 순서를 바꾸면 펜스가 남은 상태로 render 탐지가 실행된다.
- `ensureRenderCall`은 대문자로 시작하는 첫 `const`/`function` 선언만 컴포넌트로 본다 (`server/generator.ts:19`). 정규식을 바꾸면 `server/generator.test.ts:36-39` 경계 케이스를 유지하라.
