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
    filterTasks(SEED.tasks, { query: "프로젝트", tag: "기획", member: "ji" })
      .length,
    2,
  );
  assert.equal(
    filterTasks(SEED.tasks, { member: "ha", tag: "개발" }).length,
    0,
  );
  assert.equal(filterTasks(SEED.tasks, { mine: true }).length, 3);
});
test("new card ID remains unique after deletions and empty boards stay valid", () => {
  assert.equal(nextId(SEED.tasks.filter((t) => t.id !== "SL-003")), "SL-010");
  assert.equal(nextId([]), "SL-001");
  assert.equal(validBoard({ ...SEED, tasks: [] }), true);
});
