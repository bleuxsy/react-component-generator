# AGENTS.md

## Project Context

프롬프트를 받아 LLM(Anthropic/Google)으로 React 컴포넌트 코드를 생성하고 react-live로 즉시 렌더링하는 도구. 설치/실행 안내와 기능 소개는 `README.md` 참조.

Stack: React 19, TypeScript 5.9, Vite 8, Bun (API 서버), react-live 4, Vitest 4 + Testing Library + jsdom, ESLint 9.

## Operational Commands

- 패키지 매니저/런타임은 `bun` 고정. npm/yarn/pnpm/npx 사용 금지 (`bun.lock`만 존재). 일회성 CLI는 `bunx`.
- 의존성 설치: `bun install`
- 개발 서버 (API :3002 + Vite :5173 동시): `bun run dev`
- API 서버만: `bun run server`
- 테스트 (Vitest): `bun run test` / 감시 모드: `bun run test:watch`
- 단일 테스트 파일: `bun run test -- server/generator.test.ts`
- 린트: `bun run lint`
- 타입체크 + 빌드: `bun run build`
- 작업 완료 전 `bun run test`와 `bun run lint`를 통과시킨다.
- TDD 리마인더: Write/Edit/NotebookEdit 직전에 PreToolUse 훅이 `.claude/rules/tdd.md` 요약을 컨텍스트에 주입한다. 문구는 `.claude/hooks/tdd-reminder.json`에서 관리하며, `tdd.md`를 바꾸면 함께 갱신한다.
- 커밋 게이트: `git commit` 실행 시 PreToolUse 훅이 `bun run test`를 먼저 돌리고, 하나라도 실패하면 커밋을 차단한다. 근거: `.claude/settings.json` `hooks.PreToolUse`. 차단되면 실패한 테스트를 고친 뒤 다시 커밋한다. 테스트 삭제·`skip`·훅 비활성화(`disableAllHooks`)·명령 형태 변형(`git -C ... commit` 등)으로 우회하지 마라.

## Golden Rules

### Immutable

- `bun test`를 쓰지 마라. 그것은 Bun 내장 러너이며 jsdom 환경과 `src/test/setup.ts`를 로드하지 않는다. 테스트는 반드시 `bun run test`(Vitest)로 실행한다. 근거: `package.json` scripts.test, `vite.config.ts:16-21`.
- API 키는 서버 경계를 넘어 클라이언트로 내려보내지 않는다. `/api/config`는 키 존재 여부만 boolean으로 노출한다. 근거: `server/index.ts:147-156`. 키 값 자체를 응답·로그·에러 메시지에 포함하는 변경은 금지.
- Google API 키는 요청 URL 쿼리에 실린다(`server/index.ts:99`). 이 URL이나 fetch 에러 원문을 로그/응답에 그대로 출력하지 마라.
- 클라이언트는 LLM 제공자 API를 직접 호출하지 않는다. 항상 상대 경로 `/api/*`를 호출하고 Vite 프록시가 :3002로 전달한다. 근거: `src/hooks/useComponentGenerator.ts:23`, `src/App.tsx:25`, `vite.config.ts:8-15`.
- API 서버 포트 3002는 두 곳에 하드코딩되어 있다: `server/index.ts:139`, `vite.config.ts:11`. 변경 시 둘 다 수정한다.

### Sensitive Files (읽기·수정 금지)

