import { test, expect } from "@playwright/test";
import { shortSnippet, typeLikeHuman } from "./helpers";

const open = (page: import("@playwright/test").Page) => page.goto(`/ru/code?snippet=${encodeURIComponent(shortSnippet.id)}`);

test("type a whole snippet like a human -> 100% result", async ({ page }) => {
  await open(page);
  await page.getByTestId("stage").click();
  await typeLikeHuman(page, shortSnippet.code);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("result-accuracy")).toHaveText("100%");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toBeHidden();
});

test("error shows typed and expected", async ({ page }) => {
  await open(page);
  await page.getByTestId("stage").click();
  const first = shortSnippet.code[0];
  const wrong = first === "q" ? "w" : "q";
  await page.keyboard.type(wrong);
  const err = page.locator("[data-s=err]").first();
  await expect(err).toHaveText(wrong);
  await expect(err).toHaveAttribute("data-exp", first);
});

test("caret never jumps to origin while typing", async ({ page }) => {
  await open(page);
  await page.getByTestId("stage").click();
  const xs: number[] = [];
  for (const ch of shortSnippet.code.slice(0, 12)) {
    if (ch === "\n") break;
    await page.keyboard.type(ch);
    for (let i = 0; i < 3; i++) {
      xs.push(await page.getByTestId("caret").evaluate((el) => el.getBoundingClientRect().left));
      await page.waitForTimeout(15);
    }
  }
  const firstChar = await page.locator("[data-s]").first().evaluate((el) => el.getBoundingClientRect().left);
  expect(Math.min(...xs)).toBeGreaterThan(firstChar - 2);
});

test("no ligatures in the typing window", async ({ page }) => {
  await open(page);
  const lig = await page.getByTestId("code-content").evaluate((el) => getComputedStyle(el).fontVariantLigatures);
  expect(lig).toBe("none");
});

test("insertText fallback", async ({ page }) => {
  await open(page);
  await page.getByTestId("stage").click();
  await page.keyboard.insertText(shortSnippet.code.slice(0, 3));
  await expect(page.locator("[data-s=ok]")).toHaveCount(3);
});

test("refocus after blur", async ({ page }) => {
  await open(page);
  await page.getByTestId("stage").click();
  await page.keyboard.type(shortSnippet.code.slice(0, 2));
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page.getByTestId("focus-veil")).toHaveAttribute("data-on", "true");
  await page.keyboard.type(shortSnippet.code[2]);
  await expect(page.getByTestId("focus-veil")).not.toHaveAttribute("data-on");
  await expect(page.locator("[data-s=ok]")).toHaveCount(3);
});

test("window scrolls once caret passes the 3rd line", async ({ page }) => {
  const ty = () => page.getByTestId("code-content").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  const lines = shortSnippet.code.split("\n");
  for (const [done, moved] of [[2, false], [4, true]] as const) {
    await open(page);
    await page.getByTestId("stage").click();
    await typeLikeHuman(page, lines.slice(0, done).join("\n"));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    if (moved) expect(await ty()).toBeLessThan(0);
    else expect(await ty()).toBe(0);
  }
});

test("another snippet button loads a different one", async ({ page }) => {
  await open(page);
  const before = await page.getByTestId("snippet-file").innerText();
  await page.getByRole("button", { name: "Другой фрагмент" }).click();
  await expect(page.getByTestId("snippet-file")).not.toHaveText(before);
});
