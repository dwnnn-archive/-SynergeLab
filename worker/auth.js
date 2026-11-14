import { DurableObject } from "cloudflare:workers";
import { ACCOUNTS } from "../src/accounts.js";
import {
  randomToken,
  digest,
  readToken,
  sessionCookie,
  credentials,
  matchPassword,
  validAvatar,
  SESSION_MS,
} from "./auth-helpers.js";

const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
async function body(request, limit = 2048) {
  if (!request.headers.get("Content-Type")?.includes("application/json"))
    throw new Error("입력 내용을 확인해 주세요.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("입력 내용을 확인해 주세요.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("입력 크기를 확인해 주세요.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("입력 내용을 확인해 주세요.");
  return value;
}

export class AuthRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.config = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, avatar TEXT)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires INTEGER NOT NULL, config_hash TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, reset_at INTEGER NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS auth_settings (id INTEGER PRIMARY KEY, salt TEXT NOT NULL)",
    );
    this.sql.exec(
      "INSERT OR IGNORE INTO auth_settings VALUES (1, ?)",
      randomToken(),
    );
    for (const account of ACCOUNTS)
      this.sql.exec(
        "INSERT OR IGNORE INTO profiles (id, avatar) VALUES (?, NULL)",
        account.id,
      );
  }
  async configHash() {
    const values = credentials(this.config);
    return values ? digest(JSON.stringify(values)) : null;
  }
  async session(request) {
    const token = readToken(request);
    if (!token) return null;
    const hash = await digest(token);
    const row = this.sql
      .exec(
        "SELECT * FROM sessions WHERE hash = ? AND expires > ?",
        hash,
        Date.now(),
      )
      .toArray()[0];
    if (!row || row.config_hash !== (await this.configHash())) return null;
    return { hash, id: row.account_id, expires: row.expires };
  }
  profile(id) {
    const account = ACCOUNTS.find((item) => item.id === id);
    if (!account) return null;
    const row = this.sql
      .exec("SELECT avatar FROM profiles WHERE id = ?", id)
      .toArray()[0];
    return { ...account, avatar: row?.avatar || null };
  }
  payload(session) {
    return {
      user: { ...this.profile(session.id), expiresAt: session.expires },
      members: ACCOUNTS.map((a) => this.profile(a.id)),
    };
  }
  async fetch(request) {
    const path = new URL(request.url).pathname;
    try {
      if (path === "/internal/validate" && request.method === "POST") {
        const { hashes } = await body(request, 10000);
        if (!Array.isArray(hashes) || hashes.length > 50)
          return json({ valid: [] }, 400);
        const configHash = await this.configHash();
        const valid = hashes.filter(
          (hash) =>
            typeof hash === "string" &&
            this.sql
              .exec(
                "SELECT hash FROM sessions WHERE hash = ? AND expires > ? AND config_hash = ?",
                hash,
                Date.now(),
                configHash || "",
              )
              .toArray().length,
        );
        return json({ valid });
      }
      if (path === "/api/login" && request.method === "POST") {
        const values = credentials(this.config);
        if (!values)
          return json(
            { error: "로그인 설정이 필요합니다. 관리자에게 알려 주세요." },
            503,
          );
        const { password } = await body(request);
        if (typeof password !== "string" || !password || password.length > 128)
          return json({ error: "틀렸습니다." }, 401);
        const now = Date.now();
        const salt = this.sql
          .exec("SELECT salt FROM auth_settings WHERE id = 1")
          .toArray()[0].salt;
        const key = await digest(
          `${salt}:${request.headers.get("CF-Connecting-IP") || "local"}`,
        );
        const keys = [key, "global"];
        this.sql.exec("DELETE FROM attempts WHERE reset_at <= ?", now);
        this.sql.exec("DELETE FROM sessions WHERE expires <= ?", now);
        for (const [index, item] of keys.entries()) {
          const row = this.sql
            .exec("SELECT * FROM attempts WHERE key = ?", item)
            .toArray()[0];
          if (row && row.failures >= (index === 0 ? 5 : 100))
            return json(
              { error: "시도가 너무 많습니다. 잠시 후 다시 입력해 주세요." },
              429,
              { "Retry-After": String(Math.ceil((row.reset_at - now) / 1000)) },
            );
        }
        const accountIndex = await matchPassword(password, values);
        // Re-check after hashing to keep concurrent requests within the limit.
        for (const [index, item] of keys.entries()) {
          const row = this.sql
            .exec("SELECT * FROM attempts WHERE key = ?", item)
            .toArray()[0];
          if (row && row.failures >= (index === 0 ? 5 : 100))
            return json(
              { error: "시도가 너무 많습니다. 잠시 후 다시 입력해 주세요." },
              429,
              { "Retry-After": String(Math.ceil((row.reset_at - now) / 1000)) },
            );
        }
        if (accountIndex < 0) {
          for (const item of keys)
            this.sql.exec(
              "INSERT INTO attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET failures = failures + 1",
              item,
              now + 15 * 60 * 1000,
            );
          return json({ error: "틀렸습니다." }, 401);
        }
        this.sql.exec("DELETE FROM attempts WHERE key = ?", key);
        const token = randomToken(),
          hash = await digest(token);
        const session = {
          hash,
          id: ACCOUNTS[accountIndex].id,
          expires: now + SESSION_MS,
        };
        this.sql.exec(
          "INSERT INTO sessions VALUES (?, ?, ?, ?)",
          hash,
          session.id,
          session.expires,
          await this.configHash(),
        );
        await this.ctx.storage.sync();
        return json(this.payload(session), 200, {
          "Set-Cookie": sessionCookie(token),
        });
      }
      if (path === "/api/logout" && request.method === "POST") {
        const token = readToken(request);
        if (token)
          this.sql.exec(
            "DELETE FROM sessions WHERE hash = ?",
            await digest(token),
          );
        await this.ctx.storage.sync();
        return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
      }
      const session = await this.session(request);
      if (!session) return json({ error: "로그인이 필요합니다." }, 401);
      if (path === "/internal/check") return json(session);
      if (path === "/api/session" && request.method === "GET")
        return json(this.payload(session));
      if (path === "/api/profile" && request.method === "PUT") {
        const { avatar } = await body(request, 190000);
        if (!validAvatar(avatar))
          return json({ error: "PNG, JPG, WebP 사진을 선택해 주세요." }, 400);
        this.sql.exec(
          "UPDATE profiles SET avatar = ? WHERE id = ?",
          avatar,
          session.id,
        );
        await this.ctx.storage.sync();
        return json(this.payload(session));
      }
      return json({ error: "지원하지 않는 요청입니다." }, 405);
    } catch (error) {
      if (error instanceof SyntaxError || error.message?.includes("확인"))
        return json({ error: "입력 내용을 확인해 주세요." }, 400);
      return json(
        { error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        500,
      );
    }
  }
}
