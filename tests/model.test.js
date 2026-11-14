import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED, validBoard, filterTasks, nextId } from "../src/model.js";
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

test("로그인 계정 추가 후에도 기존 담당자 카드 데이터를 허용한다", () => {
  const legacy = { ...SEED, tasks: [{ ...SEED.tasks[0], member: "ji" }] };
  assert.equal(validBoard(legacy), true);
  assert.equal(filterTasks(legacy.tasks, { member: "ji" })[0].member, "ji");
  assert.equal(
    filterTasks(legacy.tasks, { mine: true, mineId: "bom" }).length,
    0,
  );
});
