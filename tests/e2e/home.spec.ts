import { test, expect } from '@playwright/test';

test.describe('Página Inicial / Auth', () => {
  test('deve carregar a home e exibir a landing page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'AEGIS' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();
});

  test('deve fazer login com usuário existente e redirecionar para /tracks', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueEmail = `playwright-login-${timestamp}@example.com`;
    const uniqueUsername = `playwright_login_${timestamp}`;

    await page.goto('/auth/register');
    await page.getByLabel('Nome de usuário').fill(uniqueUsername);
    await page.getByLabel('E-mail').fill(uniqueEmail);
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar Senha').fill('Senha@123');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/tracks$/);

    await page.context().clearCookies();

    await page.goto('/auth/login');
    await page.getByLabel('E-mail').fill(uniqueEmail);
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/tracks$/);
    await expect(page.getByRole('heading', { name: 'Trilhas disponíveis' })).toBeVisible();
  });

  test('deve criar uma conta nova e redirecionar para /tracks', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueEmail = `playwright-${Date.now()}@example.com`;
    const uniqueUsername = `playwright_user_${timestamp}`;

    await page.goto('/auth/register');

    await page.getByLabel('Nome de usuário').fill(uniqueUsername);
    await page.getByLabel('E-mail').fill(uniqueEmail);
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar Senha').fill('Senha@123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/tracks$/);
    await expect(page.getByRole('heading', { name: 'Trilhas disponíveis' })).toBeVisible();
  });
});