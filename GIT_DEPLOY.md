# GitHub에서 업데이트하기

이 프로젝트는 **Cloudflare Workers Builds의 GitHub 연동**을 사용합니다. 처음 한 번 Cloudflare 대시보드에서 저장소를 연결하면 `main`에 들어온 변경을 Cloudflare가 직접 빌드·배포합니다. 이후 PC에서 CMD 창이나 배포 명령을 실행할 필요가 없습니다.

## 기존 Worker에 저장소 연결 (최초 1회)

1. 먼저 이 앱의 소스와 `wrangler.jsonc`가 GitHub `dwnnn-archive/-SynergeLab` 저장소의 `main`에 들어있는지 확인합니다. 준비 브랜치의 변경을 사용한다면 해당 브랜치를 `main`으로 합칩니다.
2. [Cloudflare 대시보드](https://dash.cloudflare.com/) → **Workers & Pages** → 기존 **synergelab-kanban** Worker를 엽니다. 새 Worker를 생성하는 절차가 아닙니다.
3. **Settings → Builds → Connect**를 선택하고 GitHub 계정을 승인합니다. 저장소 접근을 선택할 때 `dwnnn-archive/-SynergeLab`만 허용하면 됩니다.
4. 저장소를 선택하고 아래 값을 입력합니다.

| 항목                                   | 값                                                  |
| -------------------------------------- | --------------------------------------------------- |
| Repository                             | `dwnnn-archive/-SynergeLab`                         |
| Production branch                      | `main`                                              |
| Root directory                         | 저장소 루트 `/`                                     |
| Build command                          | `npm test && npm run format:check && npm run build` |
| Deploy command                         | `npx wrangler deploy`                               |
| Build variable                         | `NODE_VERSION` = `24.22.1`                          |
| Non-production / preview branch builds | 초기에는 끔                                         |

5. 빌드 토큰 선택 화면이 나오면 Cloudflare 안에서 토큰 생성/선택 절차를 진행합니다. GitHub Secrets에 별도 Cloudflare 토큰을 복사할 필요는 없습니다.
6. 연결을 저장한 뒤 첫 빌드를 실행하거나 `main`에 변경을 커밋합니다. **Deployments / Build history**에서 성공 여부를 확인합니다.

메뉴명은 Cloudflare 대시보드 버전에 따라 조금 다를 수 있습니다. 실제 계정에서의 GitHub 앱 승인과 저장소 연결은 계정 소유자가 완료해야 합니다. 코드에 설정 파일을 추가하는 것만으로 대시보드 연결이 자동 생성되지는 않습니다.

## 이후에는 GitHub에서 수정

1. [GitHub 저장소](https://github.com/dwnnn-archive/-SynergeLab)에서 수정할 파일을 엽니다.
2. 연필 아이콘(Edit)을 누릅니다. 카드 간격·색상은 `src/styles.css`, 카드 내용/화면 구성은 `src/main.jsx`에 있습니다.
3. 변경 후 **Commit changes**를 선택합니다. 바로 `main`에 커밋하거나 별도 브랜치에서 Pull Request를 만들고 검토 후 병합합니다.
4. Cloudflare가 자동 빌드하고 기존 서비스에 반영합니다. 빌드 실패 시 기존 정상 배포는 유지됩니다.

운영 주소: https://synergelab-kanban.a01039193588.workers.dev

## 검증과 저장 데이터

`.github/workflows/ci.yml`은 Pull Request와 `main` 변경에서 단위 테스트, 코드 형식, 빌드 및 Wrangler 배포 사전 검사를 실행합니다. **GitHub Actions는 운영 배포를 실행하지 않습니다.** 실제 자동 배포는 Cloudflare Workers Builds가 담당합니다. 두 번 배포하는 중복 워크플로를 추가하지 마세요.

Cloudflare 빌드 명령에도 테스트와 형식 검사를 넣었으므로, 이 검사 실패 시 배포 단계로 넘어가지 않습니다. GitHub 검사와 Cloudflare 빌드는 별개이며, GitHub Actions 완료를 기다리는 설정은 아닙니다.

기존 Worker 이름 `synergelab-kanban`, Durable Object 클래스 `BoardRoom`, 바인딩 `BOARDS`, 기존 마이그레이션을 유지합니다. UI 코드 업데이트가 보드 데이터를 초기화하지 않습니다. 로컬 `.wrangler/state`, 환경 변수 파일, 로그인 정보, `node_modules`, `dist`는 Git에 올리지 않습니다.

공유 링크는 계속 `#board=…`를 포함한 전체 링크를 사용하세요. 링크를 가진 사람은 해당 보드를 읽고 편집할 수 있습니다.

공식 안내: https://developers.cloudflare.com/workers/ci-cd/builds/
