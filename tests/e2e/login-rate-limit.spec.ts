import { test, expect, type Page } from '@playwright/test';

const MAX_ATTEMPTS = 5;
const PASSWORD = 'Senha@123';
const WRONG_PASSWORD = 'SenhaErrada@123';

const INVALID_MESSAGE = 'E-mail ou senha inválidos.';
const BLOCKED_MESSAGE = 'Muitas tentativas de login. Tente novamente em alguns minutos.';

async function createAccount(page: Page) {
  const timestamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const email = `playwright-ratelimit-${timestamp}@example.com`;
  const username = `playwright_rl_${timestamp.replace('-', '_')}`;

  await page.goto('/auth/register');
  await page.getByLabel('Nome de usuário').fill(username);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirmar Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/tracks$/);

  await page.context().clearCookies();
  return { email };
}

async function submitLogin(page: Page, email: string, password: string) {
  await expect(async () => {
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await Promise.all([
      page.waitForResponse((response) => response.request().method() === 'POST', {
        timeout: 5_000,
      }),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ]);
  }).toPass({ timeout: 20_000 });
}

async function failLogins(page: Page, email: string, times: number) {
  for (let i = 0; i < times; i++) {
    await submitLogin(page, email, WRONG_PASSWORD);
  }
}

test.describe('Login / Proteção contra força bruta', () => {
  test('deve bloquear a tentativa seguinte ao limite de falhas', async ({ page }) => {
    const { email } = await createAccount(page);

    await page.goto('/auth/login');
    await failLogins(page, email, MAX_ATTEMPTS);
    await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();

    await submitLogin(page, email, WRONG_PASSWORD);

    await expect(page.getByText(BLOCKED_MESSAGE)).toBeVisible();
    await expect(page.getByText(INVALID_MESSAGE)).toBeHidden();
  });

  test('deve manter o bloqueio mesmo com a senha correta', async ({ page }) => {
    const { email } = await createAccount(page);

    await page.goto('/auth/login');
    await failLogins(page, email, MAX_ATTEMPTS);

    await submitLogin(page, email, PASSWORD);

    await expect(page.getByText(BLOCKED_MESSAGE)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('deve responder da mesma forma para um e-mail que não existe', async ({ page }) => {
    const ghostEmail = `playwright-ghost-${Date.now()}@example.com`;

    await page.goto('/auth/login');
    await failLogins(page, ghostEmail, MAX_ATTEMPTS);
    await expect(page.getByText(INVALID_MESSAGE)).toBeVisible();

    await submitLogin(page, ghostEmail, WRONG_PASSWORD);

    await expect(page.getByText(BLOCKED_MESSAGE)).toBeVisible();
  });

  test('não deve afetar o login de outra conta', async ({ page }) => {
    const blocked = await createAccount(page);
    const other = await createAccount(page);

    await page.goto('/auth/login');
    await failLogins(page, blocked.email, MAX_ATTEMPTS + 1);
    await expect(page.getByText(BLOCKED_MESSAGE)).toBeVisible();

    await submitLogin(page, other.email, PASSWORD);

    await expect(page).toHaveURL(/\/tracks$/);
  });

  test('deve zerar o contador após um login bem-sucedido', async ({ page }) => {
    const { email } = await createAccount(page);

    await page.goto('/auth/login');
    await failLogins(page, email, MAX_ATTEMPTS - 1);
    await submitLogin(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/tracks$/);

    await page.context().clearCookies();
    await page.goto('/auth/login');

    await failLogins(page, email, MAX_ATTEMPTS - 1);
    await submitLogin(page, email, PASSWORD);

    await expect(page).toHaveURL(/\/tracks$/);
  });
});