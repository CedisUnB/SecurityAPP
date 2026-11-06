"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeLessonAction } from "../actions";
import { LessonContent } from "../types/content.types";

interface ReadingNodeViewProps {
  trackTitle: string;
  categoryTag?: string;
  lesson: LessonContent;
  trackId: number;
}

export const ReadingNodeView: React.FC<ReadingNodeViewProps> = ({
  trackTitle,
  lesson,
  trackId,
}) => {
  const router = useRouter();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const slides = lesson.json.slides;
  const totalSlides = slides.length;
  const currentSlide = slides[currentSlideIndex];
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  const handleNext = () => {
    if (!isLastSlide) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      // Ao concluir o último slide, aciona a Server Action para liberar o próximo nó
      startTransition(async () => {
        try {
          const res = await completeLessonAction(lesson.id, trackId);
          if (res.success) {
            router.push(`/tracks/${trackId}`);
          } else {
            setErrorMsg(res.error);
          }
        } catch {
          setErrorMsg("Erro ao registrar a conclusão da leitura.");
        }
      });
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="flex-1 bg-surface text-foreground flex flex-col justify-between p-6 sm:p-10">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Cabeçalho da Trilha e Categoria */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-accent font-semibold mb-2">
            Trilha · {trackTitle}
          </p>
        </div>

        {/* Título Principal do Nó */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8">
          {lesson.title}
        </h1>

        {/* Indicador de Segmentos do Slide */}
        <div className="mb-6">
          <span className="text-[11px] font-bold tracking-widest text-foreground-muted uppercase block mb-2">
            Conteúdo
          </span>
          <div className="flex gap-2 w-full">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  idx <= currentSlideIndex ? "bg-accent" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cartão de Conteúdo do Slide */}
        <div className="bg-surface-alt rounded-2xl p-6 sm:p-8 shadow-xl min-h-[220px] flex flex-col justify-between border border-border">
          <div>
            {currentSlide.tag && (
              <span className="inline-block text-[11px] font-medium text-lesson-foreground bg-lesson-surface border border-lesson-border px-2.5 py-0.5 rounded mb-3">
                {currentSlide.tag}
              </span>
            )}

            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">
              {currentSlide.title}
            </h2>

            <div className="text-foreground text-sm sm:text-base leading-relaxed space-y-3 whitespace-pre-line">
              {currentSlide.body}
            </div>
          </div>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentSlideIndex === 0 || isPending}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentSlideIndex === 0
                ? "bg-surface-alt text-foreground-muted cursor-not-allowed border border-border opacity-50"
                : "bg-surface border border-border hover:bg-surface-hover text-foreground"
            }`}
          >
            Voltar
          </button>

          <span className="text-xs sm:text-sm font-medium text-foreground">
            {currentSlideIndex + 1} / {totalSlides}
          </span>

          <button
            onClick={handleNext}
            disabled={isPending}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-md hover:opacity-90 disabled:opacity-50 ${
              isLastSlide
                ? "bg-confirm text-white"
                : "bg-accent text-accent-foreground"
            }`}
          >
            {isPending
              ? "Salvando..."
              : isLastSlide
              ? "Concluir"
              : "Próximo"}
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-cancel text-center mt-3">{errorMsg}</p>
        )}

        {/* Referências e Fontes Complementares */}
        {currentSlide.source && (
          <div className="mt-8 border-t border-border pt-4">
            <details className="text-xs text-foreground-muted group">
              <summary className="cursor-pointer font-medium hover:text-foreground select-none flex items-center justify-between transition-colors">
                <span>Quer se aprofundar? Referências e leituras complementares</span>
                <span className="transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-2 text-foreground-muted leading-relaxed italic">
                {currentSlide.source}
              </p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};