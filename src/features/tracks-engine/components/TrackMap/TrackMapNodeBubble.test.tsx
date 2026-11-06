import { renderToStaticMarkup } from "react-dom/server";
import type { TrackMapDTO } from "../../types";
import { TrackMapNodeBubble } from "./TrackMapNodeBubble";

const baseNode: TrackMapDTO["nodes"][number] = {
  id: 1,
  orderIndex: 0,
  nodeType: "lesson",
  title: "Conceitos iniciais",
  kindLabel: "Teoria",
  isCompleted: false,
  isCurrent: false,
  isMostAdvanced: false,
  isFinalTest: false,
  isNextUp: false,
  isUnlocked: true,
};

const finalTestNode: TrackMapDTO["nodes"][number] = {
  ...baseNode,
  nodeType: "exercise",
  kindLabel: "Teste final",
  isFinalTest: true,
};

const LOCKED_TONE = "border-border bg-surface-hover text-foreground-muted";
const CURRENT_TONE = "border-current-border bg-current-surface text-current-foreground";
const COMPLETED_TONE = "border-accent-border bg-accent text-accent-foreground";
const ALERT_TONE = "border-alert bg-alert text-alert-foreground";

describe("TrackMapNodeBubble", () => {
  describe("nó comum", () => {
    it("usa o destaque de etapa atual no próximo nó a concluir", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...baseNode, isNextUp: true }} />,
      );

      expect(markup).toContain(CURRENT_TONE);
      expect(markup).not.toContain(LOCKED_TONE);
    });

    it("usa o destaque de conclusão em um nó concluído", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...baseNode, isCompleted: true }} />,
      );

      expect(markup).toContain(COMPLETED_TONE);
      expect(markup).not.toContain(CURRENT_TONE);
      expect(markup).not.toContain(LOCKED_TONE);
    });

    it("prioriza o estilo de conclusão sobre o de próxima etapa", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble
          node={{ ...baseNode, isCompleted: true, isNextUp: true }}
        />,
      );

      expect(markup).toContain(COMPLETED_TONE);
      expect(markup).not.toContain("border-current-border");
    });

    it("renderiza o nó bloqueado com estilo apagado e cursor não permitido", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...baseNode, isUnlocked: false }} />,
      );

      expect(markup).toContain(LOCKED_TONE);
      expect(markup).toContain("cursor-not-allowed");
      expect(markup).not.toContain("border-current-border");
      expect(markup).not.toContain("border-accent-border");
    });

    it("não usa transparência no nó bloqueado, para não deixar ver o tracejado por trás", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...baseNode, isUnlocked: false }} />,
      );

      expect(markup).not.toContain("opacity-");
    });

    it("não aplica o efeito de hover em um nó bloqueado", () => {
      const lockedMarkup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...baseNode, isUnlocked: false }} />,
      );
      const unlockedMarkup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...baseNode, isNextUp: true }} />,
      );

      expect(lockedMarkup).not.toContain("hover:-translate-y-0.5");
      expect(unlockedMarkup).toContain("hover:-translate-y-0.5");
      expect(unlockedMarkup).not.toContain("cursor-not-allowed");
    });

    it("não diferencia mais a cor por tipo de nó (teoria x exercício)", () => {
      const lessonMarkup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...baseNode, isNextUp: true }} />,
      );
      const exerciseMarkup = renderToStaticMarkup(
        <TrackMapNodeBubble
          node={{ ...baseNode, nodeType: "exercise", isNextUp: true }}
        />,
      );

      expect(lessonMarkup).not.toContain("lesson-");
      expect(exerciseMarkup).not.toContain("exercise-");
      expect(exerciseMarkup).toContain(CURRENT_TONE);
    });
  });

  describe("teste final", () => {
    it("renderiza bloqueado com estilo apagado e o rótulo de bloqueio", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble node={{ ...finalTestNode, isUnlocked: false }} />,
      );

      expect(markup).toContain("h-16 w-28");
      expect(markup).toContain(LOCKED_TONE);
      expect(markup).toContain("cursor-not-allowed");
      expect(markup).not.toContain("opacity-");
      expect(markup).toContain("Teste Final Bloqueado");
      expect(markup).not.toContain(ALERT_TONE);
    });

    it("renderiza desbloqueado com o estilo de alerta e o rótulo normal", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble
          node={{ ...finalTestNode, isUnlocked: true, isNextUp: true }}
        />,
      );

      expect(markup).toContain("h-16 w-28");
      expect(markup).toContain(ALERT_TONE);
      expect(markup).toContain("Teste final");
      expect(markup).not.toContain("Bloqueado");
      expect(markup).not.toContain("cursor-not-allowed");
    });

    it("mantém o estilo de alerta quando o teste final já foi concluído", () => {
      const markup = renderToStaticMarkup(
        <TrackMapNodeBubble
          node={{ ...finalTestNode, isUnlocked: true, isCompleted: true }}
        />,
      );

      expect(markup).toContain(ALERT_TONE);
      expect(markup).not.toContain(COMPLETED_TONE);
    });
  });
});