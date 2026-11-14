import { test, expect } from "./auth-support.js";
import { randomBytes } from "node:crypto";
import { SEED } from "../src/model.js";
test("API enforces validation, board isolation, conflict protection and idempotent retries", async ({
  request,
}) => {
  const path = `/api/boards/${randomBytes(24).toString("hex")}`;
  expect((await request.get(path)).status()).toBe(404);
  const initial = await (await request.post(path, { data: SEED })).json();
  const a = structuredClone(initial),
    b = structuredClone(initial);
  a.tasks[0].title = "first writer";
  b.tasks[1].title = "second writer";
  const responses = await Promise.all([
    request.patch(path, { data: { base: initial, next: a } }),
    request.patch(path, { data: { base: initial, next: b } }),
  ]);
  expect(responses.map((r) => r.status())).toEqual([200, 200]);
  const saved = await (await request.get(path)).json();
  expect(saved.tasks[0].title).toBe("first writer");
  expect(saved.tasks[1].title).toBe("second writer");
  const retry = await (
    await request.patch(path, { data: { base: initial, next: a } })
  ).json();
  expect(retry.revision).toBe(saved.revision);
  const conflict = structuredClone(initial);
  conflict.tasks[0].title = "stale overwrite";
  expect(
    (
      await request.patch(path, { data: { base: initial, next: conflict } })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.patch(path, {
        data: { base: initial, next: { ...initial, name: "" } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.patch(path, {
        headers: { Origin: "https://untrusted.example" },
        data: { base: initial, next: a },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(`/api/boards/${randomBytes(24).toString("hex")}`)
    ).status(),
  ).toBe(404);
});
