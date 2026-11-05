import { test, expect } from "@playwright/test";
import { passagesEn } from "./helpers";

test("empty statistics invite to type", async ({ page }) => {
  await page.goto("/en/stats");
  await expect(page.getByTestId("stats-empty")).toBeVisible();
});

test("a finished test shows up in statistics with chart, table and problem keys", async ({ page }) => {
  const p = passagesEn[3];
  await page.goto(`/en/text?passage=${p.id}`);
  await page.getByTestId("stage").click();
  const wrong = p.text[0] === "Q" ? "W" : "Q";
  await page.keyboard.type(wrong, { delay: 40 });
  await page.keyboard.press("Backspace");
  await page.keyboard.type(p.text, { delay: 40 });
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByRole("link", { name: "Statistics", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/stats$/);
  await expect(page.getByTestId("tile-count")).toHaveText("1");
  await expect(page.getByTestId("speed-chart")).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Literature");
  await expect(page.getByTestId("missed-list")).toContainText(p.text[0]);
  const heat = page.locator(`[data-testid=keyboard] [data-heat]`);
  await expect(heat.first()).toBeVisible();
});

test("chart points have a hover tooltip", async ({ page }) => {
  await page.goto("/en/text");
  await page.getByRole("button", { name: "Words", exact: true }).click();
  await page.getByRole("button", { name: "25", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByTestId("stage").click();
    const t = await page.getByTestId("text-target").innerText();
    await page.keyboard.type(t, { delay: 30 });
    await expect(page.getByTestId("result")).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await page.goto("/en/stats");
  const chart = page.getByTestId("speed-chart");
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
  await expect(page.getByTestId("chart-tooltip")).toContainText("wpm");
});

test("keyboard and phone results are kept apart", async ({ page }) => {
  const base = { mode: "words", lang: "en", accuracy: 97, errors: 1, durationMs: 30_000, chars: 200, missed: {} };
  await page.addInitScript((rs) => localStorage.setItem("ritm.guest.results", JSON.stringify(rs)), [
    { ...base, at: 1_000, cpm: 400, input: "keys" },
    { ...base, at: 2_000, cpm: 500 },
    { ...base, at: 3_000, cpm: 150, input: "phone" },
  ]);
  await page.goto("/en/stats");
  await expect(page.getByTestId("input-keys")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("tile-count")).toHaveText("2");
  await page.getByTestId("input-phone").click();
  await expect(page.getByTestId("tile-count")).toHaveText("1");
  await expect(page.getByRole("table")).toContainText("30");
});
