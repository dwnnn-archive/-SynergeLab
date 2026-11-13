import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED } from "../src/model.js";
import {
  mergeBoards,
  checkedBoard,
  ConflictError,
} from "../src/shared-board.js";
test("independent concurrent card edits both survive", () => {
  const base = structuredClone(SEED),
    a = structuredClone(base),
    b = structuredClone(base);
  a.tasks[0].title = "A";
  b.tasks[1].title = "B";
  const merged = mergeBoards(mergeBoards(base, base, a), base, b);
  assert.equal(merged.tasks[0].title, "A");
  assert.equal(merged.tasks[1].title, "B");
  assert.equal(merged.revision, 2);
});
test("same-card and memo conflicts rejected without losing current content", () => {
  const a = structuredClone(SEED),
    b = structuredClone(SEED);
  a.tasks[0].title = "A";
  b.tasks[0].title = "B";
  assert.throws(() => mergeBoards(a, SEED, b), ConflictError);
  assert.throws(
    () => mergeBoards({ ...SEED, memo: "A" }, SEED, { ...SEED, memo: "B" }),
    ConflictError,
  );
});
test("retry is idempotent, delete conflict is protected and invalid content rejected", () => {
  const next = structuredClone(SEED);
  next.tasks.push({ ...next.tasks[0], id: "SL-new" });
  const applied = mergeBoards(SEED, SEED, next);
  assert.equal(mergeBoards(applied, SEED, next).revision, applied.revision);
  const deleted = { ...SEED, tasks: SEED.tasks.slice(1) };
  const edit = structuredClone(SEED);
  edit.tasks[0].title = "edit";
  assert.throws(() => mergeBoards(deleted, SEED, edit), ConflictError);
  assert.throws(() => checkedBoard({ ...SEED, name: "" }));
});
