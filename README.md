# OpenCode Workflow Controller

OpenCode에서 기능 개발을 일정한 단계와 검토 지점으로 나누어 진행하기 위한 전역 설정입니다. 프로젝트 유형에 따라 두 가지 워크플로우를 제공합니다.

| 프로젝트 유형 | 운영 방식 | 시작 명령 | 상태 저장소 |
| --- | --- | --- | --- |
| Software / App | Workflow Controller가 단계와 Human Gate를 관리하고 OMO worker를 디스패치 | `/start <profile> <goal>` | 프로젝트의 `.workflow/` |
| Game | OpenCode Game Studios(OGS)가 질문과 결정을 중심으로 진행하며 사용자가 다음 단계를 선택 | `/game/start` | 프로젝트의 `.opencode/` |

Game workflow에는 관리형 `.workflow/state.json`을 만들지 않습니다. 두 family를 전환할 때는 기존 family를 명시적으로 바꾸겠다는 사용자 승인이 필요합니다.

## 빠른 시작

OpenCode를 이 설정으로 실행한 뒤, 프로젝트 디렉터리에서 다음 순서로 사용합니다.

### Software / App

```text
/family-status
/init software
/start full 사용자 목표를 구체적으로 작성
```

처음부터 모든 검토 단계를 거칠 필요가 없으면 다음 프로필을 선택할 수 있습니다.

```text
/start quick 로그인 화면에 비밀번호 재설정 추가
/start bugfix 로그인 후 세션이 사라지는 문제
/start prototype 새 추천 알고리즘의 사용자 반응 검증
```

### Game

```text
/family-status
/init game godot
/game/start
```

엔진은 `unity`, `godot`, `unreal`, `gamemaker`, `roblox`, `love`, `bevy`, `phaser`, `pixijs`, `threejs`, `pygame`, `unknown` 중 하나를 사용할 수 있습니다. Game 경로는 `/game/start`에서 질문 → 선택지 → 결정 → 초안 → 승인 순서로 진행되며, 다음 skill을 자동으로 실행하지 않습니다.

## Software / App workflow

모든 단계는 controller가 관리합니다. worker는 현재 단계에 필요한 artifact를 만들고 `workflow_complete_stage`를 호출합니다. controller는 다음 non-human worker를 자동으로 디스패치하며, 명시된 Human Gate 또는 구체적인 `HUMAN_REQUIRED` 판단에서만 멈춥니다.

### Full

제품 정의와 설계를 충분히 검토한 뒤 구현하는 고신뢰 경로입니다.

```text
FEATURE_DEFINITION → USER_FLOW → OPEN_DESIGN
→ PRODUCT_REVIEW [Human Gate]
→ ARCHITECTURE → TASK_DECOMPOSITION → TRACEABILITY_CHECK → TDD_PLAN
→ IMPLEMENTATION_REVIEW [Human Gate]
→ BUILD → TASK_REVIEW (반복)
→ INTEGRATION_REVIEW → COMPLETION_GATE → COMPLETE
```

주요 명령은 다음과 같습니다.

```text
/approve-design        제품 설계 승인
/approve-plan          구현 계획 승인
/build [TASK-ID]       승인된 task 하나 구현
/review [TASK-ID]      독립 검토
/complete              통합 검증 및 최종 완료
```

### Quick

범위가 작고 빠른 검증이 가능한 일반 기능에 사용합니다.

```text
REQUIREMENT → OPEN_DESIGN_LITE → LIGHT_PLAN → TASK_DEFINITION
→ BUILD → TASK_REVIEW (반복) → COMPLETE
```

구현 중 요구사항, UX, API, 데이터 영향 또는 아키텍처에 사람의 판단이 필요하면 workflow가 Human Review를 요청할 수 있습니다.

### Bugfix

수정 전에 재현과 원인 분석을 끝내고 회귀 검사를 준비하는 경로입니다.

```text
BUG_REPORT → REPRODUCE → ROOT_CAUSE → AFFECTED_SCOPE
→ REGRESSION_TEST → FIX → REGRESSION_REVIEW
→ DOCUMENTATION_CHECK → COMPLETE
```

불확실한 원인, 데이터 손실 위험, migration, 아키텍처 재설계 또는 제품 결정을 발견하면 바로 수정하지 않고 Human Review로 올립니다.

### Prototype

가설을 최소한으로 검증한 뒤 계속할지 결정하는 경로입니다.

```text
GOAL → SUCCESS_CRITERIA → CONSTRAINTS → USER_FLOW → OPEN_DESIGN
→ BUILD → PROTOTYPE_REVIEW → EVALUATE → DECISION → COMPLETE
```

프로토타입은 `opencode-go/qwen3.8-flash` builder가 최소 구현을 맡고, 독립 review와 verification이 자동으로 `KEEP`, `ITERATE`, `DROP` 중 하나를 기록합니다. `KEEP`은 자동으로 정식 개발로 전환하지 않으며, 새 `/start quick ...` 또는 `/start full ...`을 시작합니다.

## Human Gate 사용법

Human Gate는 artifact가 존재한다는 이유만으로 통과하지 않습니다. 사용자가 내용을 확인하고 명시적으로 승인해야 합니다.

