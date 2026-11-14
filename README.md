# SynergeLab — 팀 칸반 노트

참고 이미지의 파란 탐색 바, 회색 사이드바, 노란색 진행 중 열을 살린 한국어 칸반 앱입니다. **공유 링크로 팀원이 함께 편집하고, 저장된 카드·메모는 서버에 남습니다.**

## 운영 주소

https://synergelab-kanban.a01039193588.workers.dev

2026-11-14 사용자가 배포 주소로 제공했습니다. 이후 운영 작업의 기준 주소입니다. 팀원에게는 앱의 공유 버튼으로 얻은 `#board=…` 포함 링크를 전달합니다.

## GitHub 자동 배포

PC 없이 업데이트하려면 [GitHub 자동 배포 설정](./GIT_DEPLOY.md)을 따라 기존 Cloudflare Worker에 이 저장소를 연결하세요. 연결 후 `main` 변경이 자동 배포됩니다. GitHub 웹에서 파일을 수정해도 됩니다.

## 계정 설정

[AUTH.md](./AUTH.md)에 따라 `AUTH_PASSWORD_BOM`, `AUTH_PASSWORD_DAEWON`을 Worker 실행 비밀값으로 먼저 등록하세요. 로그인 화면을 포함한 변경을 배포하기 전에 설정해야 합니다.

## Cloudflare 연결

[CLOUDFLARE.md](./CLOUDFLARE.md)에 로그인·배포·초대·도메인 설정을 정리했습니다. 본인 PC의 프로젝트 폴더에서:

```sh
npm ci
npx wrangler login
npx wrangler whoami
npm run deploy
```

배포 후 앱의 **공유** 버튼으로 전체 링크를 전달하세요. 팀 계정으로 로그인한 팀원이 링크로 열람/편집할 수 있습니다. 운영 배포 주소는 위에 기록되어 있으며, 이 환경의 자동 검증은 로컬 런타임에서 수행했습니다.

## 로컬 개발

Node.js 22+ 권장(검증 24.22.1). 먼저 [계정 설정](./AUTH.md)에 따라 Git에서 제외된 `.dev.vars`에 로컬 개발용 비밀번호 두 개를 넣고 정적 파일 디렉터리를 생성합니다.

```sh
npm ci
npm run build
npm run dev -- --host 0.0.0.0 --port 4173
```

한 명령으로 Vite(4173)와 로컬 Cloudflare 런타임(8787)을 시작합니다. API/WebSocket은 동일한 앱 주소로 프록시됩니다. 종료하면 두 프로세스가 함께 종료됩니다. 로컬 데이터는 `.wrangler/state`에 보존됩니다. 이 디렉터리를 지우면 로컬 데이터가 삭제됩니다. 운영 Cloudflare 데이터와는 별개입니다.

## 기능

- 3열 칸반·목록, 카드 생성/수정/삭제/복원, 드래그 및 선택으로 상태 이동
- 검색·담당자·라벨 필터, 팀 메모, 보드 이름 변경, JSON 내보내기
- Cloudflare Durable Objects(SQLite)에 영구 저장, WebSocket 실시간 동기화
- 자동 재연결, 오프라인 저장 오류 시 초안 유지, 같은 카드/메모 충돌 감지
- 서로 다른 카드 수정 자동 병합, 중복 저장 재시도 보호
- 브라우저 로컬 저장 구버전에서 같은 사이트 주소로 최초 공유 보드 생성 시 데이터 이관
- 모바일·키보드 지원

봄·대원 두 계정으로 비밀번호만 입력해 로그인합니다. ‘내 할 일’은 현재 계정의 카드이며 왼쪽 큰 프로필에서 사진 등록·제거와 로그아웃을 할 수 있습니다. 비밀번호는 Cloudflare 실행 비밀값으로 관리합니다([설정 안내](./AUTH.md)). 기존 카드의 예전 담당자 정보는 보존합니다. 역할별 보드 권한, 링크 회수 및 JSON 가져오기 UI는 아직 없습니다. 서버에 저장된 데이터는 브라우저를 닫아도 유지되지만 저장 전 초안은 별개입니다.

## 검증

```sh
npm test
npm run build
npm run format:check
npm run deploy:check
# 개발 서버 실행 후:
npm run test:e2e
# 로컬 서버를 완전히 종료·재시작하는 사이에 실행:
node scripts/check-persistence.mjs create
# npm run dev 재시작 후
node scripts/check-persistence.mjs verify
```

브라우저 테스트는 `/usr/bin/chromium`을 기본으로 사용합니다. 다른 설치 경로는 `CHROMIUM_PATH`로 지정하세요. 테스트는 매번 별도 테스트 보드를 생성합니다.

## 구조

- `src/main.jsx`, `src/styles.css`: 기존 UI와 편집 흐름
- `src/useSharedBoard.js`: 서버 저장, 공유 링크, 실시간 연결·재연결
- `src/shared-board.js`: 검증·동시 편집 병합 정책
- `worker/index.js`: API, SQLite 저장, WebSocket Hibernation
- `wrangler.jsonc`: 배포·저장소 바인딩·마이그레이션
- `scripts/dev.mjs`: 프런트엔드/백엔드 개발 실행
- `tests/`: 단위·브라우저·실시간·API 검증
