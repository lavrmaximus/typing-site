import { test, expect } from "@playwright/test";
import { passagesEn, passagesRu } from "./helpers";

const ru = passagesRu[0];

test("literature passage completes with full accuracy", async ({ page }) => {
  await page.goto(`/ru/text?passage=${ru.id}`);
  await page.getByTestId("stage").click();
  await page.keyboard.insertText(ru.text);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("result-accuracy")).toHaveText("100%");
});

test("source of the passage is shown", async ({ page }) => {
  await page.goto(`/en/text?passage=${passagesEn[0].id}`);
  await expect(page.getByTestId("source")).toContainText("Austen");
});

test("words mode honours the chosen count", async ({ page }) => {
  await page.goto("/en/text");
  await page.getByRole("button", { name: "Words", exact: true }).click();
  await page.getByRole("button", { name: "25", exact: true }).click();
  await expect(page.getByTestId("text-target")).toHaveText(/^(\S+ ){24}\S+$/);
  const words = (await page.getByTestId("text-target").innerText()).trim().split(/\s+/);
  expect(words).toHaveLength(25);
  expect(words.every((w) => /^[a-z]+$/.test(w))).toBe(true);
});

test("wrong letter shows what was typed and what was expected", async ({ page }) => {
  await page.goto(`/ru/text?passage=${ru.id}`);
  await page.getByTestId("stage").click();
  const wrong = ru.text[0] === "Ж" ? "Щ" : "Ж";
  await page.keyboard.insertText(wrong);
  const err = page.locator("[data-s=err]").first();
  await expect(err).toHaveText(wrong);
  await expect(err).toHaveAttribute("data-exp", ru.text[0]);
});

test("layout toast when typing latin into a russian text", async ({ page }) => {
  await page.goto(`/ru/text?passage=${ru.id}`);
  await page.getByTestId("stage").click();
  await page.keyboard.type("g");
  await expect(page.getByTestId("toast")).toContainText("раскладк");
});

test("text window scrolls after the second line", async ({ page }) => {
  await page.goto("/en/text");
  await page.getByRole("button", { name: "Words", exact: true }).click();
  await page.getByRole("button", { name: "100", exact: true }).click();
  await page.getByTestId("stage").click();
  const target = await page.getByTestId("text-target").innerText();
  await page.keyboard.insertText(target.slice(0, 160));
  await page.waitForTimeout(700);
  const ty = await page.getByTestId("text-target").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  expect(ty).toBeLessThan(0);
});
