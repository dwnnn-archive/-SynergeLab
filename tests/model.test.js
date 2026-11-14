import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED, validBoard, filterTasks, nextId } from "../src/model.js";
import { checkedBoard, mergeBoards } from "../src/shared-board.js";
test("stored board validates schema and rejects malformed or duplicate cards", () => {
  assert.equal(validBoard(SEED), true);
  assert.equal(validBoard({ ...SEED, tasks: [null] }), false);
  assert.equal(
    validBoard({ ...SEED, tasks: [SEED.tasks[0], SEED.tasks[0]] }),
    false,
  );
  assert.equal(
    validBoard({ ...SEED, tasks: [{ ...SEED.tasks[0], status: "invalid" }] }),
    false,
  );
  assert.equal(validBoard(null), false);
});
test("search matches content and id; filters compose", () => {
  assert.equal(filterTasks(SEED.tasks, { query: " SL-005 " })[0].id, "SL-005");
  assert.equal(
    filterTasks(SEED.tasks, { query: "프로젝트", tag: "기획", member: "bom" })
      .length,
    2,
  );
  assert.equal(
    filterTasks(SEED.tasks, { member: "bom", tag: "개발" }).length,
    0,
  );
  assert.equal(filterTasks(SEED.tasks, { mine: true }).length, 5);
});
test("new card ID remains unique after deletions and empty boards stay valid", () => {
  assert.equal(nextId(SEED.tasks.filter((t) => t.id !== "SL-003")), "SL-010");
  assert.equal(nextId([]), "SL-001");
  assert.equal(validBoard({ ...SEED, tasks: [] }), true);
});

test("삭제된 네 담당자의 배정을 해제하면서 카드 내용과 순서는 보존한다", () => {
  const legacy = {
    ...SEED,
    tasks: ["ji", "su", "ha", "do"].map((member, index) => ({
      ...SEED.tasks[index],
      member,
      position: index * 10,
    })),
  };
  const migrated = checkedBoard(legacy);
  assert.ok(migrated.tasks.every((task) => task.member === ""));
  assert.deepEqual(
    migrated.tasks,
    legacy.tasks.map((task) => ({ ...task, member: "" })),
  );
  const staleEdit = structuredClone(legacy);
  staleEdit.tasks[0].title = "이전 창에서 수정한 제목";
  const merged = mergeBoards(migrated, legacy, staleEdit);
  assert.equal(merged.tasks[0].title, "이전 창에서 수정한 제목");
  assert.ok(merged.tasks.every((task) => task.member === ""));
});
