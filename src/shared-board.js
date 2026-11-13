import { validBoard } from "./model.js";
export class ConflictError extends Error {}
export function checkedBoard(value) {
  if (
    !validBoard(value) ||
    !value.name.trim() ||
    value.name.length > 80 ||
    value.memo.length > 50000 ||
    value.tasks.length > 1000
  )
    throw new Error("올바른 보드 데이터가 아닙니다.");
  for (const t of value.tasks)
    if (
      !t.title.trim() ||
      t.title.length > 120 ||
      t.description.length > 5000 ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(t.id)
    )
      throw new Error("카드 내용을 확인해 주세요.");
  return {
    version: 1,
    revision: value.revision,
    name: value.name,
    memo: value.memo,
    tasks: value.tasks.map(
      (
        { id, title, description, status, tag, member, priority, position },
        index,
      ) => ({
        id,
        title,
        description,
        status,
        tag,
        member,
        priority,
        position: position ?? index * 1024,
      }),
    ),
  };
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Merge independent edits; never replace a collaborator's changed card or memo.
export function mergeBoards(current, base, next) {
  const original = current;
  current = checkedBoard(current);
  base = checkedBoard(base);
  next = checkedBoard(next);
  const merged = structuredClone(current);
  for (const field of ["name", "memo"])
    if (base[field] !== next[field]) {
      if (current[field] !== base[field] && current[field] !== next[field])
        throw new ConflictError(
          "같은 내용이 다른 팀원에 의해 변경됐습니다. 최신 내용을 확인한 뒤 다시 저장해 주세요.",
        );
      merged[field] = next[field];
    }
  const before = new Map(base.tasks.map((t) => [t.id, t])),
    after = new Map(next.tasks.map((t) => [t.id, t]));
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(id),
      desired = after.get(id),
      now = current.tasks.find((t) => t.id === id);
    if (equal(old, desired)) continue;
    if (!equal(now, old) && !equal(now, desired))
      throw new ConflictError(
        "같은 카드가 다른 팀원에 의해 변경됐습니다. 작성한 내용은 유지됩니다. 최신 카드와 비교해 주세요.",
      );
    merged.tasks = merged.tasks.filter((t) => t.id !== id);
    if (desired) {
      const index = current.tasks.findIndex((t) => t.id === id);
      merged.tasks.splice(index < 0 ? merged.tasks.length : index, 0, desired);
    }
  }
  checkedBoard(merged);
  if (equal({ ...merged, revision: 0 }, { ...current, revision: 0 }))
    return original;
  merged.revision = current.revision + 1;
  return merged;
}
