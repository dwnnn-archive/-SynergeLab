import { test, expect } from "./auth-support.js";
import { randomBytes } from "node:crypto";
import { SEED } from "../src/model.js";

async function ready(page) {
  await page.goto("/");
  await expect(page.locator(".card")).toHaveCount(9);
}

test("탭과 필터가 같은 줄에 있고 새 카드는 맨 위에 등장해 저장된다", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.cardMotions = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.classList.contains("card-slot"))
        window.cardMotions.push(args[0]);
      return animate.apply(this, args);
    };
  });
  await ready(page);
  await expect(page.locator(".topbar, .heading")).toHaveCount(0);
  const bounds = await Promise.all([
    page.getByRole("tab", { name: "보드", exact: true }).boundingBox(),
    page.getByLabel("라벨 필터").boundingBox(),
    page.locator(".member-filters").boundingBox(),
    page.locator(".search-box").boundingBox(),
  ]);
  for (let i = 1; i < bounds.length; i++) {
    expect(bounds[i].x).toBeGreaterThan(bounds[i - 1].x);
    expect(
      Math.abs(
        bounds[i].y + bounds[i].height / 2 - bounds[0].y - bounds[0].height / 2,
      ),
    ).toBeLessThan(3);
  }
  await page
    .getByRole("button", { name: "진행 중 카드 추가", exact: true })
    .click();
  await expect(page.getByLabel("카드 위치", { exact: true })).toHaveCount(0);
  await page.getByLabel("카드 제목", { exact: true }).fill("맨 위에 새 카드");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "카드 추가", exact: true })
    .click();
  await expect(page.locator(".doing .card").first()).toContainText(
    "맨 위에 새 카드",
  );
  await expect
    .poll(() => page.evaluate(() => window.cardMotions.length))
    .toBeGreaterThan(1);
  await page.reload();
  await expect(page.locator(".doing .card").first()).toContainText(
    "맨 위에 새 카드",
  );
  await page.getByRole("button", { name: "맨 위에 새 카드 편집" }).click();
  await expect(page.getByLabel("카드 위치", { exact: true })).toHaveCount(0);
});

test("많은 카드는 열 안에서만 스크롤되고 헤더와 추가 버튼은 고정된다", async ({
  page,
}) => {
  const id = randomBytes(24).toString("hex");
  const tasks = Array.from({ length: 75 }, (_, index) => ({
    ...SEED.tasks[index % SEED.tasks.length],
    id: `SL-scroll-${index}`,
    title: `스크롤 확인 카드 ${index + 1}`,
    position: index * 1024,
    status: ["todo", "doing", "done"][index % 3],
  }));
  expect(
    (
      await page.request.post(`/api/boards/${id}`, { data: { ...SEED, tasks } })
    ).ok(),
  ).toBeTruthy();
  await page.goto(`/#board=${id}`);
  await expect(page.locator(".card")).toHaveCount(75);
  for (const viewport of [
    { width: 1440, height: 800 },
    { width: 390, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => {
      const root = document.scrollingElement;
      return {
        pageHeight: root.scrollHeight,
        pageWidth: root.scrollWidth,
        columns: [...document.querySelectorAll(".column")].map((column) => {
          const cards = column.querySelector(".cards");
          return {
            bottom: column.getBoundingClientRect().bottom,
            content: cards.scrollHeight,
            visible: cards.clientHeight,
          };
        }),
      };
    });
    expect(metrics.pageHeight).toBeLessThanOrEqual(viewport.height);
    expect(metrics.pageWidth).toBeLessThanOrEqual(viewport.width);
    for (const column of metrics.columns) {
      expect(column.bottom).toBeLessThanOrEqual(viewport.height);
      expect(column.content).toBeGreaterThan(column.visible);
    }
    const header = await page.locator(".todo .column-heading").boundingBox();
    const add = await page.locator(".todo .add-card").boundingBox();
    await page.locator(".todo .cards").evaluate((node) => {
      node.scrollTop = 500;
    });
    expect(
      await page.locator(".todo .cards").evaluate((node) => node.scrollTop),
    ).toBeGreaterThan(0);
    expect((await page.locator(".todo .column-heading").boundingBox()).y).toBe(
      header.y,
    );
    expect((await page.locator(".todo .add-card").boundingBox()).y).toBe(add.y);
    await page.screenshot({
      path: `artifacts/column-scroll-${viewport.width}.png`,
    });
    if (viewport.width === 1440) {
      await page.locator(".todo .add-card").click();
      await page
        .getByLabel("카드 제목", { exact: true })
        .fill("스크롤 후 새 카드");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "카드 추가", exact: true })
        .click();
      await expect(page.locator(".todo .card").first()).toContainText(
        "스크롤 후 새 카드",
      );
      await expect
        .poll(() =>
          page.locator(".todo .cards").evaluate((node) => node.scrollTop),
        )
        .toBe(0);
    }
  }
});

test("동작 줄이기 설정에서는 카드 생성 애니메이션을 생략한다", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.evaluate(() => {
    window.cardAnimationCount = 0;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.classList.contains("card-slot")) window.cardAnimationCount++;
      return animate.apply(this, args);
    };
  });
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page.getByLabel("카드 제목", { exact: true }).fill("움직임 없이 추가");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "카드 추가", exact: true })
    .click();
  await expect(page.locator(".todo .card").first()).toContainText(
    "움직임 없이 추가",
  );
  expect(await page.evaluate(() => window.cardAnimationCount)).toBe(0);
});

test("작성 중 다른 팀원이 추가한 카드도 유지하며 최신 순서의 맨 앞에 생성한다", async ({
  page,
}) => {
  await ready(page);
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
    "board",
  );
  const path = `/api/boards/${id}`;
  await page.getByRole("button", { name: "새 카드", exact: true }).click();
  await page
    .getByLabel("카드 제목", { exact: true })
    .fill("마지막에 저장한 카드");
  const base = await (await page.request.get(path)).json();
  const remote = {
    ...base.tasks[0],
    id: "SL-remote",
    title: "팀원이 먼저 추가한 카드",
    status: "todo",
    position: -1024,
  };
  expect(
    (
      await page.request.patch(path, {
        data: { base, next: { ...base, tasks: [...base.tasks, remote] } },
      })
    ).ok(),
  ).toBeTruthy();
  await expect(page.locator(".todo .card").first()).toContainText(remote.title);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "카드 추가", exact: true })
    .click();
  await expect(page.locator(".todo .card").first()).toContainText(
    "마지막에 저장한 카드",
  );
  await expect(page.locator(".todo .card").nth(1)).toContainText(remote.title);
  await page.reload();
  await expect(page.locator(".todo .card").first()).toContainText(
    "마지막에 저장한 카드",
  );
  await expect(page.locator(".card")).toHaveCount(11);
});
