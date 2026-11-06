import { 
  getLessonContentAction, 
  getExercisesContentAction,
  getNodeTypeAction 
} from "@/features/content/actions";
import { ReadingNodeView } from "@/features/content/components/ReadingNodeView";
import { ExerciseNodeView } from "@/features/content/components/ExerciseNodeView";
import { notFound } from "next/navigation";

interface NodePageProps {
  params: Promise<{ trackId: string; nodeId: string }>;
}

export default async function NodePage({ params }: NodePageProps) {
  const { trackId: trackIdParam, nodeId: nodeIdParam } = await params;
  const trackId = Number(trackIdParam);
  const nodeId = Number(nodeIdParam);

  // Validação básica de segurança dos parâmetros da URL
  if (
    !Number.isSafeInteger(nodeId) || nodeId < 1 ||
    !Number.isSafeInteger(trackId) || trackId < 1
  ) {
    notFound();
  }

  // 1. Descobre o tipo do nó (e já valida se o usuário tem permissão de acesso)
  const typeResult = await getNodeTypeAction(nodeId);
  
  if (!typeResult.success) {
    // Aqui você pode redirecionar ou mostrar uma tela de erro amigável de "Nó bloqueado"
    throw new Error(typeResult.error);
  }

  const { nodeType } = typeResult.data;

  // 2. Renderiza a View de Leitura
  if (nodeType === "lesson") {
    const lessonResult = await getLessonContentAction(nodeId);
    
    if (!lessonResult.success) {
      throw new Error(lessonResult.error);
    }

    return (
      <main>
        <ReadingNodeView 
          lesson={lessonResult.data}
          trackTitle={`Trilha ${trackId}`} // Substituir pela chamada real de título se houver
          trackId={trackId}
        />
      </main>
    );
  }

  // 3. Renderiza a View de Exercícios / Teste Final
  if (nodeType === "exercise") {
    const exerciseResult = await getExercisesContentAction(nodeId);
    
    if (!exerciseResult.success) {
      throw new Error(exerciseResult.error);
    }

    return (
      <main>
        <ExerciseNodeView
          exercisesContent={exerciseResult.data}
          trackTitle={`Trilha ${trackId}`} // Substituir pela chamada real de título se houver
          trackId={trackId}
        />
      </main>
    );
  }

  // Fallback caso o tipo não seja reconhecido
  notFound();
}