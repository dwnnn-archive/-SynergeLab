import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED, orderedTasks, placeTask, validBoard } from "../src/model.js";
import {
  checkedBoard,
  mergeBoards,
  ConflictError,
} from "../src/shared-board.js";

const ids = (board, status) =>
  orderedTasks(board.tasks)
    .filter((t) => t.status === status)
    .map((t) => t.id);
const move = (board, id, status, before = null) => ({
  ...board,
  tasks: placeTask(board.tasks, id, status, before),
});

test("기존 보드의 순서를 보존하고 잘못된 위치 값은 거부한다", () => {
  const board = checkedBoard(SEED);
  assert.deepEqual(ids(board, "todo"), [
    "SL-001",
    "SL-002",
    "SL-003",
    "SL-004",
  ]);
  assert.ok(board.tasks.every((t) => Number.isFinite(t.position)));
  for (const position of [NaN, Infinity, "1", 1e15]) {
    assert.equal(
      validBoard({ ...SEED, tasks: [{ ...SEED.tasks[0], position }] }),
      false,
    );
  }
});

test("같은 열의 앞·중간·끝 이동과 저장 재시도가 순서를 보존한다", () => {
  let board = checkedBoard(SEED);
  for (const [before, expected] of [
    ["SL-001", ["SL-004", "SL-001", "SL-002", "SL-003"]],
    ["SL-003", ["SL-001", "SL-002", "SL-004", "SL-003"]],
    [null, ["SL-001", "SL-002", "SL-003", "SL-004"]],
  ]) {
    const next = move(board, "SL-004", "todo", before);
    const saved = mergeBoards(board, board, next);
    assert.deepEqual(ids(saved, "todo"), expected);
    assert.equal(mergeBoards(saved, board, next).revision, saved.revision);
    board = saved;
  }
});

test("다른 열의 지정 위치 및 빈 열로 이동해도 기존 카드가 보존된다", () => {
  const base = checkedBoard(SEED);
  const next = move(base, "SL-001", "doing", "SL-006");
  const saved = mergeBoards(base, base, next);
  assert.deepEqual(ids(saved, "doing"), [
    "SL-005",
    "SL-001",
    "SL-006",
    "SL-007",
  ]);
  assert.equal(saved.tasks.length, base.tasks.length);
  const empty = {
    ...base,
    tasks: base.tasks.filter((t) => t.status !== "done"),
  };
  assert.deepEqual(ids(move(empty, "SL-001", "done"), "done"), ["SL-001"]);
});

test("다른 카드의 동시 수정은 유지하고 같은 카드의 동시 이동은 충돌로 처리한다", () => {
  const base = checkedBoard(SEED);
  const moved = move(base, "SL-004", "todo", "SL-002");
  const edited = structuredClone(base);
  edited.tasks[0].title = "팀원이 수정한 제목";
  const saved = mergeBoards(mergeBoards(base, base, edited), base, moved);
  assert.equal(saved.tasks[0].title, "팀원이 수정한 제목");
  assert.deepEqual(ids(saved, "todo"), [
    "SL-001",
    "SL-004",
    "SL-002",
    "SL-003",
  ]);
  assert.throws(
    () => mergeBoards(saved, base, move(base, "SL-004", "todo", "SL-001")),
    ConflictError,
  );
});

test("반복 삽입과 같은 위치의 동시 이동 후에도 다시 정확하게 정렬할 수 있다", () => {
  let board = checkedBoard(SEED);
  const a = move(board, "SL-001", "doing", "SL-006");
  const b = move(board, "SL-002", "doing", "SL-006");
  board = mergeBoards(mergeBoards(board, board, a), board, b);
  assert.deepEqual(ids(board, "doing"), [
    "SL-005",
    "SL-001",
    "SL-002",
    "SL-006",
    "SL-007",
  ]);
  board = move(board, "SL-003", "doing", "SL-002");
  assert.deepEqual(ids(board, "doing"), [
    "SL-005",
    "SL-001",
    "SL-003",
    "SL-002",
    "SL-006",
    "SL-007",
  ]);
  for (let i = 0; i < 100; i++) {
    const target = i % 2 ? "SL-003" : "SL-001";
    const moving = i % 2 ? "SL-001" : "SL-003";
    board = move(board, moving, "doing", target);
    const order = ids(board, "doing");
    assert.equal(order.indexOf(moving) + 1, order.indexOf(target));
    assert.equal(validBoard(board), true);
  }
});
