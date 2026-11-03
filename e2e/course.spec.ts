import { test, expect, type Page } from "@playwright/test";

async function typeExercise(page: Page) {
  const text = (await page.getByTestId("text-target").innerText()).replace(/ /g, " ");
  await page.keyboard.type(text, { delay: 38 });
}

test("course lists the lessons and recommends the first", async ({ page }) => {
  await page.goto("/ru/course");
  const cards = page.getByTestId("lesson-card");
  await expect(cards).toHaveCount(21);
  await expect(cards.first()).toHaveAttribute("data-recommended", "true");
  await expect(cards.first()).toContainText("А");
});

test("lesson shows the next key and the finger to use", async ({ page }) => {
  await page.goto("/ru/course/ru-01");
  await page.getByTestId("stage").waitFor();
  await expect(page.locator('[data-testid=keyboard] [data-next="true"]')).toHaveAttribute("data-k", /^[fj]$/);
  await expect(page.getByTestId("finger-hint")).toContainText("указательный");
});

test("finishing all exercises grades the lesson and remembers it", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/en/course/en-01");
  await page.getByTestId("stage").click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId("exercise-step")).toContainText(`Exercise ${i + 1} of 3`);
    await typeExercise(page);
  }
  await expect(page.getByTestId("lesson-result")).toBeVisible();
  await expect(page.getByTestId("lesson-stars")).toHaveAttribute("data-stars", /[123]/);
  await page.getByRole("link", { name: /Next lesson/ }).click();
  await expect(page).toHaveURL(/\/en\/course\/en-02$/);
  await page.goto("/en/course");
  await expect(page.getByTestId("lesson-card").first()).toHaveAttribute("data-stars", /[123]/);
  await expect(page.getByTestId("lesson-card").nth(1)).toHaveAttribute("data-recommended", "true");
});

test("course is in the navigation", async ({ page }) => {
  await page.goto("/en/code");
  await page.getByRole("link", { name: "Course", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/course$/);
});
