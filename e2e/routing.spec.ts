import { test, expect } from "@playwright/test";

test("root redirects by Accept-Language", async ({ browser }) => {
  const ru = await browser.newContext({ locale: "ru-RU" });
  const p1 = await ru.newPage();
  await p1.goto("/");
  await expect(p1).toHaveURL(/\/ru\/code$/);
  const en = await browser.newContext({ locale: "en-US" });
  const p2 = await en.newPage();
  await p2.goto("/");
  await expect(p2).toHaveURL(/\/en\/code$/);
});

test("unknown lang is 404", async ({ page }) => {
  const r = await page.goto("/de/code");
  expect(r?.status()).toBe(404);
});

test("html lang attribute follows route", async ({ page }) => {
  await page.goto("/en/text");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
