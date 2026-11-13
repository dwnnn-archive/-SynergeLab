import { DurableObject } from "cloudflare:workers";
import {
  checkedBoard,
  mergeBoards,
  ConflictError,
} from "../src/shared-board.js";
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
async function readJSON(request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("JSON 요청이 필요합니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("요청 내용이 없습니다.");
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("보드 데이터가 너무 큽니다.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export class BoardRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS board (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)",
    );
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }
  read() {
    const row = this.ctx.storage.sql
      .exec("SELECT payload FROM board WHERE id=1")
      .toArray()[0];
    return row ? checkedBoard(JSON.parse(row.payload)) : null;
  }
  async write(board) {
    this.ctx.storage.sql.exec(
      "INSERT INTO board (id,payload) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
      JSON.stringify(board),
    );
    await this.ctx.storage.sync();
  }
  broadcast(board) {
    for (const socket of this.ctx.getWebSockets())
      try {
        socket.send(JSON.stringify(board));
      } catch {
        try {
          socket.close(1011, "Reconnect");
        } catch {}
      }
  }
  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname.endsWith("/events")) {
        const board = this.read();
        if (!board)
          return json(
            { error: "보드를 찾을 수 없습니다. 공유 링크를 확인해 주세요." },
            404,
          );
        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
          return json({ error: "WebSocket 연결이 필요합니다." }, 426);
        if (this.ctx.getWebSockets().length >= 50)
          return json({ error: "이 보드의 연결 수가 너무 많습니다." }, 429);
        const [client, server] = Object.values(new WebSocketPair());
        this.ctx.acceptWebSocket(server);
        server.send(JSON.stringify(board));
        return new Response(null, { status: 101, webSocket: client });
      }
      if (request.method === "GET") {
        const board = this.read();
        return board
          ? json(board)
          : json(
              { error: "보드를 찾을 수 없습니다. 공유 링크를 확인해 주세요." },
              404,
            );
      }
      if (request.method === "POST") {
        const data = checkedBoard(await readJSON(request));
        const existing = this.read();
        if (existing) return json(existing);
        const board = { ...data, revision: 1 };
        await this.write(board);
        return json(board, 201);
      }
      if (request.method === "PATCH") {
        const { base, next } = await readJSON(request);
        const current = this.read();
        if (!current) return json({ error: "보드를 찾을 수 없습니다." }, 404);
        const updated = mergeBoards(current, base, next);
        if (updated !== current) {
          await this.write(updated);
          this.broadcast(updated);
        }
        return json(updated);
      }
      return json({ error: "지원하지 않는 요청입니다." }, 405);
    } catch (error) {
      if (error instanceof ConflictError)
        return json({ error: error.message, board: this.read() }, 409);
      if (
        error instanceof SyntaxError ||
        error.message?.includes("데이터") ||
        error.message?.includes("확인") ||
        error.message?.includes("JSON") ||
        error.message?.includes("내용")
      )
        return json({ error: error.message }, 400);
      console.error("Board operation failed");
      return json(
        { error: "서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        500,
      );
    }
  }
  webSocketMessage(socket) {
    socket.close(1008, "Read-only event stream");
  }
  webSocketClose(socket, code, reason) {
    socket.close(code === 1005 ? 1000 : code, reason);
  }
  webSocketError(socket) {
    try {
      socket.close(1011, "Reconnect");
    } catch {}
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true });
    if (url.pathname.startsWith("/api/")) {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin)
        return json({ error: "허용되지 않은 요청입니다." }, 403);
      const match = url.pathname.match(
        /^\/api\/boards\/([a-f0-9]{48})(\/events)?$/,
      );
      if (!match) return json({ error: "잘못된 보드 주소입니다." }, 404);
      return env.BOARDS.get(env.BOARDS.idFromName(match[1])).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
