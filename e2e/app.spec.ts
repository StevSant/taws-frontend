import { expect, test } from '@playwright/test';

const DEMO_EMAIL = 'compliance@midas.demo';
const DEMO_PASSWORD = 'MidasDemo26!';

async function loginDemo(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/correo|email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión|log in|sign in/i }).click();
  await page.waitForURL(/\/(radar|chat|briefings|user)/, { timeout: 30_000 });
}

test.describe('Midas E2E smoke', () => {
  test('radar loads news timeline from backend', async ({ page }) => {
    await page.goto('/radar');
    await expect(page.getByRole('heading', { name: /radar de mercado|market radar/i })).toBeVisible({
      timeout: 20_000,
    });
    const errorBanner = page.locator('.feature-error, [role="alert"]').filter({ hasText: /error/i });
    await expect(errorBanner).toHaveCount(0);
    await expect(page.locator('app-news-timeline').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('app-news-timeline a[href*="/radar/news/"]').first()).toBeVisible();
  });

  test('news detail page opens from timeline', async ({ page }) => {
    await page.goto('/radar');
    const newsLink = page.locator('app-news-timeline a[href*="/radar/news/"]').first();
    await expect(newsLink).toBeVisible({ timeout: 25_000 });
    const href = await newsLink.getAttribute('href');
    await newsLink.click();
    await expect(page).toHaveURL(/\/radar\/news\//);
    await expect(page.locator('app-news-detail-page, .news-detail').first()).toBeVisible({
      timeout: 15_000,
    });
    const notFound = page.getByText(/no encontr|not found/i);
    await expect(notFound).toHaveCount(0);
    if (href) {
      await page.goto(href);
      await expect(notFound).toHaveCount(0);
    }
  });

  test('shell search navigates to radar instrument', async ({ page }) => {
    await page.goto('/radar');
    const search = page.getByRole('combobox', { name: /buscar|search/i });
    await search.click();
    await search.fill('AAPL');
    await expect(page.locator('#shell-search-results')).toBeVisible({ timeout: 10_000 });
    await page.locator('.app-shell__search-item').first().click();
    await expect(page).toHaveURL(/\/radar/);
  });

  test('theme toggle switches immediately', async ({ page }) => {
    await page.goto('/radar');
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    await page.getByRole('button', { name: /modo claro|light mode|modo oscuro|dark mode/i }).click();
    await expect(html).not.toHaveAttribute('data-theme', before ?? '');
  });

  test('notification bell opens panel', async ({ page }) => {
    await page.goto('/radar');
    await page.getByRole('button', { name: /notificaciones|notifications/i }).click();
    await expect(page.locator('.notification-bell__panel')).toBeVisible();
  });

  test('scenarios presets load from backend', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.locator('app-scenarios-page, .scenarios-page, .feature-page').first()).toBeVisible({
      timeout: 15_000,
    });
    const preset = page.locator('.scenario-preset-card, [class*="preset"]').first();
    await expect(preset).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.feature-error')).toHaveCount(0);
  });

  test('chat redirects to login when anonymous', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
  });

  test('chat composer works when authenticated', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/chat');
    await expect(page.getByRole('textbox', { name: /escribe|write|message/i })).toBeEnabled({
      timeout: 15_000,
    });
  });

  test('chat session updates URL when switching conversations', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/i, { timeout: 15_000 });

    const firstUrl = page.url();
    const sessionButtons = page.locator('.chat-sessions__item');
    await expect(sessionButtons.first()).toBeVisible({ timeout: 10_000 });

    const count = await sessionButtons.count();
    if (count < 2) {
      await page.getByRole('button', { name: /nueva conversación|new chat/i }).click();
      await expect(sessionButtons).toHaveCount(count + 1, { timeout: 5_000 });
    }

    await sessionButtons.nth(1).click();
    await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/i);
    expect(page.url()).not.toBe(firstUrl);

    await page.getByRole('button', { name: /nueva conversación|new chat/i }).click();
    await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/i);
    const newChatUrl = page.url();
    expect(newChatUrl).not.toBe(firstUrl);
  });

  test('scenarios recent item navigates to result page', async ({ page }) => {
    await page.goto('/scenarios');
    const preset = page.locator('.scenario-preset-card, [class*="preset"]').first();
    await expect(preset).toBeVisible({ timeout: 20_000 });
    await preset.click();
    await page.getByRole('button', { name: /ejecutar escenario|run scenario/i }).click();
    await expect(page).toHaveURL(/\/scenarios\/[0-9a-f-]{36}/i, { timeout: 120_000 });
    await expect(page.locator('app-scenario-result-view, .scenario-result').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('user profile page after login', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/user');
    await expect(page.getByRole('heading', { name: /mi cuenta|my account/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(DEMO_EMAIL).first()).toBeVisible();
  });

  test('user menu navigates to profile', async ({ page }) => {
    await loginDemo(page);
    await page.getByRole('button', { name: /menú de usuario|user menu/i }).click();
    await page.getByRole('menuitem').filter({ hasText: /ver perfil|view full profile/i }).click();
    await expect(page).toHaveURL(/\/user/);
  });

  test('briefings loads watchlists for authenticated user', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/briefings');
    await expect(page.locator('app-briefings-page, .briefings-page').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('.feature-error').filter({ hasText: /401|403|error/i })).toHaveCount(0);
  });
});
