# UI contract

## Scope and authority

User brief: simple Kanban notes for a small personal team, inspired by supplied screenshot, implementation choices delegated. User follow-up explicitly requests real-time team sharing, persistence after browser close, and Cloudflare connection guidance. Cloudflare Workers + SQLite-backed Durable Objects own shared state; WebSockets broadcast saved changes. A valid team-account session and a 192-bit random board link are both required for read/write. The user requested password-only accounts 봄 and 대원, and later added 세현 without a password. 세현 can be assigned tasks but cannot sign in until a password is configured. Active accounts have the same board permissions. See AUTH.md for the server-owned authentication contract. The four retired assignee IDs are accepted only for migration and normalized to unassigned; tasks are editable. Cards can freely move between three statuses. Removal uses an in-app confirmation and Undo. Backup is a local JSON download.

## Canonical UI Map

| Capability     | Canonical owner       | Source of truth | Allowed variants                        | Verification      |
| -------------- | --------------------- | --------------- | --------------------------------------- | ----------------- |
| Select/Listbox | Native select         | UX-CONTRACT.md  | Filter and editor; OS popup accepted    | Browser selection |
| Form           | Editor dialog         | src/main.jsx    | Create/edit, validation                 | CRUD browser test |
| Scrollbar      | Global stylesheet     | DESIGN.md       | Column cards and mobile board scrolling | Narrow screenshot |
| Toast          | App live status       | src/main.jsx    | Save, move, remove with undo            | Browser test      |
| CRUD           | App commit and editor | src/main.jsx    | Return to current board/list            | Browser test      |

## Flow ledger

Create/edit saves return to current view. Invalid titles retain the editor and focus title. Native dialog provides focus containment, Escape, and focus restoration. Drafts persist in session storage across modal dismissal; explicit Cancel discards the draft. Search is immediate and local, not written to URL because queries may contain private task text. Status selection provides keyboard/touch alternative to dragging. Native select popups intentionally platform-owned.

## Storage

Cloudflare Durable Object SQLite is authoritative. HTTP mutation completion acknowledges durable storage; only confirmed saved board data updates the screen. WebSocket snapshots are versioned to reject stale arrivals. Independent card changes merge; same-card, board-name or memo conflicts return 409 and preserve the editor draft for explicit review. Save retries use stable creation IDs. Failed saves retain the draft and never claim success. Drafts and their edit baseline are retained in sessionStorage; the browser stores the last shared board ID in localStorage. Legacy local data is migrated on initial board creation at the same origin and retained locally. Shared links identify the board; authenticated team accounts are required to access it. Draft keys include the account ID. Existing Cloudflare namespace is preserved across deployments. Test/local and deployed Cloudflare data are separate.

## Git 작성 규칙

커밋과 PR 제목은 반드시 한글로 작성합니다. Description도 한글로 작성하고 변경 이유, 구체적인 수정 내용, 검증 결과, 주의사항을 상세히 기록합니다.

## 카드 위치 이동

사용자가 요청한 삽입선은 실제 저장될 위치를 표시합니다. 같은 열 안에서 순서를 바꾸거나 다른 열로 옮길 수 있으며, 드롭·취소·보드 이탈 시 표시선을 제거합니다. 저장 확인 전까지 화면 순서는 유지하고 저장 실패 시 기존 오류 안내를 표시합니다. 필터로 숨겨진 카드는 삭제하거나 재정렬하지 않습니다. 필터 결과가 비어 있는 열에 놓으면 해당 열 전체의 맨 아래에 저장합니다.

카드의 선택적 숫자 `position` 필드가 정렬 순서를 소유합니다. 서버는 위치 값이 없는 기존 카드를 원래 배열 순서로 읽어 호환성을 유지합니다. 일반적인 이동은 이동한 카드의 위치만 바꾸며, 숫자 간격이 소진되거나 동률 사이에 삽입하면 대상 열의 간격만 재배치합니다. 같은 카드의 동시 수정은 기존 409 충돌 처리로 보호하고, 다른 카드의 독립적인 변경은 병합합니다. 순서는 서버 저장·실시간 공유·새로고침에 동일하게 적용합니다. 터치·키보드 사용자는 카드 편집창의 네이티브 ‘카드 위치’ 선택으로 같은 작업을 수행합니다.

