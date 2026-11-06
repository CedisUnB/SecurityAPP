import { test, expect } from '@playwright/test';

test.describe('Cadastro / Indicador de força da senha', () => {
  test('deve atualizar o indicador conforme a senha é digitada', async ({ page }) => {
    await page.goto('/auth/register');
    const password = page.getByLabel('Senha', { exact: true });

    await expect(page.getByText('Digite uma senha')).toBeVisible();
    await expect(password).toHaveAttribute('aria-describedby', /password-strength/);

    for (const [value, label] of [
      ['abc', 'Senha fraca'],
      ['Abcdefg1', 'Senha média'],
      ['Senha@123', 'Senha forte'],
    ]) {
      await expect(async () => {
        await password.fill(value);
        await expect(page.getByRole('status').filter({ hasText: label })).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 10_000 });
    }
  });

  test('deve manter a validação do servidor mesmo com o indicador', async ({ page }) => {
    const timestamp = Date.now();

    await page.goto('/auth/register');
    await page.getByLabel('Nome de usuário').fill(`playwright_strength_${timestamp}`);
    await page.getByLabel('E-mail').fill(`playwright-strength-${timestamp}@example.com`);
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar Senha').fill('Senha@123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/tracks$/);
  });

  const PROFILE_PATH = '/profile';

  test('deve exibir e atualizar o indicador ao alterar a senha no perfil', async ({ page }) => {
    const timestamp = Date.now();

    await page.goto('/auth/register');
    await page.getByLabel('Nome de usuário').fill(`playwright_profile_${timestamp}`);
    await page.getByLabel('E-mail').fill(`playwright-profile-${timestamp}@example.com`);
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar Senha').fill('Senha@123');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/tracks$/);

    await page.goto(PROFILE_PATH);
    const password = page.getByLabel('Nova Senha (opcional)');

    await expect(async () => {
      await page.getByRole('button', { name: 'Editar Perfil' }).click();
      await expect(password).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });

    await expect(page.getByRole('list', { name: 'Requisitos da senha' })).toBeHidden();

    for (const [value, label] of [
      ['abc', 'Senha fraca'],
      ['Abcdefg1', 'Senha média'],
      ['Senha@123', 'Senha forte'],
    ]) {
      await password.fill(value);
      await expect(page.getByRole('status').filter({ hasText: label })).toBeVisible();
    }
    await expect(password).toHaveAttribute('aria-describedby', 'profile-password-strength');

    await password.fill('');
    await expect(page.getByRole('list', { name: 'Requisitos da senha' })).toBeHidden();
  });
});