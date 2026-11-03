import { createHash, createHmac } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { E2E_BOT_TOKEN } from "../playwright.config";
import { passagesEn } from "./helpers";

const uniq = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

async function registerVia(page: Page, username: string, password = "secret123") {
  await page.goto("/ru/account");
  await page.getByRole("tab", { name: "Регистрация" }).click();
  await page.getByLabel("Логин").fill(username);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
}

const apiResults = (page: Page) => page.evaluate(async () => (await (await fetch("/api/results")).json()).length as number);

test("pasted text is not recorded as a result", async ({ page }) => {
  await registerVia(page, uniq("paste"));
  await expect(page.getByTestId("account-chip")).not.toHaveText("Войти");
  const p = passagesEn[2];
  await page.goto(`/en/text?passage=${p.id}`);
  await page.getByTestId("stage").click();
  await page.keyboard.insertText(p.text);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.waitForTimeout(800);
  expect(await apiResults(page)).toBe(0);
});

test("register, stay signed in after reload, log out", async ({ page }) => {
  const name = uniq("user");
  await registerVia(page, name);
  await expect(page.getByTestId("account-chip")).toHaveText(name);
  await page.reload();
  await expect(page.getByTestId("account-chip")).toHaveText(name);
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByTestId("account-chip")).toHaveText("Войти");
});

test("taken username and wrong password are explained", async ({ page, browser }) => {
  const name = uniq("taken");
  await registerVia(page, name);
  const other = await (await browser.newContext()).newPage();
  await registerVia(other, name.toUpperCase());
  await expect(other.locator("form [role=alert]")).toContainText("занят");
  await other.getByRole("tab", { name: "Вход" }).click();
  await other.getByLabel("Логин").fill(name);
  await other.getByLabel("Пароль").fill("wrong-pass");
  await other.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(other.locator("form [role=alert]")).toContainText("Неверный");
});

test("a finished test is saved to the account", async ({ page }) => {
  await registerVia(page, uniq("saver"));
  await expect(page.getByTestId("account-chip")).not.toHaveText("Войти");
  const p = passagesEn[0];
  await page.goto(`/en/text?passage=${p.id}`);
  await page.getByTestId("stage").click();
  await page.keyboard.type(p.text, { delay: 45 }); // human-like pace: pasted text is not recorded
  await expect(page.getByTestId("result")).toBeVisible();
  await expect.poll(() => apiResults(page)).toBe(1);
});

test("results typed as a guest move into the new account", async ({ page }) => {
  const p = passagesEn[1];
  await page.goto(`/en/text?passage=${p.id}`);
  await page.getByTestId("stage").click();
  await page.keyboard.type(p.text, { delay: 45 });
  await expect(page.getByTestId("result")).toBeVisible();
  await registerVia(page, uniq("guest"));
  await expect(page.getByTestId("account-chip")).not.toHaveText("Войти");
  await expect.poll(() => apiResults(page)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("ritm.guest.results"))).toBeNull();
});

function signed(id: number, username: string) {
  const data: Record<string, string | number> = { id, first_name: "Tg", username, auth_date: Math.floor(Date.now() / 1000) };
  const check = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("\n");
  data.hash = createHmac("sha256", createHash("sha256").update(E2E_BOT_TOKEN).digest()).update(check).digest("hex");
  return data;
}

test("telegram login button signs in through the widget callback", async ({ page }) => {
  await page.goto("/ru/account");
  await expect(page.getByTestId("telegram-login")).toHaveAttribute("data-bot", "ritm_e2e_bot");
  const tg = signed(Math.floor(Math.random() * 1e9), uniq("tg"));
  await page.evaluate((d) => (window as unknown as { onTelegramAuth: (x: unknown) => void }).onTelegramAuth(d), tg);
  await expect(page.getByTestId("account-chip")).toHaveText(String(tg.username));
});
