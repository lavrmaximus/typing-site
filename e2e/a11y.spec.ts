import { test, expect } from "@playwright/test";

test("keyboard focus on navigation keycaps is visible", async ({ page }) => {
  await page.goto("/ru/text");
  await page.getByTestId("stage").waitFor();
  await page.getByRole("link", { name: "Код", exact: true }).focus();
  await page.waitForTimeout(300);
  await expect(page.getByRole("link", { name: "Код", exact: true })).toBeFocused();
  const outline = await page.getByRole("link", { name: "Код", exact: true }).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("typing window does not animate", async ({ page }) => {
    await page.goto("/ru/code");
    await page.getByTestId("stage").waitFor();
    const t = await page.getByTestId("code-content").evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(t.split(",").every((d) => parseFloat(d) === 0)).toBe(true);
  });
});

test("every page has a meaningful title and description", async ({ page }) => {
  await page.goto("/en/text");
  await expect(page).toHaveTitle(/typing/i);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Python/);
});
