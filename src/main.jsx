import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  SquaresFour,
  MagnifyingGlass,
  Plus,
  Kanban,
  List,
  CaretDown,
  Check,
  CheckCircle,
  X,
  NotePencil,
  Users,
  GearSix,
  Question,
  ArrowSquareOut,
  DownloadSimple,
  Flag,
  DotsThree,
  ArrowRight,
  CloudCheck,
  LockSimple,
  SidebarSimple,
  Trash,
  ArrowCounterClockwise,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import {
  KEY,
  SEED,
  STATUSES,
  MEMBERS,
  activeMember,
  TAGS,
  validBoard,
  filterTasks,
  nextId,
  orderedTasks,
  placeTask,
} from "./model";
import "./styles.css";
import { useSharedBoard } from "./useSharedBoard";
import { AuthProvider, useAuth } from "./auth.jsx";
import { useCardMotion } from "./useCardMotion";
import { ProfileSettings } from "./ProfileSettings.jsx";

function Avatar({ id, size = "", ...props }) {
  const { members } = useAuth();
  const member =
    members.find((m) => m.id === id) || MEMBERS.find((m) => m.id === id);
  return (
    <span
      className={`avatar ${member?.color || "empty"} ${size}`}
      title={member?.name || "담당자 없음"}
      {...props}
    >
      {member?.avatar ? (
        <img src={member.avatar} alt="" />
      ) : member ? (
        member.name.slice(0, 1)
      ) : (
        <Users size={13} />
      )}
    </span>
  );
}
function App() {
  const { user } = useAuth();
  const { board, id: boardId, status, loadError, save } = useSharedBoard();
  const [storageError, setStorageError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false),
    editBase = useRef(null),
    resumeBase = useRef(null);
  const [view, setView] = useState("board"),
    [query, setQuery] = useState(""),
    [member, setMember] = useState(""),
    [tag, setTag] = useState(""),
    [mine, setMine] = useState(false),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(null),
    [draft, setDraft] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [deleted, setDeleted] = useState(null),
    [drag, setDrag] = useState(""),
    [over, setOver] = useState(null),
    [deleteConfirm, setDeleteConfirm] = useState(false),
    [closeConfirm, setCloseConfirm] = useState(false);
  const dialog = useRef(null),
    search = useRef(null),
    titleInput = useRef(null),
    toastTimer = useRef();
  const boardElement = useRef(null);
  const createdCard = useRef(null);
  useCardMotion(boardElement, board, Boolean(modal || drag), createdCard);
  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    if (modal) {
      editBase.current = resumeBase.current || board;
      resumeBase.current = null;
      dialog.current?.showModal();
      requestAnimationFrame(() =>
        dialog.current?.querySelector("input,textarea")?.focus(),
      );
    } else dialog.current?.close();
    setDeleteConfirm(false);
    setCloseConfirm(false);
    setError("");
  }, [modal]);
  useEffect(() => {
    if (modal === "task" && draft) {
      try {
        sessionStorage.setItem(
          `synergelab-draft-${user.id}-${boardId}`,
          JSON.stringify({ draft, base: editBase.current }),
        );
      } catch {}
    }
  }, [modal, draft]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") setMenu(false);
      if (
        e.key === "/" &&
        !modal &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement.tagName,
        )
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [modal]);
  async function commit(next, message, base = board) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await save(base, next);
      setStorageError("");
      setConflict(false);
      if (message) notify(message);
      return true;
    } catch (error) {
      const text =
        error.status === 409
          ? error.message
          : "서버에 저장하지 못했습니다. 입력한 내용은 유지됩니다. 연결을 확인한 뒤 다시 저장해 주세요.";
      setStorageError(text);
      setError(text);
      setConflict(error.status === 409);
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function openTask(task, status = "todo") {
    setDraft(
      task
        ? { ...task }
        : {
            id: null,
            newId: `SL-${crypto.randomUUID()}`,
            title: "",
            description: "",
            status,
            tag: "기획",
            member: "",
            priority: false,
          },
    );
    setModal("task");
  }
  function close(discard = false) {
    if (busyRef.current) return;
    if (
      !discard &&
      ((modal === "memo" && draft.memo !== board.memo) ||
        (modal === "settings" && draft.name !== board.name))
    ) {
      setCloseConfirm(true);
      return;
    }
    if (discard && modal === "task") {
      try {
        sessionStorage.removeItem(`synergelab-draft-${user.id}-${boardId}`);
      } catch {}
    }
    setModal(null);
  }
  function resumeDraft() {
    try {
      const d = JSON.parse(
        sessionStorage.getItem(`synergelab-draft-${user.id}-${boardId}`),
      );
      const restored = d?.draft || d;
      if (restored && typeof restored.title === "string") {
        resumeBase.current = validBoard(d?.base) ? d.base : null;
        setDraft({
          ...restored,
          member: activeMember(restored.member),
          newId: restored.newId || `SL-${crypto.randomUUID()}`,
        });
        setModal("task");
        return;
      }
    } catch {}
    openTask(null);
  }
  async function saveTask(e) {
    e.preventDefault();
    if (e.nativeEvent.isComposing) return;
    if (!draft.title.trim()) {
      setError("카드 제목을 입력해 주세요.");
      titleInput.current?.focus();
      return;
    }
    const task = {
      ...draft,
      title: draft.title.trim(),
      id: draft.id || draft.newId,
    };
    const base = draft.id ? editBase.current || board : board;
    let tasks = draft.id
      ? base.tasks.map((t) => (t.id === draft.id ? task : t))
      : [...base.tasks, task];
    const changedStatus =
      draft.id &&
      base.tasks.find((t) => t.id === draft.id)?.status !== task.status;
    if (
      !draft.id ||
      changedStatus ||
      (draft.beforeId !== undefined && draft.beforeId !== "keep")
    ) {
      const beforeId = !draft.id
        ? (orderedTasks(base.tasks).find((t) => t.status === task.status)?.id ??
          null)
        : draft.beforeId && draft.beforeId !== "keep"
          ? draft.beforeId
          : null;
      if (
        beforeId &&
        !tasks.some((t) => t.id === beforeId && t.status === task.status)
      ) {
        setError("선택한 카드 위치가 바뀌었습니다. 위치를 다시 선택해 주세요.");
        return;
      }
      tasks = placeTask(tasks, task.id, task.status, beforeId);
    }
    if (!draft.id) createdCard.current = task.id;
    if (
      await commit(
        { ...base, tasks },
        draft.id ? "카드를 수정했어요." : "새 카드를 추가했어요.",
        base,
      )
    )
      close(true);
    else createdCard.current = null;
  }
  async function move(id, status, beforeId = null) {
    setDrag("");
    setOver(null);
    const tasks = placeTask(board.tasks, id, status, beforeId);
    if (tasks !== board.tasks)
      await commit({ ...board, tasks }, "카드 위치를 저장했어요.");
  }
  function dropPosition(event, status) {
    const cards = [
      ...event.currentTarget.querySelectorAll(".card:not(.dragging)"),
    ];
    const following = cards.find((card) => {
      const bounds = card.getBoundingClientRect();
      return event.clientY < bounds.top + bounds.height / 2;
    });
    return { status, beforeId: following?.dataset.taskId ?? null };
  }
  async function remove() {
    const base = editBase.current || board;
    const item = base.tasks.find((t) => t.id === draft.id);
    if (
      await commit(
        { ...base, tasks: base.tasks.filter((t) => t.id !== draft.id) },
        "카드를 삭제했어요.",
        base,
      )
    ) {
      setDeleted(item);
      close(true);
    }
  }
  async function undo() {
    if (
      deleted &&
      (await commit(
        {
          ...board,
          tasks: [
            ...board.tasks,
            {
              ...deleted,
              id: board.tasks.some((t) => t.id === deleted.id)
                ? `SL-${crypto.randomUUID()}`
                : deleted.id,
            },
          ],
        },
        "카드를 복원했어요.",
      ))
    )
      setDeleted(null);
  }
  function exportBoard() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(board, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "synergelab-board.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("보드를 JSON 파일로 내보냈어요.");
    setMenu(false);
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      notify("공유 링크를 복사했어요.");
    } catch {
      notify("아래 링크를 선택해 직접 복사해 주세요.");
    }
    setModal("share");
    setMenu(false);
  }
  if (!board)
    return (
      <main className="boot-screen">
        <SquaresFour size={32} />
        <h1>SynergeLab</h1>
        <p role="status">{loadError || "팀 보드를 불러오는 중입니다…"}</p>
        {loadError && (
          <button className="primary" onClick={() => location.reload()}>
            다시 연결
          </button>
        )}
      </main>
    );
  const filtered = filterTasks(board.tasks, {
    query,
    member,
    tag,
    mine,
    mineId: user.id,
  });
  const hasFilter = !!(query || member || tag || mine);
  const reset = () => {
    setQuery("");
    setMember("");
    setTag("");
    setMine(false);
  };
  const complete = board.tasks.filter((t) => t.status === "done").length;
  return (
    <div className="app">
      <nav className="rail" aria-label="빠른 탐색">
        <button
          className="brand-symbol"
          aria-label="팀 보드 홈"
          onClick={() => {
            reset();
            setView("board");
          }}
        >
          <SquaresFour size={26} weight="fill" />
        </button>
        <div className="rail-main">
          <button
            className="rail-button selected"
            aria-label="보드"
            onClick={() => {
              reset();
              setView("board");
            }}
          >
            <Kanban size={22} />
          </button>
          <button
            className="rail-button"
            aria-label="카드 검색"
            onClick={() => search.current?.focus()}
          >
            <MagnifyingGlass size={22} />
          </button>
          <button
            className="rail-button"
            aria-label="빠른 카드 추가"
            onClick={resumeDraft}
          >
            <Plus size={23} />
          </button>
        </div>
        <div className="rail-bottom">
          <button
            className="rail-button"
            aria-label="도움말"
            onClick={() => setModal("help")}
          >
            <Question size={22} />
          </button>
          <button
            className="profile-button"
            aria-label={`${user.name} 프로필 설정`}
            title={`${user.name} · 프로필 설정`}
            onClick={() => setModal("profile")}
          >
            <Avatar id={user.id} />
          </button>
        </div>
      </nav>
      <aside className="sidebar">
        <div className="workspace">
          <span className="workspace-icon">
            <SquaresFour size={24} weight="duotone" />
          </span>
          <div>
            <strong>SynergeLab</strong>
            <span>작은 팀, 함께 만드는 일</span>
          </div>
        </div>
        <div className="side-label">워크스페이스</div>
        <nav className="side-nav" aria-label="워크스페이스 탐색">
          <button
            className={!mine ? "active" : ""}
            onClick={() => {
              reset();
              setView("board");
            }}
          >
            <Kanban size={19} />
            <span>팀 보드</span>
            <span className="nav-count">{board.tasks.length}</span>
          </button>
          <button
            className={mine ? "active" : ""}
            onClick={() => {
              setMine(true);
              setMember("");
              setQuery("");
              setTag("");
            }}
          >
            <NotePencil size={19} />
            <span>내 할 일</span>
            <span className="nav-count">
              {
                board.tasks.filter(
                  (t) => t.member === user.id && t.status !== "done",
                ).length
              }
            </span>
          </button>
          <button
            onClick={() => {
              setDraft({ memo: board.memo });
              setModal("memo");
            }}
          >
            <Users size={19} />
            <span>팀 메모</span>
          </button>
        </nav>
        <div className="side-divider" />
        <button
          className="side-settings"
          onClick={() => {
            setDraft({ name: board.name });
            setModal("settings");
          }}
        >
          <GearSix size={19} />
          보드 설정
        </button>
        <div className="sidebar-bottom">
          <div className="team-note">
            <span className="tiny-label">OUR LITTLE TEAM</span>
            <p>
              좋은 아이디어는
              <br />
              함께할 때 더 커져요.
            </p>
            <div className="mini-members">
              {MEMBERS.map((m) => (
                <Avatar key={m.id} id={m.id} size="small" />
              ))}
              <span>{MEMBERS.length}명의 작은 팀</span>
            </div>
          </div>
          <div className="local-note">
            <LockSimple size={14} />
            <span>서버에 저장되는 팀 보드</span>
          </div>
        </div>
      </aside>
      <main className="workspace-main">
        <div className="content">
          <h1 className="sr-only">{mine ? "내 할 일" : board.name}</h1>
          {(storageError || status === "offline") && (
            <div className="storage-warning" role="alert">
              <span>
                {storageError ||
                  "실시간 연결이 끊겼습니다. 자동으로 다시 연결하고 있습니다."}
              </span>
              <button onClick={exportBoard}>현재 보드 내보내기</button>
              <button onClick={() => location.reload()}>새로 불러오기</button>
            </div>
          )}
          <div className="board-controls">
            <div className="view-tabs">
              <div
                role="tablist"
                aria-label="보기 방식"
                onKeyDown={(e) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? "board"
                        : e.key === "End"
                          ? "list"
                          : view === "board"
                            ? "list"
                            : "board";
                    setView(next);
                    e.currentTarget
                      .querySelectorAll("[role=tab]")
                      [next === "board" ? 0 : 1].focus();
                  }
                }}
              >
                <button
                  role="tab"
                  aria-selected={view === "board"}
                  className={view === "board" ? "active" : ""}
                  onClick={() => setView("board")}
                >
                  <Kanban size={17} />
                  보드
                </button>
                <button
                  role="tab"
                  aria-selected={view === "list"}
                  className={view === "list" ? "active" : ""}
                  onClick={() => setView("list")}
                >
                  <List size={19} />
                  목록
                </button>
              </div>
            </div>
            <div className="heading-actions">
              <button
                className="icon-button"
                aria-label="보드 옵션"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <DotsThree size={25} />
              </button>
              {menu && (
                <div className="popover">
                  <button onClick={copyLink}>
                    <Users size={16} />
                    공유 링크 복사
                  </button>
                  <button
                    onClick={() => {
                      setMenu(false);
                      setDraft({ memo: board.memo });
                      setModal("memo");
                    }}
                  >
                    <Users size={16} />팀 메모 열기
                  </button>
                  <button
                    onClick={() => {
                      setMenu(false);
                      setMine(!mine);
                    }}
                  >
                    <NotePencil size={16} />
                    {mine ? "전체 카드 보기" : "내 할 일 보기"}
                  </button>
                  <button
                    onClick={() => {
                      setMenu(false);
                      setModal("help");
                    }}
                  >
                    <Question size={16} />
                    사용 방법
                  </button>
                  <button onClick={exportBoard}>
                    <DownloadSimple size={16} />
                    보드 내보내기
                  </button>
                  <button
                    onClick={() => {
                      setMenu(false);
                      setDraft({ name: board.name });
                      setModal("settings");
                    }}
                  >
                    <GearSix size={16} />
                    보드 이름 변경
                  </button>
                </div>
              )}
              <button className="primary" onClick={() => openTask(null)}>
                <Plus size={17} weight="bold" />새 카드
              </button>
            </div>
            <div className="toolbar-filters">
              {hasFilter && (
                <button className="clear-filters" onClick={reset}>
                  초기화
                  <X size={12} />
                </button>
              )}
              <label className="tag-filter">
                <SlidersHorizontal size={15} />
                <select
                  aria-label="라벨 필터"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                >
                  <option value="">모든 라벨</option>
                  {TAGS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <div className="member-filters" aria-label="담당자 필터">
                {MEMBERS.map((m) => (
                  <button
                    key={m.id}
                    className={member === m.id ? "chosen" : ""}
                    aria-label={`${m.name} 카드 필터`}
                    aria-pressed={member === m.id}
                    onClick={() => {
                      setMember(member === m.id ? "" : m.id);
                      setMine(false);
                    }}
                  >
                    <Avatar id={m.id} />
                  </button>
                ))}
              </div>
              <div className="search-box">
                <MagnifyingGlass size={17} />
                <input
                  ref={search}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="카드 검색하기"
                  aria-label="카드 검색"
                />
                {query ? (
                  <button
                    aria-label="검색어 지우기"
                    onClick={() => {
                      setQuery("");
                      search.current.focus();
                    }}
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd>/</kbd>
                )}
              </div>
            </div>
          </div>
          {view === "board" ? (
            <div
              ref={boardElement}
              className="board"
              role="region"
              aria-label="칸반 보드"
            >
              {STATUSES.map((status) => {
                const tasks = filtered.filter((t) => t.status === status.id);
                return (
                  <section
                    key={status.id}
                    className={`column ${status.id}`}
                    aria-label={status.name}
                    onDragOver={(e) => {
                      if (!drag || busyRef.current) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const scroller = e.currentTarget.querySelector(".cards");
                      const bounds = scroller.getBoundingClientRect();
                      if (e.clientY < bounds.top + 28) scroller.scrollTop -= 18;
                      else if (e.clientY > bounds.bottom - 28)
                        scroller.scrollTop += 18;
                      const target = dropPosition(e, status.id);
                      setOver((previous) =>
                        previous?.status === target.status &&
                        previous?.beforeId === target.beforeId
                          ? previous
                          : target,
                      );
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget))
                        setOver(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!drag || busyRef.current) return;
                      const target = dropPosition(e, status.id);
                      move(drag, status.id, target.beforeId);
                    }}
                  >
                    <header className="column-heading">
                      <div>
                        <span className="status-dot" />
                        <h2>{status.name}</h2>
                        <span className="count">{tasks.length}</span>
                      </div>
                      <span className="column-english">{status.english}</span>
                      <button
                        className="column-plus"
                        aria-label={`${status.name} 카드 추가`}
                        onClick={() => openTask(null, status.id)}
                      >
                        <Plus size={18} />
                      </button>
                    </header>
                    <div className="cards">
                      {tasks.map((task) => (
                        <div className="card-slot" key={task.id}>
                          {over?.status === status.id &&
                            over.beforeId === task.id && (
                              <span
                                className="drop-indicator"
                                aria-hidden="true"
                              />
                            )}
                          <article
                            data-task-id={task.id}
                            className={`card ${task.priority ? "is-priority" : ""} ${drag === task.id ? "dragging" : ""}`}
                            draggable={!busy}
                            onDragStart={(e) => {
                              setDrag(task.id);
                              e.dataTransfer.setData("text/plain", task.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              setDrag("");
                              setOver(null);
                            }}
                          >
                            <button
                              className="card-open"
                              onClick={() => openTask(task)}
                              aria-label={`${task.title} 편집`}
                            >
                              <div className="card-label-row">
                                <span
                                  className={`tag tag-${TAGS.indexOf(task.tag)}`}
                                >
                                  {task.tag}
                                </span>
                                {task.priority && (
                                  <span
                                    className="priority"
                                    title="우선순위 높음"
                                  >
                                    <Flag size={13} weight="fill" />
                                    우선
                                  </span>
                                )}
                                {status.id === "done" && (
                                  <CheckCircle
                                    className="card-check"
                                    size={17}
                                    weight="fill"
                                  />
                                )}
                              </div>
                              <h3>{task.title}</h3>
                              <p title={task.description}>{task.description}</p>
                              <div className="card-bottom">
                                <span className="task-id" title={task.id}>
                                  {task.id.slice(0, 11)}
                                </span>
                                <Avatar id={task.member} size="small" />
                              </div>
                            </button>
                          </article>
                        </div>
                      ))}
                      <div className="drop-tail" aria-hidden="true">
                        {over?.status === status.id &&
                          over.beforeId === null && (
                            <span
                              className={`drop-indicator drop-end ${tasks.length === 0 ? "empty" : ""}`}
                              aria-hidden="true"
                            />
                          )}
                      </div>
                      {tasks.length === 0 && (
                        <div className="empty-column">
                          {hasFilter
                            ? "조건에 맞는 카드가 없어요."
                            : "아직 카드가 없어요."}
                          <span>
                            {hasFilter
                              ? "검색이나 필터를 바꿔보세요."
                              : "첫 번째 할 일을 남겨보세요."}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      className="add-card"
                      onClick={() => openTask(null, status.id)}
                    >
                      <Plus size={16} />
                      카드 추가
                    </button>
                  </section>
                );
              })}
            </div>
          ) : (
            <section className="list-view" aria-label="카드 목록">
              <div className="list-head">
                <span>카드 이름</span>
                <span>상태</span>
                <span>담당자</span>
              </div>
              {filtered.map((task) => (
                <div className="list-row" key={task.id}>
                  <button onClick={() => openTask(task)}>
                    <span className={`tag tag-${TAGS.indexOf(task.tag)}`}>
                      {task.tag}
                    </span>
                    <span>{task.title}</span>
                  </button>
                  <select
                    aria-label={`${task.title} 상태`}
                    value={task.status}
                    onChange={(e) => move(task.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <span className="list-member">
                    <Avatar id={task.member} size="small" />
                    {MEMBERS.find((m) => m.id === task.member)?.name ||
                      "미지정"}
                  </span>
                </div>
              ))}
              {!filtered.length && (
                <div className="list-empty">
                  조건에 맞는 카드가 없어요.
                  <button onClick={reset}>필터 초기화</button>
                </div>
              )}
            </section>
          )}
          <footer className="board-footer">
            <span
              className={`save-status ${storageError || conflict ? "warning" : ""}`}
            >
              <CheckCircle size={16} />
              {busy
                ? "저장 중…"
                : storageError
                  ? "저장 확인 필요"
                  : status === "live"
                    ? "실시간 연결 · 서버 저장"
                    : status === "offline"
                      ? "연결 재시도 중"
                      : "연결 중…"}
            </span>
            <span className="total-progress">
              <span className="progress-track">
                <span
                  style={{
                    width: `${board.tasks.length ? (complete / board.tasks.length) * 100 : 0}%`,
                  }}
                />
              </span>
              {complete} / {board.tasks.length} 완료
            </span>
          </footer>
        </div>
      </main>
      <dialog
        ref={dialog}
        className="modal"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        aria-labelledby="modal-title"
      >
        <div className="modal-inner">
          {modal && (
            <>
              <header className="modal-header">
                <div>
                  <span className="eyebrow">SYNERGELAB</span>
                  <h2 id="modal-title">
                    {modal === "task"
                      ? draft.id
                        ? "카드 자세히 보기"
                        : "새 카드 만들기"
                      : modal === "memo"
                        ? "함께 기억할 팀 메모"
                        : modal === "settings"
                          ? "보드 설정"
                          : modal === "share"
                            ? "팀원에게 보드 공유"
                            : modal === "profile"
                              ? "내 프로필"
                              : "우리 팀 보드 사용하기"}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="닫기"
                  onClick={() => close()}
                >
                  <X size={21} />
                </button>
              </header>
              {error && modal !== "task" && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              {conflict && modal !== "profile" && (
                <div className="delete-confirm">
                  <p>
                    최신 서버 내용과 작성한 내용을 비교해 주세요. 아래 버튼을
                    누르면 현재 작성한 내용을 유지한 채 최신 버전을 기준으로
                    다시 저장할 수 있습니다.
                  </p>
                  <details>
                    <summary>최신 서버 내용 보기</summary>
                    <pre className="conflict-preview">
                      {modal === "task"
                        ? JSON.stringify(
                            board.tasks.find((t) => t.id === draft?.id) ||
                              "삭제된 카드",
                            null,
                            2,
                          )
                        : modal === "memo"
                          ? board.memo
                          : board.name}
                    </pre>
                  </details>
                  <button
                    className="secondary"
                    onClick={() => {
                      editBase.current = board;
                      setConflict(false);
                      setError("");
                      setStorageError("");
                    }}
                  >
                    최신 내용 확인했어요 · 다시 편집
                  </button>
                </div>
              )}
              {closeConfirm && (
                <div className="delete-confirm" role="alert">
                  <p>
                    저장하지 않은 변경 내용이 있어요. 닫으면 내용이 사라집니다.
                  </p>
                  <div>
                    <button
                      className="secondary"
                      onClick={() => setCloseConfirm(false)}
                    >
                      계속 편집
                    </button>
                    <button className="danger" onClick={() => close(true)}>
                      변경 취소하고 닫기
                    </button>
                  </div>
                </div>
              )}
              {modal === "task" && (
                <form onSubmit={saveTask} noValidate>
                  <fieldset disabled={busy}>
                    <label className="field">
                      카드 제목
                      <input
                        ref={titleInput}
                        autoFocus
                        value={draft.title}
                        maxLength={120}
                        onChange={(e) => {
                          setDraft({ ...draft, title: e.target.value });
                          setError("");
                        }}
                        placeholder="어떤 일을 함께 해볼까요?"
                        aria-invalid={!!error}
                        aria-describedby={error ? "title-error" : undefined}
                      />
                    </label>
                    {error && (
                      <p className="field-error" id="title-error">
                        {error}
                      </p>
                    )}
                    <label className="field">
                      내용
                      <textarea
                        className="resize-none"
                        value={draft.description}
                        maxLength={5000}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                        placeholder="아이디어, 할 일, 참고할 내용을 자유롭게 적어보세요."
                        rows={5}
                      />
                    </label>
                    <div className="form-grid">
                      <label className="field">
                        상태
                        <select
                          aria-label="상태"
                          value={draft.status}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              status: e.target.value,
                              beforeId: "",
                            })
                          }
                        >
                          {STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        담당자
                        <select
                          aria-label="담당자"
                          value={draft.member}
                          onChange={(e) =>
                            setDraft({ ...draft, member: e.target.value })
                          }
                        >
                          <option value="">담당자 없음</option>
                          {MEMBERS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        라벨
                        <select
                          aria-label="라벨"
                          value={draft.tag}
                          onChange={(e) =>
                            setDraft({ ...draft, tag: e.target.value })
                          }
                        >
                          {TAGS.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {draft.id && (
                      <label className="field">
                        카드 위치
                        <select
                          aria-label="카드 위치"
                          value={draft.beforeId ?? (draft.id ? "keep" : "")}
                          onChange={(e) =>
                            setDraft({ ...draft, beforeId: e.target.value })
                          }
                        >
                          {draft.id && (
                            <option value="keep">현재 위치 유지</option>
                          )}
                          {orderedTasks(board.tasks)
                            .filter(
                              (t) =>
                                t.status === draft.status && t.id !== draft.id,
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title} 앞
                              </option>
                            ))}
                          <option value="">맨 아래</option>
                        </select>
                      </label>
                    )}
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={draft.priority}
                        onChange={(e) =>
                          setDraft({ ...draft, priority: e.target.checked })
                        }
                      />
                      <Flag size={15} />
                      우선해서 할 일이에요
                    </label>
                    {deleteConfirm && (
                      <div className="delete-confirm">
                        <p>‘{draft.title}’ 카드를 삭제할까요?</p>
                        <div>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setDeleteConfirm(false)}
                          >
                            유지하기
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={remove}
                          >
                            카드 삭제
                          </button>
                        </div>
                      </div>
                    )}
                    <footer className="modal-footer">
                      {draft.id && (
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => setDeleteConfirm(true)}
                        >
                          <Trash size={17} />
                          삭제
                        </button>
                      )}
                      <div className="modal-footer-right">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => close(true)}
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          className="primary"
                          disabled={busy}
                        >
                          <Check size={16} />
                          {draft.id ? "변경 저장" : "카드 추가"}
                        </button>
                      </div>
                    </footer>
                  </fieldset>
                </form>
              )}
              {modal === "profile" && (
                <ProfileSettings
                  onBusy={(value) => {
                    busyRef.current = value;
                    setBusy(value);
                  }}
                  onSaved={notify}
                />
              )}
              {modal === "memo" && (
                <form
                  noValidate
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await commit(
                        { ...(editBase.current || board), memo: draft.memo },
                        "팀 메모를 저장했어요.",
                        editBase.current || board,
                      )
                    )
                      close(true);
                  }}
                >
                  <fieldset disabled={busy}>
                    <p className="modal-description">
                      회의에서 나온 생각, 함께 기억할 약속을 남겨요.
                    </p>
                    <label className="field">
                      팀 메모
                      <textarea
                        aria-label="팀 메모"
                        className="resize-none memo-area"
                        value={draft.memo}
                        onChange={(e) => setDraft({ memo: e.target.value })}
                        rows={12}
                      />
                    </label>
                    <footer className="modal-footer">
                      <span className="muted">
                        서버에 저장하고 팀원과 공유해요
                      </span>
                      <button className="primary" type="submit" disabled={busy}>
                        메모 저장
                      </button>
                    </footer>
                  </fieldset>
                </form>
              )}
              {modal === "settings" && (
                <form
                  noValidate
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!draft.name.trim()) {
                      setError("보드 이름을 입력해 주세요.");
                      return;
                    }
                    if (
                      await commit(
                        {
                          ...(editBase.current || board),
                          name: draft.name.trim(),
                        },
                        "보드 이름을 변경했어요.",
                        editBase.current || board,
                      )
                    )
                      close(true);
                  }}
                >
                  <fieldset disabled={busy}>
                    <label className="field">
                      보드 이름
                      <input
                        autoFocus
                        value={draft.name}
                        maxLength={40}
                        onChange={(e) => setDraft({ name: e.target.value })}
                      />
                    </label>
                    {error && <p className="field-error">{error}</p>}
                    <div className="settings-info">
                      <LockSimple size={21} />
                      <p>
                        <strong>가볍게 시작하는 팀 공유 보드</strong>
                        <br />
                        카드와 메모는 서버에 저장됩니다. 브라우저를 닫아도 남아
                        있으며, 같은 공유 링크로 접속한 팀원에게 실시간으로
                        반영됩니다. 링크를 가진 사람은 보드를 보고 편집할 수
                        있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={exportBoard}
                    >
                      <DownloadSimple size={17} />
                      보드 내보내기
                    </button>
                    <footer className="modal-footer">
                      <span className="muted">
                        샘플 담당자: 지민, 수현, 하린, 도윤
                      </span>
                      <button type="submit" className="primary" disabled={busy}>
                        설정 저장
                      </button>
                    </footer>
                  </fieldset>
                </form>
              )}
              {modal === "share" && (
                <div className="help-content">
                  <p>
                    아래 링크를 팀원에게 보내주세요. 같은 보드에서 카드와 메모를
                    함께 편집할 수 있어요.
                  </p>
                  <label className="field">
                    보드 공유 링크
                    <input
                      aria-label="보드 공유 링크"
                      readOnly
                      value={location.href}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <p className="help-note">
                    팀 계정으로 로그인한 뒤 이 링크로 함께 열람하고 편집할 수
                    있습니다. 브라우저를 닫아도 저장된 내용은 남아 있습니다.
                  </p>
                  <button className="primary" onClick={copyLink}>
                    링크 복사
                  </button>
                </div>
              )}
              {modal === "help" && (
                <div className="help-content">
                  <p>우리 팀의 일을 세 단계로 가볍게 정리하세요.</p>
                  <ol>
                    <li>
                      <strong>할 일 남기기</strong>
                      <span>새 카드에 제목, 내용과 담당자를 적어요.</span>
                    </li>
                    <li>
                      <strong>진행 상황 옮기기</strong>
                      <span>
                        카드를 끌어 옮기거나 카드 안에서 상태를 선택해요.
                      </span>
                    </li>
                    <li>
                      <strong>함께할 생각 모으기</strong>
                      <span>팀 메모에 회의 내용과 아이디어를 남겨요.</span>
                    </li>
                  </ol>
                  <p className="help-note">
                    ‘내 할 일’은 로그인한 계정에 배정된 카드입니다.
                    <br />
                    카드와 메모는 서버에 저장됩니다. 공유 버튼으로 팀원을
                    초대하세요. 팀 계정으로 로그인한 팀원이 공유 링크로 보드를
                    열 수 있습니다.
                  </p>
                  <button className="primary" onClick={() => close()}>
                    시작할게요
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </dialog>
      <div className="toast-area" aria-live="polite">
        {toast && (
          <div className="toast">
            <CheckCircle size={19} />
            {toast}
            <button aria-label="알림 닫기" onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {deleted && (
          <div className="undo-toast">
            <span>삭제한 카드가 있어요</span>
            <button onClick={undo}>
              <ArrowCounterClockwise size={15} />
              실행 취소
            </button>
            <button
              aria-label="복원 알림 닫기"
              onClick={() => setDeleted(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
