import { expect, test } from "@playwright/test";

test("korunan sayfa oturumsuz kullanıcıyı Keycloak'a yönlendirir", async ({ page }) => {
  await page.goto("/adaylar");
  await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
  await expect(page.getByText(/Sign in to your account|Hesabınıza giriş/i)).toBeVisible();
});

test("eski oturum kayıt toplama endpoint'i kapalıdır", async ({ request }) => {
  const response = await request.post("/__manus__/logs", {
    data: { sessionEvents: [{ value: "sensitive-test-marker" }] },
  });
  expect(response.ok()).toBe(false);
});
