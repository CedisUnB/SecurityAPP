import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionWithRefresh } from "@/core/security";
import { logServerError } from "@/core/logging/log-server-error";
import { ContentDeliveryService } from "./services/content-delivery";
import { ProgressTrackingService } from "./services/progress-tracking";
import { ContentError } from "./errors";
import {
  completeLessonAction,
  getExercisesContentAction,
  getLessonContentAction,
  getNodeTypeAction,
  submitExercisesAction,
} from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  // Simula o comportamento do Next: relança apenas erros de controle de fluxo (redirect)
  unstable_rethrow: jest.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("redirect:")) {
      throw error;
    }
  }),
}));
jest.mock("@/core/security", () => ({ getSessionWithRefresh: jest.fn() }));
jest.mock("@/core/logging/log-server-error", () => ({ logServerError: jest.fn() }));
jest.mock("./services/content-delivery", () => ({
  ContentDeliveryService: jest.fn().mockImplementation(() => ({
    getLessonContent: jest.fn(),
    getExercisesContent: jest.fn(),
    validateNodeAccess: jest.fn(),
  })),
}));
jest.mock("./services/progress-tracking", () => ({
  ProgressTrackingService: jest.fn().mockImplementation(() => ({
    completeLesson: jest.fn(),
    submitExercises: jest.fn(),
  })),
}));

const delivery = (ContentDeliveryService as jest.Mock).mock.results[0].value as {
  getLessonContent: jest.Mock;
  getExercisesContent: jest.Mock;
  validateNodeAccess: jest.Mock;
};
const tracking = (ProgressTrackingService as jest.Mock).mock.results[0].value as {
  completeLesson: jest.Mock;
  submitExercises: jest.Mock;
};
const sessionMock = getSessionWithRefresh as jest.MockedFunction<typeof getSessionWithRefresh>;
const mockedLogServerError = logServerError as jest.MockedFunction<typeof logServerError>;

const INTERNAL_ERROR_MESSAGE =
  "Invalid `prisma.trackNode.findUnique()` invocation: Can't reach database server at `db:3306` (table `sec-app_db`.`track_nodes`)";

const payload = { trackNodeId: 8, exercises: [{ id: 1, value: 2 }] };

function expectNoInternalDetails(result: unknown) {
  const serialized = JSON.stringify(result);

  expect(serialized).not.toContain("prisma");
  expect(serialized).not.toContain("sec-app_db");
  expect(serialized).not.toContain("db:3306");
}

// Uma linha por action: como chamá-la, como fazer o serviço falhar e o que esperar do tratamento de erro.
const actionCases = [
  {
    name: "getLessonContentAction",
    call: () => getLessonContentAction(3),
    failWith: (error: Error) => delivery.getLessonContent.mockRejectedValueOnce(error),
    context: "content:getLessonContent",
    fallback: "Erro ao carregar o conteúdo da lição.",
  },
  {
    name: "getExercisesContentAction",
    call: () => getExercisesContentAction(4),
    failWith: (error: Error) => delivery.getExercisesContent.mockRejectedValueOnce(error),
    context: "content:getExercises",
    fallback: "Erro ao carregar os exercícios.",
  },
  {
    name: "completeLessonAction",
    call: () => completeLessonAction(8, 12),
    failWith: (error: Error) => tracking.completeLesson.mockRejectedValueOnce(error),
    context: "content:completeLesson",
    fallback: "Erro ao concluir a leitura da lição.",
  },
  {
    name: "submitExercisesAction",
    call: () => submitExercisesAction(12, payload),
    failWith: (error: Error) => tracking.submitExercises.mockRejectedValueOnce(error),
    context: "content:submitExercises",
    fallback: "Erro ao processar as respostas dos exercícios.",
  },
  {
    name: "getNodeTypeAction",
    call: () => getNodeTypeAction(3),
    failWith: (error: Error) => delivery.validateNodeAccess.mockRejectedValueOnce(error),
    context: "content:getNodeType",
    fallback: "Erro ao carregar as informações do nó.",
  },
];

