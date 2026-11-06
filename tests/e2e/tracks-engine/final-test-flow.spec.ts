import { expect, test } from '@playwright/test';
import { prisma } from '@/core/database/prisma';
import { loginAs } from '../../helpers/auth';
import {
  cleanup,
  createStudent,
  createTestPrefix,
  createTrack,
} from '../../helpers/track-fixtures';

const PREFIX = createTestPrefix();

test.describe('Fluxo completo do teste final (US09)', () => {
  test.afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('inicia trilha, conclui a lição e passa no teste final com 80%', async ({
    page,
  }) => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: true,
    });

    if (track.finalTestNodeId === null) {
      throw new Error('A trilha de fixture deveria ter um teste final.');
    }

    const questions = Array.from({ length: 5 }, (_, index) => ({
      questionType: 'multiple_choice',
      prompt: `Pergunta E2E ${index + 1}`,
      options: [`Resposta correta ${index + 1}`, `Resposta incorreta ${index + 1}`],
      correctAnswer: 0,
      explanation: `Explicação da pergunta ${index + 1}`,
    }));
    const fixtureExercises = await prisma.exercise.findMany({
      where: { trackNodeId: track.finalTestNodeId },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const firstExercise = fixtureExercises[0];
    if (!firstExercise) {
      throw new Error('A fixture deveria incluir uma questão para o teste final.');
    }

    await prisma.exercise.update({
      where: { id: firstExercise.id },
      data: { type: 'test', json: questions[0] },
    });
    await prisma.exercise.createMany({
      data: questions.slice(1).map((json) => ({
        trackNodeId: track.finalTestNodeId!,
        type: 'test',
        json,
      })),
    });

    await loginAs(page, student);
    await page
      .getByRole('button', { name: `Ver detalhes da trilha ${track.theme}` })
      .click();
    const trackDialog = page.getByRole('dialog', { name: track.theme });
    await trackDialog.getByRole('button', { name: 'Começar' }).click();

    await expect(page).toHaveURL(`/tracks/${track.id}`);
    await expect(
      prisma.takes.findUnique({
        where: { userId_trackId: { userId: student.id, trackId: track.id } },
      }),
    ).resolves.toMatchObject({ status: 'in_progress' });

    await page
      .getByRole('button', { name: `Teoria: ${track.theme} lesson 1` })
      .click();
    const lessonDialog = page.getByRole('dialog', {
      name: `${track.theme} lesson 1`,
    });
    await lessonDialog.getByRole('link', { name: 'Começar' }).click();

    await expect(page).toHaveURL(
      `/tracks/${track.id}/nodes/${track.contentNodeIds[0]}`,
    );
    await expect(
      page.getByRole('heading', {
        name: `${track.theme} lesson 1`,
        level: 1,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Concluir' }).click();
    await expect(page).toHaveURL(`/tracks/${track.id}`);

    await page.getByRole('button', { name: 'Teste final: Teste final' }).click();
    const finalTestDialog = page.getByRole('dialog', { name: 'Teste final' });
    await finalTestDialog.getByRole('link', { name: 'Começar' }).click();

    await expect(page).toHaveURL(
      `/tracks/${track.id}/nodes/${track.finalTestNodeId}`,
    );
    await expect(page.getByText('Pergunta E2E 1')).toBeVisible();

    for (const index of questions.keys()) {
      await page.getByRole('button', {
        name: index < 4
          ? `Resposta correta ${index + 1}`
          : `Resposta incorreta ${index + 1}`,
        exact: true,
      }).click();

      await page
        .getByRole('button', { name: index === 4 ? 'Finalizar' : 'Próximo' })
        .click();
      if (index < 4) {
        await expect(
          page.getByText(`Pergunta E2E ${index + 2}`),
        ).toBeVisible();
      }

    }

    await expect(page.getByRole('heading', { name: 'Parabéns! 🎉' })).toBeVisible();
    await expect(page.getByText(/Sua nota foi 80% a nota de corte era 80%/)).toBeVisible();
    await expect(
      prisma.progress.findUnique({
        where: {
          userId_trackNodeId: {
            userId: student.id,
            trackNodeId: track.finalTestNodeId,
          },
        },
      }),
    ).resolves.toMatchObject({ isCompleted: true, score: 80 });
    await expect(
      prisma.takes.findUnique({
        where: { userId_trackId: { userId: student.id, trackId: track.id } },
      }),
    ).resolves.toMatchObject({ status: 'completed', completedAt: expect.any(Date) });
  });
});
