// Tipos compartilhados pelas páginas, componentes e cliente HTTP.
export type Stage = "NOVO" | "QUALIFICADO" | "PROPOSTA_ENVIADA" | "EM_ANALISE" | "NEGOCIACAO" | "FECHADO" | "PERDIDO";
export type Temperature = "FRIO" | "MORNO" | "QUENTE";
export type Broker = { id: string; name: string; avatarUrl?: string | null };
export type Task = { id: string; title: string; dueAt: string; done: boolean };
export type Lead = {
  id: string; name: string; phone: string; email?: string | null; livesCount: number; stage: Stage; score: number;
  temperature: Temperature; estimatedValue?: number | string | null; lastActivityAt?: string | null; notes?: string | null;
  assignedTo?: Broker | null; tasks?: Task[]; source?: string;
};
export type Message = { id: string; sender: "LEAD" | "BOT" | "CORRETOR"; content: string; type: "TEXT" | "AUDIO" | "IMAGE" | "DOCUMENT"; sentAt: string; transcription?: string | null };
export type Conversation = { id: string; status: "BOT" | "HUMANO" | "ENCERRADO"; sentiment: "POSITIVO" | "NEUTRO" | "FRUSTRADO" | "URGENTE"; aiSummary?: string | null; lead: Lead; messages: Message[]; updatedAt: string };
export type GoalStatus = { percentage: number; color: "red" | "yellow" | "green"; workdaysRemaining: number; dailyNeeded: number; projectedEnd: number; onTrack: boolean };

