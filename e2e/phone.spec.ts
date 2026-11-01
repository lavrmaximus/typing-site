import { test, expect, devices } from "@playwright/test";
import { passagesRu } from "./helpers";

test.use({ ...devices["Pixel 7"] });

const p = passagesRu[0];
const [w1, w2] = p.text.split(" ");

test("phone mode is on by default and judges whole words", async ({ page }) => {
  await page.goto(`/ru/text?passage=${p.id}`);
  await expect(page.getByRole("button", { name: "Ввод с телефона" })).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("stage").tap();
  await page.keyboard.insertText(`${w1} ${w2}ы `);
  await expect(page.locator(`[data-typed="${w2}ы"]`)).toBeVisible();
  await expect(page.getByTestId("keyboard")).toHaveCount(0);
});

test("autocorrect rewriting the field is re-evaluated", async ({ page }) => {
  await page.goto(`/ru/text?passage=${p.id}`);
  await page.getByTestId("stage").tap();
  await page.keyboard.insertText(`${w1} ${w2}ы `);
  await page.getByTestId("phone-input").evaluate((el: HTMLTextAreaElement, fixed) => {
    el.value = fixed;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" }));
  }, `${w1} ${w2} `);
  await expect(page.locator("[data-typed]")).toHaveCount(0);
});

test("whole passage typed on the phone finishes", async ({ page }) => {
  await page.goto(`/ru/text?passage=${p.id}`);
  await page.getByTestId("stage").tap();
  await page.keyboard.insertText(p.text);
  await expect(page.getByTestId("result")).toBeVisible();
});

test("code page on a phone explains the keyboard requirement", async ({ page }) => {
  await page.goto("/ru/code");
  await expect(page.getByTestId("code-needs-keyboard")).toBeVisible();
});


test("tapping the text again keeps typing at the end", async ({ page }) => {
  await page.goto(`/ru/text?passage=${p.id}`);
  await page.getByTestId("stage").tap();
  await page.keyboard.insertText(`${w1} `);
  const box = (await page.getByTestId("stage").boundingBox())!;
  await page.touchscreen.tap(box.x + 20, box.y + 20);
  await page.keyboard.insertText(`${w2} `);
  await expect(page.getByTestId("phone-input")).toHaveValue(`${w1} ${w2} `);
  await expect(page.locator("[data-typed]")).toHaveCount(0);
});

test("words mode does not auto-capitalise", async ({ page }) => {
  await page.goto("/ru/text");
  await page.getByRole("button", { name: "Слова", exact: true }).tap();
  await expect(page.getByTestId("phone-input")).toHaveAttribute("autocapitalize", "none");
});
