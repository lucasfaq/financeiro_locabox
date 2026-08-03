import { supabase } from "./supabaseClient";

export type RemoteList = { id: string; name: string };
export type RemoteFolder = { id: string; name: string; lists: RemoteList[] };
export type RemoteDepartment = { id: string; name: string; folders: RemoteFolder[] };
export type RemoteTaskStatus = "Pendente" | "Em aprovação" | "Aprovado" | "Executado";
export type RemoteTask = { id: string; title: string; company: "ITP" | "Locabox"; category: string; due: string; owner: string; value: number; status: RemoteTaskStatus; priority: "Alta" | "Média" | "Baixa"; listId: string; taskType: "Tarefa" | "Aprovação" | "Financeiro" };
export type CreateRemoteTask = Omit<RemoteTask, "id">;
export type RemoteSubtask = { id: string; title: string; done: boolean };
export type RemoteComment = { id: string; content: string; author: string };

const statusFromDatabase: Record<string, RemoteTaskStatus> = { rascunho: "Pendente", pendente: "Pendente", em_aprovacao: "Em aprovação", aprovado: "Aprovado", executado: "Executado", cancelado: "Pendente" };
const statusToDatabase: Record<RemoteTaskStatus, string> = { Pendente: "pendente", "Em aprovação": "em_aprovacao", Aprovado: "aprovado", Executado: "executado" };
const priorityFromDatabase: Record<string, RemoteTask["priority"]> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const priorityToDatabase: Record<RemoteTask["priority"], string> = { Alta: "alta", Média: "media", Baixa: "baixa" };
const typeFromDatabase: Record<string, RemoteTask["taskType"]> = { tarefa: "Tarefa", aprovacao: "Aprovação", financeiro: "Financeiro" };
const typeToDatabase: Record<RemoteTask["taskType"], string> = { Tarefa: "tarefa", Aprovação: "aprovacao", Financeiro: "financeiro" };

function formatDueDate(value: string | null): string {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function toRemoteTask(row: { id: string; titulo: string; valor_previsto: number | string; vencimento: string | null; prioridade: string; status: string; responsavel_id: string | null; lista_id: string | null; tipo: string; empresa_id: string }, companyName: string | undefined): RemoteTask {
  const company = companyName === "Locabox" ? "Locabox" : "ITP";
  return { id: row.id, title: row.titulo, company, category: "Financeiro", due: formatDueDate(row.vencimento), owner: row.responsavel_id ? "Responsável da equipe" : "Não atribuído", value: Number(row.valor_previsto), status: statusFromDatabase[row.status] ?? "Pendente", priority: priorityFromDatabase[row.prioridade] ?? "Média", listId: row.lista_id ?? "", taskType: typeFromDatabase[row.tipo] ?? "Tarefa" };
}

export async function loadWorkspaceHierarchy(): Promise<RemoteDepartment[] | null> {
  if (!supabase) return null;
  const { data: departments, error: departmentError } = await supabase.from("departamentos").select("id,nome").eq("ativo", true).order("nome");
  if (departmentError) throw departmentError;
  const { data: folders, error: folderError } = await supabase.from("pastas_trabalho").select("id,nome,departamento_id").eq("ativo", true).order("nome");
  if (folderError) throw folderError;
  const { data: lists, error: listError } = await supabase.from("listas_trabalho").select("id,nome,pasta_id").eq("ativo", true).order("nome");
  if (listError) throw listError;
  return (departments ?? []).map((department) => ({ id: department.id, name: department.nome, folders: (folders ?? []).filter((folder) => folder.departamento_id === department.id).map((folder) => ({ id: folder.id, name: folder.nome, lists: (lists ?? []).filter((list) => list.pasta_id === folder.id).map((list) => ({ id: list.id, name: list.nome })) })) }));
}

export async function loadFinancialTasks(): Promise<RemoteTask[] | null> {
  if (!supabase) return null;
  const { data: companies, error: companyError } = await supabase.from("empresas").select("id,nome").eq("ativo", true);
  if (companyError) throw companyError;
  const { data: tasks, error: taskError } = await supabase.from("atividades_financeiras").select("id,titulo,valor_previsto,vencimento,prioridade,status,responsavel_id,lista_id,tipo,empresa_id").is("arquivada_em", null).order("created_at", { ascending: false });
  if (taskError) throw taskError;
  const companyNames = new Map((companies ?? []).map((company) => [company.id, company.nome]));
  return (tasks ?? []).map((task) => toRemoteTask(task, companyNames.get(task.empresa_id)));
}

export async function createFinancialTask(task: CreateRemoteTask): Promise<RemoteTask> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sessão expirada. Entre novamente para criar uma atividade.");
  const { data: company, error: companyError } = await supabase.from("empresas").select("id,nome").eq("ativo", true).order("nome").limit(1).maybeSingle();
  if (companyError) throw companyError;
  if (!company) throw new Error("Cadastre uma empresa ativa antes de criar atividades.");
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : null;
  const { data, error } = await supabase.from("atividades_financeiras").insert({ empresa_id: company.id, lista_id: task.listId || null, titulo: task.title, valor_previsto: task.value, vencimento: dueDate, prioridade: priorityToDatabase[task.priority], status: statusToDatabase[task.status], tipo: typeToDatabase[task.taskType], criado_por: authData.user.id }).select("id,titulo,valor_previsto,vencimento,prioridade,status,responsavel_id,lista_id,tipo,empresa_id").single();
  if (error) throw error;
  return toRemoteTask(data, company.nome);
}

export async function updateFinancialTaskStatus(id: string, status: RemoteTaskStatus): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("atividades_financeiras").update({ status: statusToDatabase[status] }).eq("id", id);
  if (error) throw error;
}

export async function loadTaskDetails(taskId: string): Promise<{ subtasks: RemoteSubtask[]; comments: RemoteComment[] }> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const [{ data: subtasks, error: subtasksError }, { data: comments, error: commentsError }] = await Promise.all([
    supabase.from("subtarefas_financeiras").select("id,titulo,concluida").eq("atividade_id", taskId).order("ordem").order("created_at"),
    supabase.from("comentarios_atividade").select("id,conteudo,autor_id").eq("atividade_id", taskId).order("created_at"),
  ]);
  if (subtasksError) throw subtasksError;
  if (commentsError) throw commentsError;
  return { subtasks: (subtasks ?? []).map((item) => ({ id: item.id, title: item.titulo, done: item.concluida })), comments: (comments ?? []).map((item) => ({ id: item.id, content: item.conteudo, author: item.autor_id ? "Membro da equipe" : "Equipe" })) };
}

async function getCurrentUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export async function createTaskSubtask(taskId: string, title: string, order: number): Promise<RemoteSubtask> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("subtarefas_financeiras").insert({ atividade_id: taskId, titulo: title, ordem: order, criado_por: userId }).select("id,titulo,concluida").single();
  if (error) throw error;
  return { id: data.id, title: data.titulo, done: data.concluida };
}

export async function updateTaskSubtask(id: string, done: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("subtarefas_financeiras").update({ concluida: done }).eq("id", id);
  if (error) throw error;
}

export async function createTaskComment(taskId: string, content: string): Promise<RemoteComment> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("comentarios_atividade").insert({ atividade_id: taskId, conteudo: content, autor_id: userId }).select("id,conteudo").single();
  if (error) throw error;
  return { id: data.id, content: data.conteudo, author: "Você" };
}
