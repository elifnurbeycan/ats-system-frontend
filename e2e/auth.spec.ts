import { expect, test } from "@playwright/test";

// Keycloak giriş yönlendirmesi aynı test sunucusunda paylaşılan dış bir servise gider;
// paralel tarayıcılar redirect akışını birbirini etkilemeden sırayla doğrulamalıdır.
test.describe.configure({ mode: "serial" });

test("korunan sayfa oturumsuz kullanıcıyı Keycloak'a yönlendirir", async ({ page }) => {
  await page.goto("/adaylar");
  await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
  await expect(page.getByText(/Sign in to your account|Hesabınıza giriş/i)).toBeVisible();
});

test.describe("korunan uygulama rotaları", () => {
  for (const route of ["/", "/iletisim", "/pozisyonlar", "/departmanlar", "/ise-alim-sureci", "/roller"]) {
    test(`${route} oturumsuz kullanıcıyı Keycloak'a yönlendirir`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
    });
  }
});

test("eski oturum kayıt toplama endpoint'i kapalıdır", async ({ request }) => {
  const response = await request.post("/__manus__/logs", {
    data: { sessionEvents: [{ value: "sensitive-test-marker" }] },
  });
  expect(response.ok()).toBe(false);
});
