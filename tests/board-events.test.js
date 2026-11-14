import { test } from "node:test";
import assert from "node:assert/strict";
import { broadcastBoard, checkBoardSession } from "../worker/board-events.js";

function socket(hash) {
  return {
    sent: [],
    closed: [],
    deserializeAttachment: () => ({ hash }),
    send(value) {
      this.sent.push(value);
    },
    close(code) {
      this.closed.push(code);
    },
  };
}

test("인증 장애와 잘못된 응답은 보드를 전송하지 않고 재연결 가능한 코드로 닫는다", async () => {
  for (const fetch of [
    async () => {
      throw new Error("network failure");
    },
    async () => Response.json({ error: "unavailable" }, { status: 503 }),
    async () => Response.json({}),
    async () => new Response("not json"),
  ]) {
    const peer = socket("active-session");
    await broadcastBoard({ fetch }, [peer], { revision: 2 });
    assert.deepEqual(peer.sent, []);
    assert.deepEqual(peer.closed, [1011]);
  }
});

test("확인된 세션만 새 보드를 받고 폐기된 세션은 로그인 만료로 닫힌다", async () => {
  const active = socket("active-session"),
    revoked = socket("revoked-session");
  const board = { revision: 3 };
  await broadcastBoard(
    { fetch: async () => Response.json({ valid: ["active-session"] }) },
    [active, revoked],
    board,
  );
  assert.deepEqual(active.sent, [JSON.stringify(board)]);
  assert.deepEqual(active.closed, []);
  assert.deepEqual(revoked.sent, []);
  assert.deepEqual(revoked.closed, [1008]);
});

test("보드 요청의 인증 장애는 503이며 실제 세션 만료만 401이다", async () => {
  const request = new Request("https://board/api/boards/example");
  for (const fetch of [
    async () => {
      throw Error("offline");
    },
    async () => new Response("failure", { status: 500 }),
  ]) {
    assert.equal((await checkBoardSession({ fetch }, request)).status, 503);
  }
  assert.equal(
    (
      await checkBoardSession(
        { fetch: async () => new Response("expired", { status: 401 }) },
        request,
      )
    ).status,
    401,
  );
  assert.deepEqual(
    await checkBoardSession(
      { fetch: async () => Response.json({ hash: "token", id: "bom" }) },
      request,
    ),
    { session: { hash: "token", id: "bom" } },
  );
});
