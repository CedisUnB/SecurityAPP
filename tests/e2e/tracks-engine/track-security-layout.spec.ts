import { expect, test } from '@playwright/test';
import { loginAs } from '../../helpers/auth';
import {
  cleanup,
  completeNodes,
  createStudent,
  createTestPrefix,
  createTrack,
} from '../../helpers/track-fixtures';
import { prisma } from '@/core/database/prisma';

const PREFIX = createTestPrefix();

test.describe('Segurança e regressões de layout de trilhas (A01)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('redireciona ao login quando a trilha é aberta sem sessão', async ({
    page,
  }) => {
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });

    await page.goto(`/tracks/${track.id}`);

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Entre na sua conta' }),
    ).toBeVisible();
  });

  test('mostra 404 para uma trilha inexistente sem expor stack trace', async ({
    page,
  }) => {
    const student = await createStudent(PREFIX);
    await loginAs(page, student);

    for (const id of ['999999999', 'abc']) {
      const response = await page.goto(`/tracks/${id}`);

      expect(response?.status()).toBe(404);
      await expect(page.getByText('This page could not be found.')).toBeVisible();
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toMatch(/stack trace|at [\w./-]+\(/i);
    }
  });

  test('não revela para outro usuário o progresso privado da trilha', async ({
    page,
  }) => {
    const owner = await createStudent(PREFIX);
    const otherStudent = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    await completeNodes(owner.id, track.contentNodeIds);

    await loginAs(page, otherStudent);
    await page.goto(`/tracks/${track.id}`);

    await expect(page.getByText('0 de 4 etapas concluídas · 0%')).toBeVisible();
    await expect(page.getByText('Etapa 1 · Concluída', { exact: true })).toHaveCount(
      0,
    );
  });

  test('mantém o cabeçalho visível e acima dos nós ao rolar o mapa', async ({
    page,
  }) => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 5,
      withFinalTest: false,
    });

    await loginAs(page, student);
    await page.goto(`/tracks/${track.id}`);

    const header = page.getByRole('banner');
    for (const nodeId of track.contentNodeIds) {
      const node = page.locator(`#node-${nodeId}`).getByRole('button');
      await node.scrollIntoViewIfNeeded();
      await expect(header).toBeInViewport();
      await expect(node).toBeInViewport();

      const headerBox = await header.boundingBox();
      const nodeBox = await node.boundingBox();
      expect(headerBox).not.toBeNull();
      expect(nodeBox).not.toBeNull();
      const overlapsHeader =
        nodeBox!.x < headerBox!.x + headerBox!.width &&
        nodeBox!.x + nodeBox!.width > headerBox!.x &&
        nodeBox!.y < headerBox!.y + headerBox!.height &&
        nodeBox!.y + nodeBox!.height > headerBox!.y;
      expect(overlapsHeader).toBe(false);
    }
  });

  test('centraliza o diálogo do nó na viewport mobile', async ({ page }) => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });

    await loginAs(page, student);
    await page.goto(`/tracks/${track.id}`);
    await page
      .getByRole('button', {
        name: `Teoria: ${track.theme} lesson 1`,
      })
      .click();

    const dialog = page.getByRole('dialog', {
      name: `${track.theme} lesson 1`,
    });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs(box!.x + box!.width / 2 - viewport!.width / 2)).toBeLessThanOrEqual(
      12,
    );
    expect(Math.abs(box!.y + box!.height / 2 - viewport!.height / 2)).toBeLessThanOrEqual(
      12,
    );
  });

  test('mantém alinhado o nó concluído com outro nó da mesma coluna', async ({
    page,
  }) => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    await completeNodes(student.id, [track.contentNodeIds[0]]);

    await loginAs(page, student);
    await page.goto(`/tracks/${track.id}`);

    const completedNode = page.getByRole('button', {
      name: `Teoria: ${track.theme} lesson 1, concluído, etapa mais avançada alcançada`,
    });
    const uncompletedNode = page.getByRole('button', {
      name: `Teoria: ${track.theme} lesson 2`,
    });
    const completedBox = await completedNode.boundingBox();
    const uncompletedBox = await uncompletedNode.boundingBox();
    expect(completedBox).not.toBeNull();
    expect(uncompletedBox).not.toBeNull();
    expect(Math.abs(completedBox!.x - uncompletedBox!.x)).toBeLessThanOrEqual(2);
  });
});
