import { ACCOUNTS } from "./accounts.js";
export const KEY = "synergelab-board-v1";
export const STATUSES = [
  { id: "todo", name: "할 일", english: "TO DO" },
  { id: "doing", name: "진행 중", english: "IN PROGRESS" },
  { id: "done", name: "완료", english: "DONE" },
];
export const MEMBERS = ACCOUNTS;
const RETIRED_MEMBER_IDS = ["ji", "su", "ha", "do"];
export const activeMember = (id) => (RETIRED_MEMBER_IDS.includes(id) ? "" : id);
export const TAGS = ["기획", "디자인", "개발", "운영"];
export const SEED = {
  version: 1,
  revision: 0,
  name: "우리 팀 보드",
  memo: "이번 주에 함께 기억할 것\n\n• 작은 일도 카드로 남겨요.\n• 막힌 일이 있다면 다음 회의에서 함께 이야기해요.\n• 완료한 일은 완료 열로 옮겨주세요.",
  tasks: [
    {
      id: "SL-001",
      title: "팀원들의 아이디어 모아보기",
      description: "다음 프로젝트에서 해보고 싶은 것들을 편하게 남겨주세요.",
      status: "todo",
      tag: "기획",
      member: "bom",
      priority: false,
    },
    {
      id: "SL-002",
      title: "첫 화면 레퍼런스 찾아보기",
      description: "좋은 경험을 주는 서비스 3개씩 공유해요.",
      status: "todo",
      tag: "디자인",
      member: "bom",
      priority: false,
    },
    {
      id: "SL-003",
      title: "사용자 피드백 정리하기",
      description: "지난주에 받은 의견을 한곳에 모아볼까요?",
      status: "todo",
      tag: "기획",
      member: "daewon",
      priority: true,
    },
    {
      id: "SL-004",
      title: "다음 주 팀 미팅 준비",
      description: "이야기할 주제와 결정할 내용을 정리해요.",
      status: "todo",
      tag: "운영",
      member: "daewon",
      priority: false,
    },
    {
      id: "SL-005",
      title: "우리 팀 칸반 보드 만들기",
      description: "할 일부터 완료까지, 한눈에 볼 수 있는 작은 작업 공간.",
      status: "doing",
      tag: "개발",
      member: "daewon",
      priority: true,
    },
    {
      id: "SL-006",
      title: "브랜드 컬러와 폰트 정하기",
      description: "우리다운 느낌을 찾아가고 있어요.",
      status: "doing",
      tag: "디자인",
      member: "bom",
      priority: false,
    },
    {
      id: "SL-007",
      title: "프로젝트 소개 글 작성",
      description: "누구를 위해, 무엇을 만드는지 짧고 명확하게.",
      status: "doing",
      tag: "기획",
      member: "bom",
      priority: false,
    },
    {
      id: "SL-008",
      title: "팀 작업 공간 세팅",
      description: "함께 일할 준비를 마쳤어요.",
      status: "done",
      tag: "운영",
      member: "daewon",
      priority: false,
    },
    {
      id: "SL-009",
      title: "첫 번째 아이디어 미팅",
      description: "작게 시작하고, 함께 키워가기로 했어요.",
      status: "done",
      tag: "기획",
      member: "bom",
      priority: false,
    },
  ],
};
export function validBoard(value) {
  return (
    !!value &&
    value.version === 1 &&
    Number.isFinite(value.revision) &&
    typeof value.name === "string" &&
    typeof value.memo === "string" &&
    Array.isArray(value.tasks) &&
    value.tasks.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        typeof t.description === "string" &&
        STATUSES.some((s) => s.id === t.status) &&
        TAGS.includes(t.tag) &&
        (activeMember(t.member) === "" ||
          MEMBERS.some((m) => m.id === t.member)) &&
        typeof t.priority === "boolean" &&
        (t.position === undefined ||
          (Number.isFinite(t.position) && Math.abs(t.position) <= 1e12)),
    ) &&
    new Set(value.tasks.map((t) => t.id)).size === value.tasks.length
  );
}
export function filterTasks(
  tasks,
  { query = "", member = "", tag = "", mine = false, mineId = "bom" },
) {
  const q = query.trim().toLocaleLowerCase("ko");
  return orderedTasks(tasks).filter(
    (t) =>
      (!q ||
        `${t.title} ${t.description} ${t.id}`
          .toLocaleLowerCase("ko")
          .includes(q)) &&
      (!member || t.member === member) &&
      (!tag || t.tag === tag) &&
      (!mine || t.member === mineId),
  );
}
// Legacy cards receive their existing array order; persisted positions are stable
// across deletions and independent edits by other teammates.
export function orderedTasks(tasks) {
  return tasks
    .map((task, index) => ({
      ...task,
      position: task.position ?? index * 1024,
    }))
    .sort(
      (a, b) =>
        a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}

export function placeTask(tasks, id, status, beforeId = null) {
  if (!STATUSES.some((s) => s.id === status) || beforeId === id) return tasks;
  const ordered = orderedTasks(tasks);
  const task = ordered.find((t) => t.id === id);
  if (!task) return tasks;
  const column = ordered.filter((t) => t.status === status && t.id !== id);
  const index = beforeId
    ? column.findIndex((t) => t.id === beforeId)
    : column.length;
  if (index < 0) return tasks;
  const previous = column[index - 1]?.position;
  const following = column[index]?.position;
  if (
    task.status === status &&
    tasks.find((t) => t.id === id).position !== undefined
  ) {
    const existing = ordered.filter((t) => t.status === status);
    const currentIndex = existing.findIndex((t) => t.id === id);
    if ((existing[currentIndex + 1]?.id ?? null) === beforeId) return tasks;
  }
  const position =
    previous === undefined
      ? following === undefined
        ? 0
        : following - 1024
      : following === undefined
        ? previous + 1024
        : previous + (following - previous) / 2;
  const positions = new Map(ordered.map((t) => [t.id, t.position]));
  if (
    !Number.isFinite(position) ||
    Math.abs(position) > 1e12 ||
    (previous !== undefined && position <= previous) ||
    (following !== undefined && position >= following)
  ) {
    // Extremely tight or tied positions are re-spaced within this column only.
    column.splice(index, 0, task);
    column.forEach((t, i) => positions.set(t.id, i * 1024));
  } else positions.set(id, position);
  return tasks.map((t) => ({
    ...t,
    status: t.id === id ? status : t.status,
    position: positions.get(t.id),
  }));
}
export function nextId(tasks) {
  return `SL-${String(Math.max(0, ...tasks.map((t) => Number(t.id.split("-")[1]) || 0)) + 1).padStart(3, "0")}`;
}