| 멈춘 단계 | 확인할 내용 | 다음 명령 |
| --- | --- | --- |
| `PRODUCT_REVIEW` | 요구사항, user flow, wireframe, 상태/상호작용, design review | `/approve-design` |
| `IMPLEMENTATION_REVIEW` | architecture, task dependency, traceability, TDD plan | `/approve-plan` |

수정이 필요하면 해당 gate를 승인하지 말고 `/design <변경 요청>` 또는 `/plan <변경 요청>`으로 다시 작업합니다. 현재 gate를 범용적으로 승인할 때는 `/approve`를 사용할 수 있습니다.

`.workflow/state.json`은 controller 전용 파일입니다. 직접 편집하지 말고 `workflow_*` 도구 또는 위의 slash command를 사용합니다.

## 기존 프로젝트에서 시작하기

기존 문서와 구현이 있는 프로젝트에서는 먼저 상태를 조사합니다.

```text
/workflow-inspect full
/start full --from auto 기존 결제 흐름에 환불 기능 추가
```

`/start`에 `--from`을 생략하면 먼저 안전한 시작 지점을 추천하고, 바로 시작하지 않을 수 있습니다. 필요한 경우 다음 옵션을 사용할 수 있습니다.

```text
/start full --from planning --source FEATURE_DEFINITION=docs/PRD.md --source OPEN_DESIGN=docs/design.md 목표
/start full --from build --verified-gate product_design --verified-gate implementation_plan 목표
```

`--verified-gate`는 과거에 사람이 실제로 승인한 자료일 때만 사용합니다. 단순히 문서가 존재한다는 이유로 gate를 우회하지 않습니다.

## 상태 확인과 재개

```text
/workflow-status       단계, gate, task, blocker, 다음 명령
/status                 현재 workflow 상태와 다음 작업
/resume                 중단된 workflow를 안전하게 재개
/workflow-skip 사유    현재 non-gate 단계 건너뛰기
```

`/workflow-skip`은 현재 단계만 건너뛸 수 있고, Human Gate나 terminal stage는 건너뛸 수 없습니다. 건너뛴 이유는 workflow history에 남습니다.

## 명령어 둘러보기

| 목적 | 명령 |
| --- | --- |
| Family 확인/초기화 | `/family-status`, `/init software`, `/init game <engine>` |
| Workflow 초기화/조사 | `/workflow-init`, `/workflow-inspect` |
| 시작 | `/start`, `/full/start`, `/quick/start`, `/bugfix/start`, `/prototype/start` |
| 설계/계획 | `/design`, `/plan`, `/full/design`, `/full/plan` |
| 구현/검토 | `/build`, `/review`, `/quick/build` |
| 완료 검증 | `/complete`, `/full/verify` |
| 승인 | `/approve`, `/approve-design`, `/approve-plan` |
| Bugfix 단계 | `/bugfix/analyze`, `/bugfix/review` |
| 상태/제어 | `/status`, `/workflow-status`, `/resume`, `/workflow-skip <reason>` |
| Game onboarding | `/game/start` |

대부분의 명령은 현재 workflow stage와 필요한 artifact를 확인합니다. 명령을 직접 호출할 때도 controller가 허용하지 않는 단계 전환이나 누락된 artifact를 차단합니다.

## 생성되는 artifact

Software / App workflow를 초기화하면 프로젝트에 다음 구조가 생깁니다.

```text
.workflow/
├── state.json                    # controller가 관리하는 현재 run 포인터
└── runs/
    └── <run-id>/                 # 기능 또는 bugfix/prototype 단위 산출물
        ├── traceability.json     # 요구사항 ↔ task ↔ test 추적성
        ├── requirements/         # feature spec, bug report 등
        ├── design/               # DESIGN.md, user flow, wireframe, screen
        ├── architecture/         # architecture와 ADR, bug 원인/영향 범위
        ├── tasks/                # tasks.json, TDD plan, regression tests
        ├── prototypes/           # prototype 제약, build, 평가, 결정
        └── reviews/              # task, regression, integration, final 검토
```

새 workflow를 시작하면 고유한 `run-id`가 생성되어 이전 기능의 산출물을 덮어쓰지 않습니다. worker는 `.workflow/state.json`의 `workflow.artifact_root`가 가리키는 현재 run 안에서만 자신의 stage artifact를 수정합니다. 제품 소스와 테스트 수정은 승인된 구현 단계 이후에만 허용됩니다.

Game family를 초기화하면 프로젝트에 `.opencode/` 기반 OGS agent, skill, rule, 문서가 설치되고 `.opencode/workflow-family.json`에 선택한 family와 engine이 기록됩니다.

## 이 설정을 다른 위치로 옮길 때

`opencode.jsonc`의 plugin 목록은 OMO, Ponytail, 그리고 이 디렉터리의 `plugins/workflow-controller.ts`를 로드합니다. 디렉터리를 옮기면 해당 `file://` plugin 경로를 새 절대 경로로 바꿔야 합니다.

구현을 수정한 뒤에는 다음 테스트를 실행합니다.

```bash
node --test workflow/*.test.mjs plugins/*.test.mjs
```
