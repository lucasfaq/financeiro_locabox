import { supabase } from "./supabaseClient";

export function assistantAnswerFrom(data: unknown): string {
  if (!data || typeof data !== "object" || !("answer" in data) || typeof data.answer !== "string" || !data.answer.trim()) throw new Error("O assistente retornou uma resposta inválida.");
  return data.answer.trim();
}

export async function askFinanceiroAssistant(message: string): Promise<string> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.functions.invoke("financeiro-assistant", { body: { message } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return assistantAnswerFrom(data);
}
