import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".card")).toHaveCount(9);
});
test("create, validate, edit, persist, delete and undo a card", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator(".card")).toHaveCount(9);
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page
    .getByRole("button", { name: "카드 추가", exact: true })
    .last()
    .click();
  await expect(page.getByText("카드 제목을 입력해 주세요.")).toBeVisible();
  await page
    .getByLabel("카드 제목", { exact: true })
    .fill("브라우저 테스트 카드");
  await page.getByLabel("내용", { exact: true }).fill("지속 저장 확인");
  await page.getByLabel("담당자", { exact: true }).selectOption("ha");
  await page.getByLabel("상태", { exact: true }).selectOption("doing");
  await page
    .getByRole("button", { name: "카드 추가", exact: true })
    .last()
    .click();
  await expect(page.locator(".doing .card")).toHaveCount(4);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "브라우저 테스트 카드" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "브라우저 테스트 카드 편집", exact: true })
    .click();
  await page.getByLabel("상태", { exact: true }).selectOption("done");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(
    page.locator(".done").getByText("브라우저 테스트 카드"),
  ).toBeVisible();
  await page.getByRole("button", { name: "브라우저 테스트 카드 편집" }).click();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("button", { name: "카드 삭제", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "브라우저 테스트 카드" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "실행 취소" }).click();
  await expect(
    page.getByRole("heading", { name: "브라우저 테스트 카드" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("search, filters, list status, notes and settings", async ({ page }) => {
  await page
    .getByRole("textbox", { name: "카드 검색", exact: true })
    .fill("존재하지않는카드");
  await expect(page.locator(".card")).toHaveCount(0);
  await page.getByRole("button", { name: "검색어 지우기" }).click();
  await expect(page.locator(".card")).toHaveCount(9);
  await page.getByRole("button", { name: "하린 카드 필터" }).click();
  await expect(page.locator(".card")).toHaveCount(2);
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  await page.getByLabel("라벨 필터").selectOption("개발");
  await expect(page.locator(".card")).toHaveCount(1);
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  await page.getByRole("tab", { name: "목록", exact: true }).click();
  await expect(page.locator(".list-row")).toHaveCount(9);
  await page.getByLabel("팀원들의 아이디어 모아보기 상태").selectOption("done");
  await page.getByRole("button", { name: "팀 메모", exact: true }).click();
  await page.getByLabel("팀 메모", { exact: true }).fill("금요일 회의");
  await page.getByRole("button", { name: "메모 저장" }).click();
  await page.getByRole("button", { name: "보드 설정", exact: true }).click();
  await page.getByLabel("보드 이름").fill("작은 팀의 실험실");
  await page.getByRole("button", { name: "설정 저장" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "작은 팀의 실험실" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "팀 메모", exact: true }).click();
  await expect(page.getByLabel("팀 메모", { exact: true })).toHaveValue(
    "금요일 회의",
  );
});
test("drag and drop, keyboard dialog and export", async ({ page }) => {
  await page
    .locator(".todo .card")
    .first()
    .dragTo(page.locator(".done .column-heading"));
  await expect(page.locator(".done .card")).toHaveCount(3);
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await expect(page.getByLabel("카드 제목", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "보드 옵션" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "보드 내보내기" }).click();
  expect((await downloading).suggestedFilename()).toBe("synergelab-board.json");
});
test("mobile layout and accessibility", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "새 카드", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page.screenshot({
    path: "artifacts/mobile-editor.png",
    fullPage: true,
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("desktop accessibility and mobile memo navigation", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "보드 옵션" }).click();
  await page.getByRole("button", { name: "팀 메모 열기" }).click();
  await page.getByLabel("팀 메모", { exact: true }).fill("저장하지 않은 메모");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText(
      "저장하지 않은 변경 내용이 있어요. 닫으면 내용이 사라집니다.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "계속 편집" }).click();
  await page.getByRole("button", { name: "메모 저장" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("헤더에서 팀 보드·내 할 일·메모를 전환하고 모바일에서도 메뉴를 유지한다", async ({
  page,
}) => {
  const navigation = page.getByRole("navigation", {
    name: "워크스페이스 탐색",
  });
  await navigation
    .getByRole("button", { name: "내 할 일", exact: true })
    .click();
  await expect(page.locator(".card")).toHaveCount(3);
  await expect(
    navigation.getByRole("button", { name: "내 할 일", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("button", { name: /팀 보드/ }).click();
  await expect(page.locator(".card")).toHaveCount(9);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await navigation
      .getByRole("button", { name: "팀 메모", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    await page.getByRole("button", { name: "보드 설정", exact: true }).click();
    await expect(page.getByLabel("보드 이름")).toBeVisible();
    await page.getByRole("button", { name: "닫기", exact: true }).click();
  }
});
