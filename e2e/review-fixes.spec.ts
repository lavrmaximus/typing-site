import { test, expect } from "@playwright/test";
import { passagesEn } from "./helpers";

test("IME composition reaches the engine once", async ({ page }) => {
  await page.goto(`/en/text?passage=${passagesEn[0].id}`);
  await page.getByTestId("stage").click();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "W", selectionStart: 1, selectionEnd: 1 });
  await cdp.send("Input.imeSetComposition", { text: "Wh", selectionStart: 2, selectionEnd: 2 });
  await cdp.send("Input.insertText", { text: "Wh" });
  await expect(page.locator("[data-s=ok], [data-s=err]")).toHaveCount(2);
});

test("on-screen keyboard can be switched off and stays off", async ({ page }) => {
  await page.goto("/ru/code");
  await expect(page.getByTestId("keyboard")).toHaveCount(1);
  await page.getByRole("button", { name: "Клавиатура" }).click();
  await expect(page.getByTestId("keyboard")).toHaveCount(0);
  await page.reload();
  await page.getByTestId("stage").waitFor();
  await expect(page.getByTestId("keyboard")).toHaveCount(0);
});

test("root remembers the last language and mode", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ru-RU" });
  const page = await ctx.newPage();
  await page.goto("/en/text");
  await page.getByTestId("stage").waitFor();
  await page.goto("/");
  await expect(page).toHaveURL(/\/en\/text$/);
});

test("/ru and /en redirect by path, not by header", async ({ browser }) => {
  const page = await (await browser.newContext({ locale: "en-US" })).newPage();
  await page.goto("/ru");
  await expect(page).toHaveURL(/\/ru\/code$/);
});

