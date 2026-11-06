import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import {
  cleanup,
  createStudent,
  createTestPrefix,
} from '../helpers/track-fixtures';
import { prisma } from '@/core/database/prisma';

const PREFIX = createTestPrefix();

test.describe('Política de Privacidade', () => {
  test.afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('é pública e não tem marcadores pendentes', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page).toHaveURL('/privacy');
    await expect(
      page.getByRole('heading', { name: 'Política de Privacidade', level: 1 }),
    ).toBeVisible();

    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/\[[^\]]*\]/);
  });

  test('oferece o link nas telas de login e cadastro', async ({ page }) => {
    for (const path of ['/auth/login', '/auth/register']) {
      await page.goto(path);
      const link = page.getByRole('link', { name: 'Política de Privacidade' });

      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/privacy');
      await expect(link).toHaveAttribute('target', '_blank');
    }
  });

  test('continua acessível para usuário autenticado', async ({ page }) => {
    const student = await createStudent(PREFIX);

    await loginAs(page, student);
    await page.goto('/privacy');

    await expect(page).toHaveURL('/privacy');
    await expect(
      page.getByRole('heading', { name: 'Política de Privacidade', level: 1 }),
    ).toBeVisible();
  });
});