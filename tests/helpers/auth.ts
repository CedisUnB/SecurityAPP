import { expect, type Page } from '@playwright/test';
import { TEST_PASSWORD } from './track-fixtures';

export async function loginAs(
  page: Page,
  student: { email: string },
): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('E-mail').fill(student.email);
  await page.getByLabel('Senha', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/tracks$/, { timeout: 20000 });
  await expect(
    page.getByRole('heading', { name: 'Trilhas disponíveis' }),
  ).toBeVisible();
}
