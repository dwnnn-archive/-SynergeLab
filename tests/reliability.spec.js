import { test, expect, login } from "./auth-support.js";

test("편집 중 삭제된 카드는 충돌 확인 후 새 카드로 복원하고 초안을 잃지 않는다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".card")).toHaveCount(9);
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
    "board",
  );
  const path = `/api/boards/${id}`;
  await page
    .getByRole("button", { name: "팀원들의 아이디어 모아보기 편집" })
    .click();
  await page
    .getByLabel("카드 제목", { exact: true })
    .fill("삭제 전에 작성하던 내용");
  const base = await (await page.request.get(path)).json();
  expect(
    (
      await page.request.patch(path, {
        data: {
          base,
          next: {
            ...base,
            tasks: base.tasks.filter((task) => task.id !== "SL-001"),
          },
        },
      })
    ).ok(),
  ).toBeTruthy();
  await expect(page.locator('.card[data-task-id="SL-001"]')).toHaveCount(0);
  await page.getByRole("button", { name: "변경 저장", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("카드 제목", { exact: true })).toHaveValue(
    "삭제 전에 작성하던 내용",
  );
  await page
    .getByRole("button", {
      name: /최신 내용 확인했어요|삭제 확인 · 새 카드로 복원/,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^(카드 추가|변경 저장)$/ })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "삭제 전에 작성하던 내용" }),
  ).toBeVisible();
  await expect(page.locator('.card[data-task-id="SL-001"]')).toHaveCount(0);
  await expect(page.locator(".card")).toHaveCount(9);
});

test("WebSocket이 재연결되지 않아도 조회한 최신 보드를 반영하고 편집 초안을 유지한다", async ({
  page,
}) => {
  let connection = 0,
    peer,
    server,
    holdUpdates = false;
  await page.routeWebSocket("**/events", (ws) => {
    connection++;
    if (connection > 1) {
      ws.close({ code: 1011, reason: "Temporary transport failure" });
      return;
    }
    peer = ws;
    server = ws.connectToServer();
    server.onMessage((message) => {
      if (!holdUpdates) ws.send(message);
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("실시간 연결 · 서버 저장", { exact: true }),
  ).toBeVisible();
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
    "board",
  );
  const path = `/api/boards/${id}`;
  await page
    .getByRole("button", { name: "팀원들의 아이디어 모아보기 편집" })
    .click();
  await page
    .getByLabel("카드 제목", { exact: true })
    .fill("연결 장애 중 작성 중인 초안");
  holdUpdates = true;
  const base = await (await page.request.get(path)).json();
  const next = {
    ...base,
    tasks: base.tasks.map((task) =>
      task.id === "SL-002"
        ? { ...task, title: "연결 끊김 중 다른 팀원 수정" }
        : task,
    ),
  };
  expect(
    (await page.request.patch(path, { data: { base, next } })).ok(),
  ).toBeTruthy();
  peer.close({ code: 1011, reason: "Temporary transport failure" });
  server.close();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("카드 제목", { exact: true })).toHaveValue(
    "연결 장애 중 작성 중인 초안",
  );
  await expect(
    page.getByRole("heading", { name: "연결 끊김 중 다른 팀원 수정" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "봄 프로필 설정" }),
  ).toBeVisible();
});

test("늦게 도착한 이전 계정 확인 응답이 현재 계정과 작성 중인 초안을 되돌리지 않는다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "봄 프로필 설정" }),
  ).toBeVisible();
  let release, captured;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const received = new Promise((resolve) => {
    captured = resolve;
  });
  let first = true;
  await page.route("**/api/session", async (route) => {
    if (!first) {
      await route.continue();
      return;
    }
    first = false;
    const response = await route.fetch();
    captured();
    await gate;
    await route.fulfill({ response });
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await received;
  await login(page.request, "daewon");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("button", { name: "대원 프로필 설정" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page
    .getByLabel("카드 제목", { exact: true })
    .fill("대원 계정에서 작성한 초안");
  const completed = page.waitForResponse(
    async (response) =>
      response.url().endsWith("/api/session") &&
      (await response.json()).user?.id === "bom",
  );
  release();
  await (await completed).finished();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(
    page.getByRole("button", { name: "대원 프로필 설정" }),
  ).toBeVisible();
  await expect(page.getByLabel("카드 제목", { exact: true })).toHaveValue(
    "대원 계정에서 작성한 초안",
  );
});
