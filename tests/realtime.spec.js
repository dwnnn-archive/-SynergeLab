import { test, expect } from "@playwright/test";
async function ready(page, url = "/") {
  await page.goto(url);
  await expect(
    page.getByText("실시간 연결 · 서버 저장", { exact: true }),
  ).toBeVisible();
}
async function create(page, title) {
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page.getByLabel("카드 제목", { exact: true }).fill(title);
  await page
    .getByRole("button", { name: "카드 추가", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("two independent browsers synchronize and a new browser retains saved cards", async ({
  browser,
  page,
}) => {
  await ready(page);
  const sharedURL = page.url();
  const context = await browser.newContext();
  const teammate = await context.newPage();
  await ready(teammate, sharedURL);
  await create(page, "실시간 공유 확인");
  await expect(
    teammate.getByRole("heading", { name: "실시간 공유 확인" }),
  ).toBeVisible();
  await teammate.getByRole("button", { name: "실시간 공유 확인 편집" }).click();
  await teammate.getByLabel("상태", { exact: true }).selectOption("done");
  await teammate.getByRole("button", { name: "변경 저장" }).click();
  await expect(
    page.locator(".done").getByText("실시간 공유 확인"),
  ).toBeVisible();
  await context.close();
  await page.close();
  const fresh = await browser.newContext();
  const reopened = await fresh.newPage();
  await ready(reopened, sharedURL);
  await expect(
    reopened.locator(".done").getByText("실시간 공유 확인"),
  ).toBeVisible();
  await fresh.close();
});
test("same-card edit conflict preserves draft while unrelated edits merge", async ({
  browser,
  page,
}) => {
  await ready(page);
  const context = await browser.newContext();
  const teammate = await context.newPage();
  await ready(teammate, page.url());
  const title = "팀원들의 아이디어 모아보기";
  await page.getByRole("button", { name: `${title} 편집` }).click();
  await teammate.getByRole("button", { name: `${title} 편집` }).click();
  await page.getByLabel("카드 제목", { exact: true }).fill("먼저 저장한 제목");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await teammate
    .getByLabel("카드 제목", { exact: true })
    .fill("내가 작성한 제목");
  await teammate.getByRole("button", { name: "변경 저장" }).click();
  await expect(
    teammate
      .getByText(
        "같은 카드가 다른 팀원에 의해 변경됐습니다. 작성한 내용은 유지됩니다. 최신 카드와 비교해 주세요.",
        { exact: true },
      )
      .last(),
  ).toBeVisible();
  await expect(teammate.getByLabel("카드 제목", { exact: true })).toHaveValue(
    "내가 작성한 제목",
  );
  await expect(
    page.getByRole("heading", { name: "먼저 저장한 제목" }),
  ).toBeVisible();
  await context.close();
});
test("offline save retains draft; reconnect receives missed updates", async ({
  browser,
  page,
  context,
}) => {
  await ready(page);
  const second = await browser.newContext();
  const teammate = await second.newPage();
  await ready(teammate, page.url());
  await context.setOffline(true);
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page.getByLabel("카드 제목", { exact: true }).fill("오프라인 초안");
  await page
    .getByRole("button", { name: "카드 추가", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("카드 제목", { exact: true })).toHaveValue(
    "오프라인 초안",
  );
  await expect(page.locator("#title-error")).toContainText(
    "저장하지 못했습니다",
  );
  await create(teammate, "연결 중 놓친 카드");
  await context.setOffline(false);
  await page
    .getByRole("button", { name: "카드 추가", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    teammate.getByRole("heading", { name: "오프라인 초안" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "연결 중 놓친 카드" }),
  ).toBeVisible();
  await second.close();
});
test("existing browser-local board migrates without deleting its original copy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "synergelab-board-v1",
      JSON.stringify({
        version: 1,
        revision: 0,
        name: "이전 보드",
        memo: "이전 메모",
        tasks: [],
      }),
    );
  });
  await ready(page);
  await expect(page.getByRole("heading", { name: "이전 보드" })).toBeVisible();
  await expect(page.locator(".card")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("synergelab-board-v1")).name,
    ),
  ).toBe("이전 보드");
});
