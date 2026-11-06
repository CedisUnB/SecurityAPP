"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitExercisesAction } from "../actions";
import { ExercisesContent, AnswerValue, Result } from "../types/content.types";

interface ExerciseNodeViewProps {
  trackTitle: string;
  exercisesContent: ExercisesContent;
  trackId: number;
}

export const ExerciseNodeView: React.FC<ExerciseNodeViewProps> = ({
  trackTitle,
  exercisesContent,
  trackId,
}) => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [isPending, startTransition] = useTransition();
  const [evaluationResult, setEvaluationResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const exercises = exercisesContent.exercises;
  const totalExercises = exercises.length;
  const currentExercise = exercises[currentIndex];
  const isLastExercise = currentIndex === totalExercises - 1;

  // Lida com a seleção de respostas
  const handleAnswerChange = (value: AnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [currentExercise.id]: value,
    }));
  };

  const handleNext = () => {
    if (!isLastExercise) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Formata o payload e submete a bateria
      const submissionPayload = {
        trackNodeId: exercisesContent.id,
        exercises: exercises.map((ex) => ({
          id: ex.id,
          value: answers[ex.id] ?? "", // Evita enviar nulo
        })),
      };

      startTransition(async () => {
        try {
          const res = await submitExercisesAction(trackId, submissionPayload);
          if (res.success) {
            setEvaluationResult(res.data);
          } else {
            setErrorMsg(res.error);
          }
        } catch {
          setErrorMsg("Erro ao enviar as respostas.");
        }
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Renderiza a tela de resultado final com o Feedback
  if (evaluationResult) {
    return (
      <div className="flex-1 bg-surface text-foreground flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="max-w-2xl w-full flex flex-col gap-6">
          
          {/* Cartão de Parabéns / Nota Geral */}
          <div className="bg-surface-alt p-8 rounded-2xl text-center shadow-xl border border-border">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              {evaluationResult.isNodeCompleted ? "Parabéns! 🎉" : "Quase lá!"}
            </h2>
            <p className="text-lg text-foreground-muted mb-6">
              Sua nota foi <strong className="text-foreground">{evaluationResult.score}%</strong> a nota de corte era {evaluationResult.passingScore}%
            </p>
            <button
              onClick={() => router.push(`/tracks/${trackId}`)}
              className="cursor-pointer px-6 py-3 bg-brand-primary hover:opacity-90 text-white rounded-lg font-semibold transition-colors"
            >
              Voltar a Trilha
            </button>
          </div>

          {/* Lista de Resultados e Feedbacks das Questões */}
          <div className="space-y-4">
            {exercises.map((exercise, idx) => {
              // Encontra o resultado individual dessa questão retornado pela API
              const evalItem = evaluationResult.exercises.find(e => e.id === exercise.id);
              const isCorrect = evalItem?.isCorrect;
              const feedback = evalItem?.feedback;

              return (
                <div key={exercise.id} className="bg-surface-alt border border-border rounded-lg overflow-hidden shadow-sm">
                  {/* Cabeçalho da Questão */}
                  <div className="flex justify-between items-center p-4 bg-surface">
                    <span className="font-medium text-foreground">Questão {idx + 1}</span>
                    <span className={`font-semibold ${isCorrect ? "text-confirm" : "text-cancel"}`}>
                      {isCorrect ? "Correto" : "Incorreto"}
                    </span>
                  </div>

                  {/* Área de Feedback (exibida apenas se estiver incorreta e houver feedback) */}
                  {!isCorrect && feedback && (
                    <details className="group border-t border-border bg-surface-alt" open>
                      <summary className="flex justify-between items-center p-4 cursor-pointer text-foreground-muted font-medium select-none hover:text-foreground transition-colors">
                        <span>Feedback</span>
                        <span className="transition-transform group-open:rotate-180">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </span>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-foreground-muted leading-relaxed">
                        {feedback}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Define qual input renderizar com base no tipo e nas opções disponíveis
  const renderExerciseInput = () => {
    const questionType = currentExercise.json.questionType;
    const options = currentExercise.json.options || [];
    const currentAnswer = answers[currentExercise.id];

    // 1. Verdadeiro/Falso ou ABCD (Múltipla Escolha)
    if (questionType === "true_false" || questionType === "multiple_choice") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {options.map((option, idx) => {
            const isSelected = currentAnswer === idx;
            return (
              <button
                key={idx}
                onClick={() => handleAnswerChange(idx)}
                className={`py-3 px-4 rounded-lg font-medium transition-colors text-center cursor-pointer ${
                  isSelected
                    ? "bg-confirm text-white shadow-md"
                    : "bg-surface border border-border text-foreground hover:bg-surface-hover"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    // 2. Complete a frase / Código (Sem opções)
    if (questionType === "fill_in_the_blank" && options.length === 0) {
      return (
        <div className="mt-6">
          <input
            type="text"
            value={(currentAnswer as string) || ""}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Digite sua resposta aqui..."
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-brand-primary"
          />
        </div>
      );
    }

    // 3. Arrastar blocos (Ordenação)
    if (questionType === "ordering") {
      const selectedBlocks = (currentAnswer as string[]) || [];
      const availableBlocks = options.filter((opt) => !selectedBlocks.includes(opt));

      return (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
              Sua Resposta (Clique para remover):
            </p>
            <div className="min-h-[60px] p-4 bg-surface border border-dashed border-border rounded-lg flex flex-wrap gap-2">
              {selectedBlocks.map((block, idx) => (
                <button
                  key={`sel-${idx}`}
                  onClick={() =>
                    handleAnswerChange(selectedBlocks.filter((b) => b !== block))
                  }
                  className="px-3 py-1.5 bg-confirm text-white text-sm rounded-md shadow-sm cursor-pointer"
                >
                  {block}
                </button>
              ))}
              {selectedBlocks.length === 0 && (
                <span className="text-foreground-muted text-sm my-auto">
                  Selecione os blocos abaixo na ordem correta...
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
              Blocos Disponíveis:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableBlocks.map((block, idx) => (
                <button
                  key={`avail-${idx}`}
                  onClick={() => handleAnswerChange([...selectedBlocks, block])}
                  className="px-3 py-1.5 bg-surface border border-border hover:bg-surface-hover text-foreground text-sm rounded-md transition-colors cursor-pointer"
                >
                  {block}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 bg-surface text-foreground flex flex-col p-6 sm:p-10">
      <div className="max-w-2xl mx-auto w-full flex-auto flex flex-col justify-center">
        {/* Cabeçalho */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Exercícios {trackTitle}
          </h1>
        </div>

        {/* Indicador de Segmentos do Exercício */}
        <div className="mb-6">
          <span className="text-[11px] font-bold tracking-widest text-foreground-muted uppercase block mb-2">
            Conteúdo
          </span>
          <div className="flex gap-2 w-full">
            {exercises.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-auto rounded-full transition-all duration-300 ${
                  idx <= currentIndex ? "bg-brand-secondary" : "bg-surface-alt"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cartão da Questão */}
        <div className="bg-surface-alt rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col justify-between border border-border">
          <div>
            <h2 className="text-base text-foreground-muted mb-4">
              Questão {currentIndex + 1}:
            </h2>

            <div className="text-foreground text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {currentExercise.json.prompt}
            </div>

            {/* Renderização dinâmica das opções */}
            {renderExerciseInput()}
          </div>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0 || isPending}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentIndex === 0
                ? "bg-surface-alt text-foreground-muted cursor-not-allowed border border-border opacity-50"
                : "bg-surface border border-border hover:bg-surface-hover text-foreground cursor-pointer"
            }`}
          >
            Voltar
          </button>

          <span className="text-xs sm:text-sm font-medium text-foreground">
            {currentIndex + 1} / {totalExercises}
          </span>

          <button
            onClick={handleNext}
            disabled={isPending}
            className={`px-6 py-2.5 cursor-pointer rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-50 ${
              isLastExercise
                ? "bg-confirm hover:opacity-90 text-white" 
                : "bg-brand-primary hover:opacity-90 text-white"
            }`}
          >
            {isPending ? "Avaliando..." : isLastExercise ? "Finalizar" : "Próximo"}
          </button>
        </div>
        
        {errorMsg && (
          <p className="text-xs text-cancel text-center mt-4">{errorMsg}</p>
        )}
      </div>
    </div>
  );
};