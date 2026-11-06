import { expect, test } from '@playwright/test';
import { prisma } from '@/core/database/prisma';
import { loginAs } from '../../helpers/auth';
import {
  cleanup,
  completeNodes,
  createStudent,
  createTestPrefix,
  createTrack,
  markTrackCompleted,
  startTrack,
} from '../../helpers/track-fixtures';

const PREFIX = createTestPrefix();

test.describe('Catálogo de trilhas (US06/US09/US10)', () => {
  test.afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('abre os detalhes da trilha e navega para o mapa', async ({ page }) => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });

    await loginAs(page, student);

    await page
      .getByRole('button', { name: `Ver detalhes da trilha ${track.theme}` })
      .click();
    const dialog = page.getByRole('dialog', { name: track.theme });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`Trilha de integração ${track.theme}`)).toBeVisible();
    await dialog.getByRole('button', { name: 'Começar' }).click();

    await expect(page).toHaveURL(`/tracks/${track.id}`);
    await expect(
      page.getByRole('heading', { name: track.theme }),
    ).toBeVisible();
    await expect(
      prisma.takes.findUnique({
        where: { userId_trackId: { userId: student.id, trackId: track.id } },
      }),
    ).resolves.toMatchObject({ status: 'in_progress', completedAt: null });
  });

    test('mostra o progresso e o percentual da trilha iniciada e omite o indicador sem progresso', async ({
    page,
  }) => {
    const student = await createStudent(PREFIX);
    const startedTrack = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    const untouchedTrack = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    await startTrack(student.id, startedTrack.id);
    await completeNodes(student.id, startedTrack.contentNodeIds.slice(0, 2));

    await loginAs(page, student);

    const startedCard = page.getByRole('button', {
      name: `Ver detalhes da trilha ${startedTrack.theme}`,
    });
    await expect(startedCard).toContainText('2/4 concluídos · 50%');

    const untouchedCard = page.getByRole('button', {
      name: `Ver detalhes da trilha ${untouchedTrack.theme}`,
    });
    await expect(untouchedCard).toBeVisible();
    await expect(untouchedCard).not.toContainText(/concluídos|Concluída|%/);
  });

  test('mostra 0% na trilha iniciada que ainda não tem nenhum nó concluído', async ({
    page,
  }) => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    await startTrack(student.id, track.id);

    await loginAs(page, student);

    await expect(
      page.getByRole('button', { name: `Ver detalhes da trilha ${track.theme}` }),
    ).toContainText('0/4 concluídos · 0%');
  });

  test('marca como concluída a trilha com todos os nós concluídos', async ({
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
    await completeNodes(student.id, [
      ...track.contentNodeIds,
      track.finalTestNodeId,
    ]);
    await markTrackCompleted(student.id, track.id);

    await loginAs(page, student);

    const completedCard = page.getByRole('button', {
      name: `Ver detalhes da trilha ${track.theme}, concluída`,
    });
    await expect(completedCard).toBeVisible();
    await expect(completedCard).toContainText('Concluída · 100%');
  });
});
