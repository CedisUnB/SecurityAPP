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

test.describe('Teste final da trilha (US09)', () => {
  test.afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('mantém o teste final bloqueado até concluir o conteúdo e depois abre o diálogo', async ({
    page,
  }) => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: true,
    });
    if (track.finalTestNodeId === null) {
      throw new Error('A trilha de fixture deveria ter um teste final.');
    }
    await completeNodes(student.id, track.contentNodeIds.slice(0, -1));

    await loginAs(page, student);
    await page.goto(`/tracks/${track.id}`);

    const lockedTest = page.getByRole('button', {
      name: /Teste final: Teste final, bloqueado até concluir as etapas anteriores/i,
    });
    await expect(lockedTest).toBeDisabled();
    await expect(lockedTest).toContainText('Bloqueado');
    await lockedTest.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await completeNodes(student.id, track.contentNodeIds.slice(-1));
    await page.reload();

    const unlockedTest = page.getByRole('button', {
      name: /^Teste final: Teste final$/,
    });
    await expect(unlockedTest).toBeEnabled();
    await unlockedTest.click();
    await expect(
      page.getByRole('dialog', { name: 'Teste final' }),
    ).toBeVisible();
  });
});
