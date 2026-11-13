# UI contract

## Scope and authority

User brief: simple Kanban notes for a small personal team, inspired by supplied screenshot, implementation choices delegated. User follow-up explicitly requests real-time team sharing, persistence after browser close, and Cloudflare connection guidance. Cloudflare Workers + SQLite-backed Durable Objects own shared state; WebSockets broadcast saved changes. Possession of a 192-bit random board link grants read/write; there is no separate identity, member authorization or revocation. Example member names are fixed; tasks are editable. Cards can freely move between three statuses. Removal uses an in-app confirmation and Undo. Backup is a local JSON download.

## Canonical UI Map

| Capability     | Canonical owner       | Source of truth | Allowed variants                     | Verification      |
| -------------- | --------------------- | --------------- | ------------------------------------ | ----------------- |
| Select/Listbox | Native select         | UX-CONTRACT.md  | Filter and editor; OS popup accepted | Browser selection |
| Form           | Editor dialog         | src/main.jsx    | Create/edit, validation              | CRUD browser test |
| Scrollbar      | Global stylesheet     | DESIGN.md       | Horizontal board scrolling           | Narrow screenshot |
| Toast          | App live status       | src/main.jsx    | Save, move, remove with undo         | Browser test      |
| CRUD           | App commit and editor | src/main.jsx    | Return to current board/list         | Browser test      |

## Flow ledger

Create/edit saves return to current view. Invalid titles retain the editor and focus title. Native dialog provides focus containment, Escape, and focus restoration. Drafts persist in session storage across modal dismissal; explicit Cancel discards the draft. Search is immediate and local, not written to URL because queries may contain private task text. Status selection provides keyboard/touch alternative to dragging. Native select popups intentionally platform-owned.

## Storage

Cloudflare Durable Object SQLite is authoritative. HTTP mutation completion acknowledges durable storage; only confirmed saved board data updates the screen. WebSocket snapshots are versioned to reject stale arrivals. Independent card changes merge; same-card, board-name or memo conflicts return 409 and preserve the editor draft for explicit review. Save retries use stable creation IDs. Failed saves retain the draft and never claim success. Drafts and their edit baseline are retained in sessionStorage; the browser stores the last shared board ID in localStorage. Legacy local data is migrated on initial board creation at the same origin and retained locally. Shared links grant access and must be treated as private team links. Existing Cloudflare namespace is preserved across deployments. Test/local and deployed Cloudflare data are separate.

## Git 작성 규칙

커밋과 PR 제목은 반드시 한글로 작성합니다. Description도 한글로 작성하고 변경 이유, 구체적인 수정 내용, 검증 결과, 주의사항을 상세히 기록합니다.

## 카드 위치 이동

사용자가 요청한 삽입선은 실제 저장될 위치를 표시합니다. 같은 열 안에서 순서를 바꾸거나 다른 열로 옮길 수 있으며, 드롭·취소·보드 이탈 시 표시선을 제거합니다. 저장 확인 전까지 화면 순서는 유지하고 저장 실패 시 기존 오류 안내를 표시합니다. 필터로 숨겨진 카드는 삭제하거나 재정렬하지 않습니다. 필터 결과가 비어 있는 열에 놓으면 해당 열 전체의 맨 아래에 저장합니다.

카드의 선택적 숫자 `position` 필드가 정렬 순서를 소유합니다. 서버는 위치 값이 없는 기존 카드를 원래 배열 순서로 읽어 호환성을 유지합니다. 일반적인 이동은 이동한 카드의 위치만 바꾸며, 숫자 간격이 소진되거나 동률 사이에 삽입하면 대상 열의 간격만 재배치합니다. 같은 카드의 동시 수정은 기존 409 충돌 처리로 보호하고, 다른 카드의 독립적인 변경은 병합합니다. 순서는 서버 저장·실시간 공유·새로고침에 동일하게 적용합니다. 터치·키보드 사용자는 카드 편집창의 네이티브 ‘카드 위치’ 선택으로 같은 작업을 수행합니다.
