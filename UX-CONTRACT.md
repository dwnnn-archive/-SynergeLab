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

## 헤더 탐색

사이트 상단 헤더가 팀 보드·내 할 일·팀 메모·도움말·설정·프로필의 공통 소유자입니다. 모바일에서는 같은 항목을 헤더의 두 번째 줄에 유지합니다. 작성 중인 카드 이어쓰기는 보드 옵션 메뉴에서 접근합니다. 좁은 화면에서도 보드 이동·검색·새 카드·공유 기능을 유지합니다.

## Git 작성 규칙

커밋과 PR 제목은 반드시 한글로 작성합니다. Description도 한글로 작성하고 변경 이유, 구체적인 수정 내용, 검증 결과, 주의사항을 상세히 기록합니다.
