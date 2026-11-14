import { randomBytes } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { SEED } from "../src/model.js";
const path = ".wrangler/persistence-check.json";
const localSecrets = readFileSync(".dev.vars", "utf8");
const password =
  process.env.AUTH_PASSWORD_BOM ||
  localSecrets
    .split("\n")
    .find((line) => line.startsWith("AUTH_PASSWORD_BOM="))
    ?.slice("AUTH_PASSWORD_BOM=".length)
    .replace(/^"|"$/g, "");
const authenticated = await fetch("http://localhost:4173/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
});
assert.equal(authenticated.status, 200);
const cookie = authenticated.headers.get("set-cookie").split(";")[0];
if (process.argv[2] === "create") {
  const id = randomBytes(24).toString("hex");
  const board = {
    ...SEED,
    name: "서버 재시작 유지 검증",
    memo: "프로세스 종료 후에도 유지되어야 합니다.",
  };
  const response = await fetch(`http://localhost:4173/api/boards/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(board),
  });
  assert.equal(response.status, 201);
  writeFileSync(path, JSON.stringify({ id, board: await response.json() }));
  console.log("Persistence fixture saved to local server.");
} else {
  const expected = JSON.parse(readFileSync(path));
  const response = await fetch(
    `http://localhost:4173/api/boards/${expected.id}`,
    { headers: { Cookie: cookie } },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected.board);
  console.log("PASS: persisted board survived full server restart.");
}
