# Cloudflare 연결·배포

이 프로젝트는 **Cloudflare Workers + Durable Objects의 SQLite 저장소 + WebSocket**으로 구성되어 있습니다. 별도 서버, D1, Supabase 또는 데이터베이스 비밀번호를 준비하지 않아도 됩니다. 설정은 `wrangler.jsonc`에 포함되어 있으며 첫 배포가 저장소를 생성합니다.

## 현재 운영 주소

https://synergelab-kanban.a01039193588.workers.dev

2026-11-14 사용자가 배포 완료 후 제공한 주소입니다. 본 문서의 계정 연결·배포 명령은 이후 재배포에도 사용할 수 있습니다. 운영 서비스의 동작은 별도 검증 전입니다.

## GitHub에서 자동 배포 (권장)

이미 배포된 Worker가 있으므로 [GIT_DEPLOY.md](./GIT_DEPLOY.md)의 **Settings → Builds → Connect** 절차로 기존 Worker에 GitHub 저장소를 연결할 수 있습니다. 이후 `main` 커밋을 Cloudflare가 직접 빌드·배포하며, 개인 PC에서 아래 명령을 반복할 필요가 없습니다.

## 1. 본인 PC에서 Cloudflare 계정 연결

변경된 프로젝트 파일이 있는 폴더에서 실행하세요. Node.js 22 이상을 권장합니다(검증: Node.js 24).

```sh
npm ci
npx wrangler login
npx wrangler whoami
```

`login`을 실행하면 브라우저가 열립니다. Cloudflare 계정으로 로그인하고 Wrangler 접근을 허용하세요. `whoami`에서 사용할 계정이 맞는지 확인합니다. 계정이 여러 개라면 `CLOUDFLARE_ACCOUNT_ID`에 해당 계정 ID를 지정할 수 있습니다.

API 토큰을 소스 파일이나 채팅에 붙여 넣을 필요가 없습니다. 이 클라우드 채팅 환경의 로그인 상태와 본인 PC의 로그인 상태는 서로 별개입니다.

## 2. 배포

```sh
npm run deploy
```

명령은 프런트엔드를 빌드하고 Worker, 정적 파일, SQLite 기반 Durable Object 바인딩을 함께 배포합니다. 처음 Workers를 쓰는 계정이라면 `workers.dev` 서브도메인 생성 안내를 따라 주세요. 성공 후 터미널에 실제 `https://synergelab-kanban.<계정 서브도메인>.workers.dev` 주소가 표시됩니다. 이 형식 예시와 달리 실제 운영 주소는 위의 ‘현재 운영 주소’에 기록했습니다.

이미 같은 이름의 Worker가 있다면 첫 배포 전에 `wrangler.jsonc`의 `name`을 겹치지 않는 이름으로 변경하세요. 실제 팀 데이터를 저장하기 시작한 뒤에는 Worker 이름·Durable Object 클래스·바인딩·마이그레이션을 임의로 바꾸거나 삭제하지 마세요. 기존 저장소와 다른 저장소를 만들거나 접근을 끊을 수 있습니다.

## 3. 팀원 초대

1. 배포된 주소를 열고 보드의 **공유**를 누릅니다.
2. **링크 복사**로 복사한 전체 주소를 팀원에게 전달합니다.
3. 주소 끝의 `#board=…`까지 포함해야 같은 보드에 접속합니다. 도메인만 전달하면 각자 새 보드를 만들 수 있습니다.
4. 팀원이 다른 브라우저에서 접속해 카드를 수정했을 때 즉시 반영되는지 확인합니다.
5. ‘서버 저장’ 상태에서 브라우저를 닫은 뒤 동일한 공유 링크로 다시 접속해 데이터를 확인합니다.

**팀 계정 로그인과 공유 링크가 모두 있어야 내용을 보고 편집할 수 있습니다.** 봄·대원 계정의 실행 비밀값을 [AUTH.md](./AUTH.md)에 따라 설정하세요. 현재 개별 팀원 권한·링크 회수 기능은 없습니다. 링크는 신뢰하는 팀원에게만 전달하고 즐겨찾기에 보관하세요.

## 저장과 데이터 이동

- ‘저장’이 완료된 카드·메모는 Cloudflare 저장소에 남습니다. 브라우저나 PC를 꺼도 지워지지 않습니다.
- 저장 전 입력 중인 초안은 서버에 저장된 카드와 다릅니다. 오프라인 저장 실패 시 편집 창에 내용을 유지하지만, 저장되지 않은 초안까지 모든 기기에서 보장하지는 않습니다.
- 같은 카드/메모 동시 수정은 충돌을 알리고 작성 중인 내용을 보존합니다. 다른 카드 변경은 자동 병합합니다.
- **로컬 개발 저장소와 Cloudflare 운영 저장소는 별개입니다.** `.wrangler/state`는 로컬 테스트용이며 배포가 이 데이터를 업로드하지 않습니다.
- 이전 버전의 브라우저 저장 데이터는 같은 사이트 주소에서 새 보드를 처음 만들 때 자동으로 서버로 옮기고 원본도 남깁니다. 주소가 달라지면 브라우저 보안 때문에 자동으로 읽을 수 없습니다. 주소를 바꾸기 전에 이전 보드를 JSON으로 내보내 보관하세요.
- 보드 내보내기는 JSON 백업 다운로드입니다. JSON 가져오기 UI는 아직 없습니다.

## 선택: 개인 도메인 연결

기본 `workers.dev` 주소만으로도 공유할 수 있습니다. 개인 도메인이 필요하면 Cloudflare 대시보드의 **Workers & Pages → synergelab-kanban → Settings → Domains & Routes → Add → Custom Domain**에서 Cloudflare가 관리하는 도메인의 서브도메인을 연결하세요. 메뉴명은 대시보드 버전에 따라 조금 다를 수 있습니다. 전환 후 새 도메인 주소에 동일한 `#board=…`를 붙여 기존 보드에 접속합니다.

## 요금과 제한

SQLite 기반 Durable Objects는 Workers Free 플랜에서도 제공됩니다. 요청·저장소 등의 무료 한도를 초과하면 작업이 제한될 수 있습니다. 사용량과 계정 플랜은 배포 전 Cloudflare 대시보드에서 확인하세요. 이 앱은 연결이 한가할 때 비용을 줄이는 WebSocket Hibernation API를 사용합니다.

## 이 환경에서 확인한 범위

사용자가 Cloudflare 배포를 완료하고 운영 주소를 제공했습니다. 이 환경에서 계정 로그인이나 운영 배포를 실행한 것은 아닙니다. 로컬 Workers 런타임에서 실시간 공유, 브라우저 재접속, 서버 재시작 후 저장 유지, 충돌 처리 및 배포 dry-run을 확인합니다. 본인 계정에 배포한 뒤 위 3단계의 실서비스 확인을 한 번 더 해주세요.

공식 안내:

- https://developers.cloudflare.com/workers/wrangler/commands/#login
- https://developers.cloudflare.com/durable-objects/get-started/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
