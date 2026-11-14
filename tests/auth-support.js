import { readFileSync } from "node:fs";
import { test as base, expect } from "@playwright/test";
export function testPassword(account = "bom") {
  const name = `AUTH_PASSWORD_${account.toUpperCase()}`;
  if (process.env[name]) return process.env[name];
  const local = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8");
  const value = local
    .split("\n")
    .find((line) => line.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!value) throw new Error("로컬 인증 테스트 비밀값을 설정해 주세요.");
  return value.replace(/^"|"$/g, "");
}
export async function login(request, account = "bom") {
  const result = await request.post("http://localhost:4173/api/login", {
    data: { password: testPassword(account) },
  });
  expect(result.status()).toBe(200);
}
export const test = base.extend({
  page: async ({ page }, use) => {
    await login(page.request);
    await use(page);
  },
  request: async ({ request }, use) => {
    await login(request);
    await use(request);
  },
});
export { expect };
