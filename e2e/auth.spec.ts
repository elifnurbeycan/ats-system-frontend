import { expect, test } from "@playwright/test";

// Keycloak giriş yönlendirmesi aynı test sunucusunda paylaşılan dış bir servise gider;
// paralel tarayıcılar redirect akışını birbirini etkilemeden sırayla doğrulamalıdır.
test.describe.configure({ mode: "serial" });

test("korunan sayfa oturumsuz kullanıcıyı Keycloak'a yönlendirir", async ({ page }) => {
  await page.goto("/adaylar");
  await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
  await expect(page.getByText(/Sign in to your account|Hesabınıza giriş/i)).toBeVisible();
});

test.describe("korunan şirket rotaları", () => {
  for (const route of [
    "/",
    "/adaylar",
    "/iletisim",
    "/pozisyonlar",
    "/departmanlar",
    "/ise-alim-sureci",
    "/kullanicilar",
    "/roller",
    "/ayarlar",
  ]) {
    test(`${route} oturumsuz kullanıcıyı Keycloak'a yönlendirir`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
    });
  }
});

test.describe("korunan platform rotaları", () => {
  for (const route of ["/admin", "/admin/companies/1"]) {
    test(`${route} oturumsuz kullanıcıyı Keycloak'a yönlendirir`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
    });
  }
});

test("oturum açma sayfası Keycloak akışını başlatır", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
  await expect(page).toHaveURL(/client_id=ats-frontend/);
  await expect(page).toHaveURL(/response_type=code/);
  await expect(page).toHaveURL(/code_challenge_method=S256/);
});

test("admin giriş sayfası ayrı platform rotasına yönlendirir", async ({ page }) => {
  await page.goto("/admin-login");
  await expect(page).toHaveURL(/\/realms\/ats\/protocol\/openid-connect\/auth/);
  await expect(page).toHaveURL(/client_id=ats-frontend/);
});

test("eski oturum kayıt toplama endpoint'i kapalıdır", async ({ request }) => {
  const response = await request.post("/__manus__/logs", {
    data: { sessionEvents: [{ value: "sensitive-test-marker" }] },
  });
  expect(response.ok()).toBe(false);
});

test("oturum kayıt endpoint'i GET ile de erişilemez", async ({ request }) => {
  const response = await request.get("/__manus__/logs");
  // Vite bilinmeyen GET yollarını index.html'e yönlendirebilir; önemli olan
  // endpoint'in log verisi içeren bir JSON yanıtı vermemesidir.
  expect(response.headers()["content-type"] || "").not.toContain("application/json");
});
