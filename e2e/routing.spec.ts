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

test("shell renders keycap nav and switches language keeping mode", async ({ page }) => {
  await page.goto("/ru/text");
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/text$/);
  await expect(page.getByRole("link", { name: "Code", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Text", exact: true })).toHaveAttribute("aria-current", "page");
});

test("theme toggle persists", async ({ page }) => {
  await page.goto("/ru/code");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: /тема/i }).click();
  const after = before === "dark" ? "light" : "dark";
  await expect(html).toHaveAttribute("data-theme", after);
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", after);
});

test("device glows with a hue variable", async ({ page }) => {
  await page.goto("/ru/code");
  await page.getByTestId("stage").waitFor();
  const hue = await page.getByTestId("device").evaluate((el) => getComputedStyle(el).getPropertyValue("--glow-h").trim());
  expect(hue).toBe("205");
});

test("theme survives a root re-render that drops the attribute", async ({ page }) => {
  await page.goto("/ru/code");
  await page.getByTestId("stage").waitFor();
  const before = await page.locator("html").getAttribute("data-theme");
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", before!);
});
