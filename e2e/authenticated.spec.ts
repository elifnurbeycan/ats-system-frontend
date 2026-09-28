import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  if (!username || !password) {
    throw new Error("E2E_USERNAME ve E2E_PASSWORD tanımlı değil.");
  }

  await page.goto("/login");
  await page.waitForURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);

  const usernameInput = page.locator('input[name="username"], input[type="email"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.getByRole("button", { name: /giriş yap|sign in|log in/i }).click();
  await page.waitForURL(/localhost:3000\/(?!realms)/, { timeout: 20_000 });
}

test.describe("oturum açmış kullanıcı uygulama akışları", () => {
  test.skip(!username || !password, "E2E_USERNAME ve E2E_PASSWORD verilmedi; authenticated testler atlandı.");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("kontrol panelini ve aylık başvuru trendini görüntüler", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Kontrol paneli" })).toBeVisible();
    await expect(page.getByText("Aylık başvuru trendi")).toBeVisible();
  });

  test("adaylar sayfasını ve aşama filtrelerini görüntüler", async ({ page }) => {
    await page.goto("/adaylar");
    await expect(page.getByRole("heading", { name: "Adaylar", exact: true })).toBeVisible();
    await expect(page.getByText("Aşamalara göre adaylar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tümü", exact: true })).toBeVisible();
  });

  test("departmanlar sayfasını görüntüler", async ({ page }) => {
    await page.goto("/departmanlar");
    await expect(page.getByRole("heading", { name: "Departmanlar" })).toBeVisible();
  });

  test("pozisyonlar sayfasını görüntüler", async ({ page }) => {
    await page.goto("/pozisyonlar");
    await expect(page.getByRole("heading", { name: "Pozisyonlar" })).toBeVisible();
  });
});