describe("content server actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionMock.mockResolvedValue({ sub: "user-1" } as Awaited<ReturnType<typeof getSessionWithRefresh>>);
  });

  it("returns lesson and exercise content for authenticated users", async () => {
    const lesson = { id: 3, title: "Lição" };
    const exercises = { id: 4, exercises: [] };
    delivery.getLessonContent.mockResolvedValue(lesson);
    delivery.getExercisesContent.mockResolvedValue(exercises);

    await expect(getLessonContentAction(3)).resolves.toEqual({ success: true, statusCode: 200, data: lesson });
    await expect(getExercisesContentAction(4)).resolves.toEqual({ success: true, statusCode: 200, data: exercises });
    expect(delivery.getLessonContent).toHaveBeenCalledWith("user-1", 3);
    expect(delivery.getExercisesContent).toHaveBeenCalledWith("user-1", 4);
  });

  it("completes lessons and revalidates the associated track", async () => {
    tracking.completeLesson.mockResolvedValue(undefined);

    await expect(completeLessonAction(8, 12)).resolves.toEqual({
      success: true,
      statusCode: 200,
      data: { message: "Leitura concluída com sucesso." },
    });
    expect(tracking.completeLesson).toHaveBeenCalledWith("user-1", 8);
    expect(revalidatePath).toHaveBeenCalledWith("/tracks/12");
  });

  it("validates and submits exercises and only revalidates completed nodes", async () => {
    const result = {
      trackNodeId: 8,
      isNodeCompleted: true,
      score: 80,
      passingScore: 80,
      isFinalTest: true,
      exercises: [{ id: 1, isCorrect: true }],
    };
    tracking.submitExercises.mockResolvedValue(result);

    await expect(submitExercisesAction(12, payload)).resolves.toEqual({ success: true, statusCode: 200, data: result });
    expect(tracking.submitExercises).toHaveBeenCalledWith("user-1", payload);
    expect(revalidatePath).toHaveBeenCalledWith("/tracks/12");

    (revalidatePath as jest.Mock).mockClear();
    tracking.submitExercises.mockResolvedValueOnce({ ...result, isNodeCompleted: false });
    await submitExercisesAction(12, payload);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the validated node type", async () => {
    delivery.validateNodeAccess.mockResolvedValue({ nodeType: "lesson" });

    await expect(getNodeTypeAction(3)).resolves.toEqual({
      success: true,
      statusCode: 200,
      data: { nodeType: "lesson" },
    });
    expect(delivery.validateNodeAccess).toHaveBeenCalledWith("user-1", 3);
  });

  describe("unexpected errors", () => {
    it.each(actionCases)(
      "$name returns a generic message and logs the details on the server",
      async ({ call, failWith, context, fallback }) => {
        const internalError = new Error(INTERNAL_ERROR_MESSAGE);
        failWith(internalError);

        const result = await call();

        expect(result).toEqual({ success: false, statusCode: 500, error: fallback });
        expectNoInternalDetails(result);
        expect(mockedLogServerError).toHaveBeenCalledWith(context, internalError);
      },
    );

    it.each(actionCases)(
      "$name returns the generic message when the error has no message",
      async ({ call, failWith, fallback }) => {
        failWith(new Error(""));

        await expect(call()).resolves.toEqual({ success: false, statusCode: 500, error: fallback });
      },
    );

    it("does not revalidate the track when completing a lesson fails", async () => {
      tracking.completeLesson.mockRejectedValueOnce(new Error(INTERNAL_ERROR_MESSAGE));

      await completeLessonAction(8, 12);

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("known business errors", () => {
    it.each(actionCases)(
      "$name exposes the message and status of a ContentError without logging it",
      async ({ call, failWith }) => {
        failWith(
          new ContentError("Acesso bloqueado: conclua o nó anterior da trilha para continuar.", 403),
        );

        await expect(call()).resolves.toEqual({
          success: false,
          statusCode: 403,
          error: "Acesso bloqueado: conclua o nó anterior da trilha para continuar.",
        });
        expect(mockedLogServerError).not.toHaveBeenCalled();
      },
    );

    it.each([
      [400, "O nó solicitado não é do tipo lição."],
      [403, "Acesso bloqueado: conclua o nó anterior da trilha para continuar."],
      [404, "Nó da trilha não encontrado."],
    ] as const)("keeps the %i status of the ContentError", async (statusCode, message) => {
      delivery.getLessonContent.mockRejectedValueOnce(new ContentError(message, statusCode));

      await expect(getLessonContentAction(3)).resolves.toEqual({
        success: false,
        statusCode,
        error: message,
      });
    });
  });

  describe("invalid submission payload", () => {
    it("returns 400 with a fixed message and does not submit the exercises", async () => {
      const result = await submitExercisesAction(12, { trackNodeId: 8, exercises: [] });

      expect(result).toEqual({ success: false, statusCode: 400, error: "Dados inválidos." });
      expect(tracking.submitExercises).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(mockedLogServerError).not.toHaveBeenCalled();
    });

    it("does not expose schema details for a malformed payload", async () => {
      const result = await submitExercisesAction(12, "not-an-object");

      expect(result).toEqual({ success: false, statusCode: 400, error: "Dados inválidos." });
      expect(tracking.submitExercises).not.toHaveBeenCalled();
    });

    it("rejects invalid action identifiers before calling the services", async () => {
      await expect(getLessonContentAction(0)).resolves.toEqual({
        success: false,
        statusCode: 400,
        error: "Dados inválidos.",
      });
      await expect(completeLessonAction(8, Number.MAX_SAFE_INTEGER)).resolves.toEqual({
        success: false,
        statusCode: 400,
        error: "Dados inválidos.",
      });
      await expect(submitExercisesAction(0, payload)).resolves.toEqual({
        success: false,
        statusCode: 400,
        error: "Dados inválidos.",
      });
      expect(delivery.getLessonContent).not.toHaveBeenCalled();
      expect(tracking.completeLesson).not.toHaveBeenCalled();
      expect(tracking.submitExercises).not.toHaveBeenCalled();
    });
  });

  describe("authentication", () => {
    it.each(actionCases)(
      "$name redirects to the login page instead of returning an error response",
      async ({ call }) => {
        sessionMock.mockResolvedValueOnce(null as Awaited<ReturnType<typeof getSessionWithRefresh>>);

        await expect(call()).rejects.toHaveProperty("message", "redirect:/auth/login");

        expect(redirect).toHaveBeenCalledWith("/auth/login");
        expect(mockedLogServerError).not.toHaveBeenCalled();
        expect(delivery.getLessonContent).not.toHaveBeenCalled();
        expect(tracking.completeLesson).not.toHaveBeenCalled();
        expect(tracking.submitExercises).not.toHaveBeenCalled();
      },
    );

    it("redirects when the session has no subject", async () => {
      sessionMock.mockResolvedValueOnce({} as Awaited<ReturnType<typeof getSessionWithRefresh>>);

      await expect(getLessonContentAction(3)).rejects.toHaveProperty(
        "message",
        "redirect:/auth/login",
      );
      expect(redirect).toHaveBeenCalledWith("/auth/login");
    });
  });
});