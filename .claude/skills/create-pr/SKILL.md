---
name: create-pr
description: |
  현재 브랜치의 커밋을 분석해 PR 제목·본문을 작성하고 `gh pr create`로 GitHub PR을 생성한다.
  references/의 PR 템플릿을 사용하며, 이 프로젝트(bleuxsy/react-component-generator)는 한국어, 그 외 저장소는 영어로 작성한다.
  "PR 만들어줘", "PR 생성해줘", "풀리퀘 올려줘", "create a PR", "open a pull request", "/create-pr" 같은 요청에 활성화한다.
argument-hint: "[--draft] [--base <브랜치>] [추가 지시]"
context: fork
---

# Create PR

현재 브랜치의 변경을 base 브랜치 대비로 분석해 PR을 생성한다.
이 스킬은 `context: fork`로 서브 에이전트에서 실행된다. 실행 중 사용자에게 질문할 수 없으므로, 판단이 필요한 상황에서는 **추측해서 진행하지 말고 중단한 뒤 이유와 다음 조치를 보고**한다.

## 인자

| 인자 | 동작 |
|---|---|
| `--draft` | Draft PR로 생성 |
| `--base <브랜치>` | base 브랜치 지정 (기본: 저장소 기본 브랜치) |
| 그 외 텍스트 | 제목·본문 작성 시 반영할 추가 지시 |

## Step 1. 상태 수집

독립 명령은 병렬 실행한다.

```bash
git status --short
git branch --show-current
gh repo view --json nameWithOwner,defaultBranchRef --jq '.nameWithOwner + " " + .defaultBranchRef.name'
gh pr view --json url,state 2>/dev/null   # 현재 브랜치에 열린 PR이 있는지
```

다음 중 하나라도 해당하면 **PR을 만들지 말고 중단**하고 보고한다.

- 현재 브랜치가 base 브랜치와 같다 (예: `main`에서 바로 PR 요청). 브랜치를 임의로 만들지 않는다. 새 브랜치 이름을 제안만 한다.
- 커밋되지 않은 변경(`git status --short` 출력)이 있다. PR에 포함할지 알 수 없으므로 `/commit` 후 다시 요청하라고 안내한다.
- 현재 브랜치에 이미 열린 PR이 있다. 중복 생성하지 말고 기존 PR URL을 보고한다.
- `gh` 인증이 안 되어 있다. `! gh auth login` 실행을 안내한다.

## Step 2. 작성 언어 결정

Step 1에서 얻은 `nameWithOwner`로 판단한다.

| 저장소 | 언어 | 템플릿 |
|---|---|---|
| `bleuxsy/react-component-generator` (현재 프로젝트) | 한국어 | `references/pr-template.ko.md` |
| 그 외 모든 저장소 | 영어 | `references/pr-template.en.md` |

- 원격이 없거나 `nameWithOwner`를 얻지 못하면 영어로 작성한다.
- 사용자가 언어를 명시하면("영어로 써줘" 등) 그 지시를 우선한다.
- 템플릿 경로는 이 스킬 디렉터리(`.claude/skills/create-pr/`) 기준이다.
- 선택한 템플릿 파일을 Read로 읽어 구조를 그대로 따른다. 템플릿에 없는 섹션을 임의로 추가하지 않는다.

## Step 3. 변경 분석

```bash
git fetch origin <base>
git log --oneline origin/<base>..HEAD
git diff --stat origin/<base>...HEAD
git diff origin/<base>...HEAD
```

- base 대비 커밋이 없으면 "PR로 올릴 커밋이 없습니다"라고 보고하고 중단한다.
- 마지막 커밋만이 아니라 **base 이후의 모든 커밋**을 PR 범위로 본다.
- diff가 커서 다 읽기 어려우면 `--stat`으로 범위를 잡고 핵심 파일 위주로 읽는다.
- diff에 비밀 정보(`.env` 내용, API 키, 토큰)가 보이면 PR을 만들지 말고 중단하고 보고한다.

## Step 4. 제목·본문 작성

### 제목

커밋 컨벤션과 같은 형식을 쓴다: `<type>: <요약>` (type: feat, fix, refactor, chore)

- 한국어: 50자 이내, 마침표 없이, "~추가", "~수정"처럼 간결체. 예: `feat: 프롬프트 500자 길이 제한 추가`
- 영어: 72자 이내, 명령형 현재 시제, 마침표 없이. 예: `feat: add 500-character prompt limit`
- 커밋이 하나면 그 커밋 메시지를 그대로 쓴다. 여러 개면 전체를 아우르는 요약을 쓴다.

### 본문

- 템플릿의 각 섹션을 diff에서 확인한 사실로만 채운다. 하지 않은 테스트를 했다고 쓰지 않는다.
- 해당 사항이 없는 섹션은 지우지 말고 "없음" / "N/A"로 남긴다.
- 체크리스트는 이 실행에서 실제로 확인한 항목만 `[x]`로 체크한다.
- 대화에 PR attribution 지침(예: `🤖 Generated with [Claude Code](...)`)이 있으면 본문 끝에 붙인다.
- GitHub `@멘션`은 실제 알릴 대상이 아니면 쓰지 않는다.

## Step 5. 검증

이 프로젝트에서는 PR 생성 전에 다음을 실행한다. 다른 저장소에서는 그 저장소 문서에 적힌 테스트·린트 명령을 쓴다.

```bash
bun run test
bun run lint
```

- `bun test`는 쓰지 않는다 (Vitest가 아닌 Bun 내장 러너).
- 실패하면 PR을 만들지 말고 실패 출력과 함께 보고한다.

## Step 6. push 및 PR 생성

PR 생성 요청은 해당 head 브랜치를 push하는 것까지 포함한다. base 브랜치나 다른 브랜치는 push하지 않는다.

```bash
git push -u origin <현재 브랜치>
gh pr create --base <base> --head <현재 브랜치> --title "<제목>" --body-file <본문 파일> [--draft]
```

- 본문은 임시 파일에 써서 `--body-file`로 넘긴다 (따옴표·줄바꿈 깨짐 방지). 생성 후 임시 파일을 지운다.
- `--force` push는 하지 않는다. push가 거부되면(non-fast-forward 등) 중단하고 보고한다.
- push가 네트워크/샌드박스 오류(예: 503)로 실패하면 우회하지 말고, 사용자가 직접 실행할 명령(`! git push -u origin <브랜치>`)을 안내하고 PR 생성은 push 이후로 미룬다.

## Step 7. 결과 보고

다음을 간결하게 보고한다.

- PR URL
- 제목, base ← head, Draft 여부
- 작성 언어와 사용한 템플릿
- 테스트·린트 결과
- 중단했다면: 중단 지점, 이유, 사용자가 할 다음 조치
