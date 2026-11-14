import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { SEED } from "../src/model.js";
import { testPassword, login } from "./auth-support.js";

test("로그인 전 실제 보드 요청 없이 흐린 배경과 비밀번호 입력창을 표시한다", async ({
  page,
}) => {
  const boardRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/boards/"))
      boardRequests.push(request.url());
  });
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "입장하기" })).toBeEnabled();
  await expect(page.locator(".login-preview")).toHaveCSS(
    "filter",
    "blur(20px)",
  );
  await page.getByLabel("비밀번호", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "입장하기" }).click();
  await expect(page.getByText("틀렸습니다.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeFocused();
  expect(dialogs).toBe(0);
  expect(boardRequests).toEqual([]);
  await page.screenshot({
    path: "artifacts/login-error-preview.png",
    fullPage: true,
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByLabel("비밀번호", { exact: true }).fill(testPassword());
  await page.getByRole("button", { name: "입장하기" }).click();
  await expect(
    page.getByRole("button", { name: "봄 프로필 설정" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "봄 프로필 설정" }),
  ).toBeVisible();
  const cookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === "__Host-synergelab_session",
  );
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "synergelab_session",
  );
});

test("보드와 실시간 연결은 인증 없이 접근할 수 없고 로그아웃 후 세션은 폐기된다", async ({
  request,
}) => {
  const path = `/api/boards/${randomBytes(24).toString("hex")}`;
  expect((await request.get(path)).status()).toBe(401);
  expect((await request.post(path, { data: SEED })).status()).toBe(401);
  expect(
    (await request.patch(path, { data: { base: SEED, next: SEED } })).status(),
  ).toBe(401);
  expect(
    (
      await request.get(`${path}/events`, { headers: { Upgrade: "websocket" } })
    ).status(),
  ).toBe(401);
  expect(
    (await request.put("/api/profile", { data: { avatar: null } })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/login", {
        headers: { Origin: "https://untrusted.example" },
        data: { password: testPassword() },
      })
    ).status(),
  ).toBe(403);
  await login(request);
  expect((await request.post(path, { data: SEED })).status()).toBe(201);
  const state = await request.storageState();
  const cookie = state.cookies.find(
    (c) => c.name === "__Host-synergelab_session",
  );
  expect((await request.post("/api/logout")).status()).toBe(200);
  expect(
    (
      await request.get(path, {
        headers: { Cookie: `${cookie.name}=${cookie.value}` },
      })
    ).status(),
  ).toBe(401);
});

test("두 계정의 사진을 구분해서 저장하며 사진 제거 시 이름 글자로 돌아간다", async ({
  page,
  browser,
}) => {
  await login(page.request);
  await page.request.put("/api/profile", { data: { avatar: null } });
  await page.goto("/");
  const profile = page.getByRole("button", { name: "봄 프로필 설정" });
  await expect(profile).toContainText("봄");
  await profile.click();
  await page.screenshot({
    path: "artifacts/profile-settings-preview.png",
    fullPage: true,
  });
  const photo = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 80;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1451b8";
    ctx.fillRect(0, 0, 80, 80);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("프로필 사진 파일").setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from(photo, "base64"),
  });
  await expect(
    page.getByText("프로필 사진을 저장했어요.", { exact: true }),
  ).toBeVisible();
  await expect(profile.locator("img")).toBeVisible();
  await page.reload();
  await expect(profile.locator("img")).toBeVisible();
  const other = await browser.newContext();
  const teammate = await other.newPage();
  await login(teammate.request, "daewon");
  await teammate.goto(page.url());
  const otherProfile = teammate.getByRole("button", {
    name: "대원 프로필 설정",
  });
  await expect(otherProfile).toContainText("대");
  await expect(otherProfile.locator("img")).toHaveCount(0);
  await expect(
    teammate.locator('.mini-members [title="봄"] img'),
  ).toBeVisible();
  const invalid = await page.request.put("/api/profile", {
    data: { avatar: "data:image/svg+xml;base64,PHN2Zz4=" },
  });
  expect(invalid.status()).toBe(400);
  await profile.click();
  await page.getByRole("button", { name: "사진 제거" }).click();
  await expect(profile.locator("img")).toHaveCount(0);
  await expect(profile).toContainText("봄");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page.getByRole("button", { name: "입장하기" })).toBeVisible();
  await expect(page.locator(".card")).toHaveCount(0);
  await other.close();
});

test("모바일 로그인과 대원 계정의 내 할 일 필터가 동작한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "입장하기" })).toBeEnabled();
  await page.screenshot({
    path: "artifacts/login-mobile-preview.png",
    fullPage: true,
  });
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill(testPassword("daewon"));
  await page.getByRole("button", { name: "입장하기" }).click();
  await expect(
    page.getByRole("button", { name: "대원 프로필 설정" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: /내 할 일/ }).click();
  await expect(page.locator(".card")).toHaveCount(4);
});

test("반복된 잘못된 로그인은 서버에서 제한한다", async ({ request }) => {
  const headers = {
    "CF-Connecting-IP": `test-${randomBytes(8).toString("hex")}`,
  };
  for (let i = 0; i < 5; i++)
    expect(
      (
        await request.post("/api/login", {
          headers,
          data: { password: "incorrect" },
        })
      ).status(),
    ).toBe(401);
  const response = await request.post("/api/login", {
    headers,
    data: { password: "incorrect" },
  });
  expect(response.status()).toBe(429);
  expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
});

test("로그아웃된 세션의 기존 실시간 연결로 새 보드 내용을 전송하지 않는다", async ({
  page,
  browser,
}) => {
  await login(page.request);
  await page.goto("/");
  await expect(
    page.getByText("실시간 연결 · 서버 저장", { exact: true }),
  ).toBeVisible();
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
    "board",
  );
  const path = `/api/boards/${id}`;
  await page.evaluate(async (id) => {
    window.authProbe = { messages: 0, closed: false };
    const socket = new WebSocket(
      `ws://${location.host}/api/boards/${id}/events`,
    );
    socket.onclose = () => (window.authProbe.closed = true);
    await new Promise((resolve) => {
      socket.onmessage = () => {
        window.authProbe.messages++;
        resolve();
      };
    });
  }, id);
  const other = await browser.newContext();
  const teammate = await other.newPage();
  await login(teammate.request, "daewon");
  await page.request.post("/api/logout");
  const base = await (
    await teammate.request.get(`http://localhost:4173${path}`)
  ).json();
  const next = { ...base, memo: "로그아웃 후에는 전달하지 않는 메모" };
  expect(
    (
      await teammate.request.patch(`http://localhost:4173${path}`, {
        data: { base, next },
      })
    ).status(),
  ).toBe(200);
  await expect
    .poll(() => page.evaluate(() => window.authProbe.closed))
    .toBe(true);
  expect(await page.evaluate(() => window.authProbe.messages)).toBe(1);
  await expect(page.getByRole("button", { name: "입장하기" })).toBeVisible();
  await other.close();
});

test("같은 브라우저에서 계정이 바뀌면 이전 계정의 편집창을 닫는다", async ({
  page,
}) => {
  await login(page.request);
  await page.goto("/");
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page
    .getByLabel("카드 제목", { exact: true })
    .fill("봄 계정의 작성 중인 카드");
  await login(page.request, "daewon");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("button", { name: "대원 프로필 설정" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
