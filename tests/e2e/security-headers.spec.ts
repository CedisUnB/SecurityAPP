import { expect, test, type Page } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import {
  cleanup,
  createStudent,
  createTestPrefix,
  createTrack,
} from '../helpers/track-fixtures';
import { prisma } from '@/core/database/prisma';

const PREFIX = createTestPrefix();

function collectCspViolations(page: Page) {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/content[- ]security[- ]policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test.describe('Cabeçalhos HTTP de segurança (Backend 2.1)', () => {
  test.afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('envia os cabeçalhos de segurança e não expõe X-Powered-By', async ({
    request,
  }) => {
    for (const path of ['/', '/auth/login']) {
      const response = await request.get(path);
      const headers = response.headers();
      const csp = headers['content-security-policy'] ?? '';
      const scriptSrc =
        csp.split(';').map((directive) => directive.trim()).find((directive) =>
          directive.startsWith('script-src'),
        ) ?? '';

      expect(headers['x-powered-by']).toBeUndefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBeDefined();
      expect(headers['permissions-policy']).toBeDefined();
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
      expect(scriptSrc).not.toContain("'unsafe-inline'");
    }
  });

  test('gera um nonce diferente a cada requisição', async ({ request }) => {
    const extractNonce = (csp: string) => csp.match(/'nonce-([^']+)'/)?.[1];

    const first = await request.get('/');
    const second = await request.get('/');
    const firstNonce = extractNonce(first.headers()['content-security-policy'] ?? '');
    const secondNonce = extractNonce(second.headers()['content-security-policy'] ?? '');

    expect(firstNonce).toBeDefined();
    expect(secondNonce).toBeDefined();
    expect(firstNonce).not.toBe(secondNonce);
  });

  test('páginas públicas carregam sem violações de CSP', async ({ page }) => {
    const violations = collectCspViolations(page);

    for (const path of ['/', '/auth/login']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    expect(violations).toEqual([]);
  });

    test('páginas autenticadas carregam sem violações de CSP', async ({ page }) => {
    test.setTimeout(90_000); // em dev, cada rota compila na primeira visita

    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    const violations = collectCspViolations(page);

    await loginAs(page, student);

    for (const path of ['/tracks', `/tracks/${track.id}`, '/profile']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: 'AEGIS', exact: true })).toBeVisible();
    }

    await page
      .getByRole('button', { name: 'Alternar entre tema claro e escuro' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);

    expect(violations).toEqual([]);
  });
});