- 에이전트는 민감 파일을 읽거나 수정하지 않는다. 대상: `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `id_ed25519*`, `*credential*`, `*secret*`, `.npmrc`, `~/.ssh/**`, `~/.aws/**`, `~/.config/gcloud/**`. 근거: `.claude/settings.json` `permissions.deny`.
- 차단은 Read/Edit 도구뿐 아니라 셸에도 적용한다. `cat`, `type`, `Get-Content`, `grep`, `sed`, 리다이렉션 등으로 우회하지 마라. `printenv`, `$env:` 등 환경 변수 덤프도 금지.
- 환경 변수가 필요하면 파일 내용이 아니라 코드의 사용처(`process.env.ANTHROPIC_API_KEY`, `server/index.ts:60-61`)를 근거로 판단한다. 값이 필요하면 사용자에게 직접 설정을 요청한다.
- deny 규칙에 막혔을 때 다른 도구나 경로로 재시도하지 않는다. 막혔다는 사실을 보고하고 멈춘다.
- `permissions.deny` 목록을 축소·삭제하는 변경은 사용자의 명시적 요청 없이 하지 않는다. 새 민감 파일 유형이 생기면 `settings.json`과 이 목록을 함께 갱신한다.

### Double Defense (한쪽만 제거하지 마라)

- render 호출 보장: 시스템 프롬프트 지시(`server/index.ts:12`) + 응답 후처리 `ensureRenderCall`(`server/generator.ts:16-24`). react-live `noInline` 모드(`src/components/LivePreview.tsx:10`)는 `render(...)` 없이는 아무것도 그리지 않는다.
- 코드펜스 제거: 시스템 프롬프트 지시(`server/index.ts:16`) + `stripCodeFences`(`server/generator.ts:5-10`).
- 빈 프롬프트 차단: 클라이언트 `src/components/PromptInput.tsx:22,64` + 서버 `server/index.ts:176-181`.
- API 키 누락 차단: 클라이언트 `src/App.tsx:35-38` + 서버 `server/index.ts:169-174`.

### Generated Code Contract

LLM이 생성하는 코드는 react-live에서 그대로 실행된다. 시스템 프롬프트(`server/index.ts:7-49`)를 수정할 때 다음 계약을 유지한다.
- import 문 금지, `React`는 스코프 전역 (`server/index.ts:11`).
- TypeScript 문법 금지, 순수 JavaScript (`server/index.ts:20`). react-live는 TS를 트랜스파일하지 않는다.
- 인라인 스타일만 사용 (`server/index.ts:10`).
- 마지막 줄에 `render(<Name />)` (`server/index.ts:12`).

### Test Boundary

- 테스트가 있는 영역: `server/generator.ts`, `server/fallback.ts`, `src/components/PromptInput.tsx`. 이 파일의 동작을 바꾸면 대응 `*.test.ts(x)`를 함께 갱신한다.
- 테스트가 없는 영역: `server/index.ts`(Bun.serve 부수효과), `src/hooks/useComponentGenerator.ts`, `src/App.tsx`. 여기에 분기 로직을 추가할 때는 순수 함수로 분리해 테스트 가능한 모듈에 둔다.
- 테스트 파일은 `src/**/*.test.{ts,tsx}` 또는 `server/**/*.test.ts` 패턴이어야 수집된다. 근거: `vite.config.ts:20`.

## Standards & References

- 커밋 메시지: `<type>: <한국어 요약>` (type: feat, fix, refactor, chore). 요약 50자 이내, 마침표 없음. 상세 절차는 `.claude/skills/commit/SKILL.md`.
- push는 사용자가 요청할 때만 한다.
- 주석과 사용자 노출 문자열(에러 메시지, UI 문구)은 한국어로 작성한다. 근거: `server/fallback.ts:1-2`, `server/index.ts:124,196`, `src/App.tsx`.
- `verbatimModuleSyntax`가 켜져 있으므로 타입만 가져올 때는 `import type`을 쓴다. 근거: `tsconfig.app.json:12`, `src/App.tsx:5`.
- Maintenance Policy: 이 문서의 규칙과 실제 코드(파일·라인 근거)가 어긋나는 것을 발견하면 작업을 멈추지 말고, 작업 결과 보고 시 AGENTS.md 업데이트를 제안한다.

## Context Map

- **[API 서버 수정 (Bun)](./server/AGENTS.md)** — LLM 호출, 모델/폴백, 에러 매핑, 응답 후처리 작업 시.
- **[프론트엔드 수정 (React/Vite)](./src/AGENTS.md)** — UI 컴포넌트, 생성 훅, 미리보기, 프론트 테스트 작업 시.
