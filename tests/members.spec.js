import { test, expect } from "./auth-support.js";
import { SEED } from "../src/model.js";
import { randomBytes } from "node:crypto";

test("담당자는 봄·대원·세현만 표시하고 삭제된 담당자는 배정 해제한다", async ({
  page,
}) => {
  const id = randomBytes(24).toString("hex");
  const legacy = {
    ...SEED,
    tasks: SEED.tasks.map((task, index) =>
      index < 4 ? { ...task, member: ["ji", "su", "ha", "do"][index] } : task,
    ),
  };
  expect(
    (await page.request.post(`/api/boards/${id}`, { data: legacy })).status(),
  ).toBe(201);
  await page.goto(`/#board=${id}`);
  await expect(page.locator(".card")).toHaveCount(9);
  await expect(page.locator(".member-filters button")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "세현 카드 필터" }),
  ).toBeVisible();
  await expect(page.locator(".mini-members")).toContainText("3명의 작은 팀");
  for (const name of ["지민", "수현", "하린", "도윤"]) {
    await expect(
      page.getByRole("button", { name: `${name} 카드 필터` }),
    ).toHaveCount(0);
    await expect(page.locator(`[title="${name}"]`)).toHaveCount(0);
  }
  await expect(
    page.locator('.card[data-task-id="SL-001"] .card-assignee'),
  ).toHaveText("담당자 없음");
  await expect(
    page.locator('.card[data-task-id="SL-001"] .avatar'),
  ).toHaveCount(0);
  await page.locator('.card[data-task-id="SL-001"] .card-open').click();
  const assignee = page.getByLabel("담당자", { exact: true });
  await expect(assignee).toHaveValue("");
  await expect(assignee.locator("option")).toHaveText([
    "담당자 없음",
    "봄",
    "대원",
    "세현",
  ]);
  await assignee.selectOption("sehyeon");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(
    page.locator('.card[data-task-id="SL-001"] .card-assignee'),
  ).toHaveText("세현");
  await page.reload();
  await expect(
    page.locator('.card[data-task-id="SL-001"] .card-assignee'),
  ).toHaveText("세현");
  await expect(page.locator(".todo .column-english")).toHaveCSS(
    "font-size",
    "10.67px",
  );
  await page.screenshot({
    path: "artifacts/members-column-label-preview.png",
    fullPage: true,
  });
  const session = await (await page.request.get("/api/session")).json();
  expect(session.members.map((member) => member.name)).toEqual([
    "봄",
    "대원",
    "세현",
  ]);
  expect(
    (
      await page.request.post("/api/login", { data: { password: "" } })
    ).status(),
  ).toBe(401);
});