## 로그인과 프로필

사용자 요청에 따라 비밀번호 한 칸으로 봄·대원 계정을 식별합니다. 추가된 세현 계정은 비밀번호 미설정으로 로그인할 수 없으며 담당자 목록에는 표시합니다. 인증의 소유자는 서버 AuthRoom이며 클라이언트 AuthProvider는 확인된 세션이 있을 때만 보드를 마운트합니다. 로그인 배경은 강하게 흐린 정적 예시 화면이며 실제 보드 내용은 포함하지 않습니다. 비밀번호 오류는 팝업 없이 입력칸 아래 ‘틀렸습니다.’로 표시하고 입력값을 지웁니다.

왼쪽 큰 프로필은 현재 로그인한 계정의 사진 또는 이름 첫 글자를 표시하며 기존 공통 편집 대화상자에서 사진 등록·변경·제거와 로그아웃을 제공합니다. 사진은 서버의 해당 계정 프로필에 저장합니다. 입력과 저장 실패 시 기존 사진은 유지하며 오류를 화면 안에 표시합니다. 로그인·사진 저장 규칙과 환경 설정은 AUTH.md를 따릅니다.

삭제한 지민·수현·하린·도윤은 필터·담당자 선택·아바타 목록에서 제거합니다. 서버는 기존 카드의 해당 담당자 ID를 빈 값으로 바꾸고 최초 조회 시 배정 해제를 저장합니다. 이전 창의 수정 요청과 임시 초안도 삭제한 담당자를 복원하지 않습니다. 카드 내용·순서는 유지합니다.

## 화면 구성과 새 카드 생성

보드 위의 경로·소개·제목 영역은 제거하며 보드 이름은 접근성을 위한 숨은 제목과 설정에서 유지합니다. 탭은 왼쪽, 라벨·사용자·검색은 오른쪽에 같은 줄로 배치합니다. 좁은 화면에서는 필터만 두 번째 줄로 내려갑니다. 공유는 보드 옵션의 ‘공유 링크 복사’에서 이용합니다. 저장 상태와 완료 진행률은 하단에 표시합니다.

새 카드 창에는 위치 선택이 없으며 현재 보드의 대상 열 맨 앞에 저장합니다. 작성 중 다른 팀원이 추가한 카드도 유지하고 현재 순서를 기준으로 삽입합니다. 기존 카드 수정에는 위치 선택을 유지합니다. 서버 저장에 성공한 뒤에만 새 카드 등장 및 기존 카드의 짧은 페이드·하강 애니메이션을 실행합니다. 저장 실패 시 편집 초안과 기존 순서를 보존하고 모션 줄이기 설정에서는 애니메이션을 생략합니다.

열의 높이는 화면의 남은 높이에 맞추고 열 제목과 추가 버튼은 고정합니다. 카드가 많으면 열 안에서 세로 스크롤하며 목록 보기 역시 자체 영역에서 스크롤합니다. 모바일은 열을 가로로 넘길 수 있습니다. 완료 열은 연한 연두색, 우선 카드는 호박색 왼쪽 테두리와 깃발 배지로 구분하며 색상 외에도 ‘완료’·‘우선’ 텍스트를 유지합니다.

## 팝업 스크롤 성능

카드 편집·팀 메모 등 공통 팝업은 반투명 어두운 배경으로 구분하고 전체 화면에 적용하던 backdrop-filter 흐림 효과를 사용하지 않습니다. 브라우저의 기본 스크롤과 입력·초점·저장 동작을 유지합니다. 로그인 전 정적 배경에 적용한 흐림 효과는 별도입니다.
