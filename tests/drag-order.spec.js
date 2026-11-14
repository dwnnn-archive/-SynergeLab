import { test, expect, login } from "./auth-support.js";

const card = (page, id) => page.locator(`.card[data-task-id="${id}"]`);
const order = (page, status) => page.locator(`.${status} .card`);
async function ready(page, url = "/") {
  await login(page.request);
  await page.goto(url);
  await expect(
    page.getByText("실시간 연결 · 서버 저장", { exact: true }),
  ).toBeVisible();
}
async function dragOver(page, source, target, after = false) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2 + 10,
    from.y + from.height / 2 + 10,
    { steps: 3 },
  );
  const y = after ? to.y + to.height - 3 : to.y + 3;
  await page.mouse.move(to.x + to.width / 2, y, { steps: 10 });
  await page.mouse.move(to.x + to.width / 2 + 1, y);
}
async function expectOrder(page, status, ids) {
  await expect(order(page, status)).toHaveCount(ids.length);
  await expect
    .poll(() =>
      order(page, status).evaluateAll((cards) =>
        cards.map((c) => c.dataset.taskId),
      ),
    )
    .toEqual(ids);
}

test("삽입선 위치에 카드가 놓이고 팀원 화면과 새로고침에도 순서가 유지된다", async ({
  page,
  browser,
}) => {
  await ready(page);
  const context = await browser.newContext();
  const teammate = await context.newPage();
  await ready(teammate, page.url());
  const target = card(page, "SL-002");
  const before = await target.boundingBox();
  await dragOver(page, card(page, "SL-004"), target);
  await expect(page.locator(".drop-indicator")).toHaveCount(1);
  const marker = await page.locator(".drop-indicator").boundingBox();
  const after = await target.boundingBox();
  expect(marker.y).toBeLessThan(after.y);
  expect(after.y - marker.y).toBeLessThan(12);
  expect(Math.abs(before.y - after.y)).toBeLessThan(2);
  await page.screenshot({
    path: "artifacts/drag-insertion-preview.png",
    fullPage: true,
  });
  await page.mouse.up();
  const expected = ["SL-001", "SL-004", "SL-002", "SL-003"];
  await expectOrder(page, "todo", expected);
  await expectOrder(teammate, "todo", expected);
  await expect(page.locator(".drop-indicator")).toHaveCount(0);
  await page.reload();
  await expectOrder(page, "todo", expected);
  await dragOver(page, card(page, "SL-004"), card(page, "SL-009"));
  await expect(page.locator(".done .drop-indicator")).toBeVisible();
  await page.mouse.up();
  await expectOrder(page, "done", ["SL-008", "SL-004", "SL-009"]);
  await expectOrder(teammate, "done", ["SL-008", "SL-004", "SL-009"]);
  await dragOver(page, card(page, "SL-004"), card(page, "SL-009"), true);
  await expect(page.locator(".done .drop-end")).toBeVisible();
  await page.mouse.up();
  await expectOrder(page, "done", ["SL-008", "SL-009", "SL-004"]);
  await context.close();
});

test("필터로 숨겨진 카드를 유지하고 빈 열에도 삽입선을 표시한다", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("라벨 필터").selectOption("기획");
  await dragOver(page, card(page, "SL-003"), card(page, "SL-001"));
  await expect(page.locator(".todo .drop-indicator")).toBeVisible();
  await page.mouse.up();
  await expectOrder(page, "todo", ["SL-003", "SL-001"]);
  await page.getByLabel("라벨 필터").selectOption("");
  await expectOrder(page, "todo", ["SL-003", "SL-001", "SL-002", "SL-004"]);
  await page.getByLabel("라벨 필터").selectOption("개발");
  await dragOver(
    page,
    card(page, "SL-005"),
    page.locator(".done .empty-column"),
  );
  await expect(page.locator(".done .drop-indicator.empty")).toBeVisible();
  await page.mouse.up();
  await expectOrder(page, "done", ["SL-005"]);
  await page.getByLabel("라벨 필터").selectOption("");
  await expectOrder(page, "done", ["SL-008", "SL-009", "SL-005"]);
  await expect(page.locator(".card")).toHaveCount(9);
});

test("드래그 취소와 저장 실패 시 순서를 바꾸지 않고 표시선을 지운다", async ({
  page,
}) => {
  await ready(page);
  await dragOver(page, card(page, "SL-004"), card(page, "SL-001"));
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".drop-indicator")).toHaveCount(0);
  await expectOrder(page, "todo", ["SL-001", "SL-002", "SL-003", "SL-004"]);
  await page.route("**/api/boards/*", (route) =>
    route.request().method() === "PATCH" ? route.abort() : route.continue(),
  );
  await dragOver(page, card(page, "SL-004"), card(page, "SL-001"));
  await page.mouse.up();
  await expect(page.getByText("저장 확인 필요", { exact: true })).toBeVisible();
  await expect(page.locator(".drop-indicator")).toHaveCount(0);
  await expectOrder(page, "todo", ["SL-001", "SL-002", "SL-003", "SL-004"]);
});

test("모바일에서도 카드 편집의 위치 선택으로 순서를 저장한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await card(page, "SL-004").getByRole("button").click();
  await page.getByLabel("카드 위치", { exact: true }).selectOption("SL-001");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expectOrder(page, "todo", ["SL-004", "SL-001", "SL-002", "SL-003"]);
  await page.reload();
  await expectOrder(page, "todo", ["SL-004", "SL-001", "SL-002", "SL-003"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
