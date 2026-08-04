import { supabase } from "./supabaseClient";

export type RemoteList = { id: string; name: string };
export type RemoteFolder = { id: string; name: string; lists: RemoteList[] };
export type RemoteDepartment = { id: string; name: string; folders: RemoteFolder[] };
export type RemoteTaskStatus = "Pendente" | "Em aprovação" | "Aprovado" | "Executado";
export type RemoteTask = { id: string; title: string; company: "ITP" | "Locabox"; category: string; start?: string; due: string; owner: string; value: number; status: RemoteTaskStatus; priority: "Alta" | "Média" | "Baixa"; listId: string; taskType: "Tarefa" | "Aprovação" | "Financeiro" };
export type CreateRemoteTask = Omit<RemoteTask, "id">;
export type UpdateRemoteTask = Pick<RemoteTask, "title" | "due" | "value" | "priority" | "status" | "taskType">;
export type RemoteSubtask = { id: string; title: string; done: boolean };
export type RemoteComment = { id: string; content: string; author: string };
export type RemoteAttachment = { id: string; name: string; path: string; mimeType: string | null; size: number | null };
export type RemoteChannel = { id: string; name: string; isPrivate: boolean; kind: "geral" | "departamento" | "direto" };
export type RemoteChannelMember = { userId: string };
export type RemoteWorkspaceUser = { id: string; name: string };
export type RemoteChannelMessage = { id: string; content: string; author: string };
export type RemoteNotification = { id: string; kind: "Tarefa" | "Mensagem"; title: string; detail: string; time: string; priority: boolean; read: boolean; snoozedUntil: string | null };
export type RemoteWorkspaceDocument = { id: string; title: string; body: string; updated: string };
export type RemoteWorkspaceTemplate = { id: string; name: string; category: string; description: string };

const statusFromDatabase: Record<string, RemoteTaskStatus> = { rascunho: "Pendente", pendente: "Pendente", em_aprovacao: "Em aprovação", aprovado: "Aprovado", executado: "Executado", cancelado: "Pendente" };
const statusToDatabase: Record<RemoteTaskStatus, string> = { Pendente: "pendente", "Em aprovação": "em_aprovacao", Aprovado: "aprovado", Executado: "executado" };
const priorityFromDatabase: Record<string, RemoteTask["priority"]> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const priorityToDatabase: Record<RemoteTask["priority"], string> = { Alta: "alta", Média: "media", Baixa: "baixa" };
const typeFromDatabase: Record<string, RemoteTask["taskType"]> = { tarefa: "Tarefa", aprovacao: "Aprovação", financeiro: "Financeiro" };
const typeToDatabase: Record<RemoteTask["taskType"], string> = { Tarefa: "tarefa", Aprovação: "aprovacao", Financeiro: "financeiro" };

export function formatDueDate(value: string | null): string {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function toRemoteTask(row: { id: string; titulo: string; valor_previsto: number | string; inicio?: string | null; vencimento: string | null; prioridade: string; status: string; responsavel_id: string | null; lista_id: string | null; tipo: string; empresa_id: string }, companyName: string | undefined): RemoteTask {
  const company = companyName === "Locabox" ? "Locabox" : "ITP";
  return { id: row.id, title: row.titulo, company, category: "Financeiro", start: row.inicio ? formatDueDate(row.inicio) : undefined, due: formatDueDate(row.vencimento), owner: row.responsavel_id ? "Responsável da equipe" : "Não atribuído", value: Number(row.valor_previsto), status: statusFromDatabase[row.status] ?? "Pendente", priority: priorityFromDatabase[row.prioridade] ?? "Média", listId: row.lista_id ?? "", taskType: typeFromDatabase[row.tipo] ?? "Tarefa" };
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

export async function createWorkspaceDepartment(name: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("departamentos").insert({ nome: name });
  if (error) throw error;
}

export async function createWorkspaceFolder(departmentName: string, name: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { data: department, error: departmentError } = await supabase.from("departamentos").select("id").eq("nome", departmentName).eq("ativo", true).maybeSingle();
  if (departmentError) throw departmentError;
  if (!department) throw new Error("Departamento não encontrado ou inativo.");
  const { error } = await supabase.from("pastas_trabalho").insert({ departamento_id: department.id, nome: name, criado_por: userId });
  if (error) throw error;
}

export async function createWorkspaceList(folderId: string, name: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("listas_trabalho").insert({ pasta_id: folderId, nome: name, criado_por: userId });
  if (error) throw error;
}

export async function loadWorkspaceChannels(): Promise<RemoteChannel[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("canais").select("id,nome,privado,tipo").order("created_at");
  if (error) throw error;
  return (data ?? []).map((channel) => ({ id: channel.id, name: channel.nome, isPrivate: channel.privado, kind: channel.tipo === "direto" ? "direto" : channel.tipo === "departamento" ? "departamento" : "geral" }));
}

export async function createWorkspaceChannel(name: string, isPrivate = false): Promise<RemoteChannel> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("canais").insert({ nome: name, tipo: "geral", privado: isPrivate, criado_por: userId }).select("id,nome,privado,tipo").single();
  if (error) throw error;
  const { error: memberError } = await supabase.from("canal_membros").insert({ canal_id: data.id, usuario_id: userId });
  if (memberError) throw memberError;
  return { id: data.id, name: data.nome, isPrivate: data.privado, kind: "geral" };
}

export async function createDirectMessage(target: RemoteWorkspaceUser): Promise<RemoteChannel> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  if (target.id === userId) throw new Error("Escolha outra pessoa para iniciar uma mensagem direta.");
  const { data, error } = await supabase.from("canais").insert({ nome: target.name, tipo: "direto", privado: true, criado_por: userId }).select("id,nome,privado,tipo").single();
  if (error) throw error;
  const { error: memberError } = await supabase.from("canal_membros").insert([{ canal_id: data.id, usuario_id: userId }, { canal_id: data.id, usuario_id: target.id }]);
  if (memberError) throw memberError;
  return { id: data.id, name: data.nome, isPrivate: data.privado, kind: "direto" };
}

export async function loadChannelMembers(channelId: string): Promise<RemoteChannelMember[]> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.from("canal_membros").select("usuario_id").eq("canal_id", channelId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((member) => ({ userId: member.usuario_id }));
}

export async function loadActiveWorkspaceUsers(): Promise<RemoteWorkspaceUser[]> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "directory" } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data?.users ?? []).map((user: { id: string; nome: string }) => ({ id: user.id, name: user.nome }));
}

export async function addChannelMember(channelId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("canal_membros").insert({ canal_id: channelId, usuario_id: userId });
  if (error) throw error;
}

export async function removeChannelMember(channelId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("canal_membros").delete().eq("canal_id", channelId).eq("usuario_id", userId);
  if (error) throw error;
}

export async function loadChannelMessages(channelId: string): Promise<RemoteChannelMessage[]> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.from("mensagens_canal").select("id,conteudo,autor_id").eq("canal_id", channelId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((message) => ({ id: message.id, content: message.conteudo, author: message.autor_id ? "Membro da equipe" : "Equipe" }));
}

export async function createChannelMessage(channelId: string, content: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("mensagens_canal").insert({ canal_id: channelId, autor_id: userId, conteudo: content });
  if (error) throw error;
}

export async function loadNotifications(): Promise<RemoteNotification[] | null> {
  if (!supabase) return null;
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("notificacoes").select("id,tipo,titulo,detalhe,prioridade,lida_em,adiada_ate,created_at").eq("destinatario_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item) => ({ id: item.id, kind: item.tipo === "mensagem" ? "Mensagem" : "Tarefa", title: item.titulo, detail: item.detalhe ?? "", time: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at)), priority: item.prioridade, read: Boolean(item.lida_em), snoozedUntil: item.adiada_ate }));
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).is("lida_em", null);
  if (error) throw error;
}

export async function snoozeNotification(id: string, until: string | null): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("notificacoes").update({ adiada_ate: until }).eq("id", id);
  if (error) throw error;
}

export async function clearReadNotifications(): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("notificacoes").delete().not("lida_em", "is", null);
  if (error) throw error;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export async function loadWorkspaceDocuments(): Promise<RemoteWorkspaceDocument[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("documentos_trabalho").select("id,titulo,conteudo,updated_at").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((document) => ({ id: document.id, title: document.titulo, body: document.conteudo, updated: formatUpdatedAt(document.updated_at) }));
}

export async function createWorkspaceDocument(): Promise<RemoteWorkspaceDocument> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("documentos_trabalho").insert({ titulo: "Sem título", conteudo: "", criado_por: userId }).select("id,titulo,conteudo,updated_at").single();
  if (error) throw error;
  return { id: data.id, title: data.titulo, body: data.conteudo, updated: formatUpdatedAt(data.updated_at) };
}

export async function updateWorkspaceDocument(id: string, patch: { title?: string; body?: string }): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const update: { titulo?: string; conteudo?: string; updated_at: string } = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.titulo = patch.title || "Sem título";
  if (patch.body !== undefined) update.conteudo = patch.body;
  const { error } = await supabase.from("documentos_trabalho").update(update).eq("id", id);
  if (error) throw error;
}

export async function loadWorkspaceTemplates(): Promise<RemoteWorkspaceTemplate[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("templates_trabalho").select("id,nome,categoria,descricao").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((template) => ({ id: template.id, name: template.nome, category: template.categoria, description: template.descricao }));
}

export async function createWorkspaceTemplate(template: Omit<RemoteWorkspaceTemplate, "id">): Promise<RemoteWorkspaceTemplate> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("templates_trabalho").insert({ nome: template.name, categoria: template.category, descricao: template.description, criado_por: userId }).select("id,nome,categoria,descricao").single();
  if (error) throw error;
  return { id: data.id, name: data.nome, category: data.categoria, description: data.descricao };
}

export async function loadFinancialTasks(): Promise<RemoteTask[] | null> {
  if (!supabase) return null;
  const { data: companies, error: companyError } = await supabase.from("empresas").select("id,nome").eq("ativo", true);
  if (companyError) throw companyError;
  const { data: tasks, error: taskError } = await supabase.from("atividades_financeiras").select("id,titulo,valor_previsto,inicio,vencimento,prioridade,status,responsavel_id,lista_id,tipo,empresa_id").is("arquivada_em", null).order("created_at", { ascending: false });
  if (taskError) throw taskError;
  const companyNames = new Map((companies ?? []).map((company) => [company.id, company.nome]));
  return (tasks ?? []).map((task) => toRemoteTask(task, companyNames.get(task.empresa_id)));
}

export async function loadArchivedFinancialTasks(): Promise<RemoteTask[] | null> {
  if (!supabase) return null;
  const { data: companies, error: companyError } = await supabase.from("empresas").select("id,nome").eq("ativo", true);
  if (companyError) throw companyError;
  const { data: tasks, error: taskError } = await supabase.from("atividades_financeiras").select("id,titulo,valor_previsto,vencimento,prioridade,status,responsavel_id,lista_id,tipo,empresa_id").not("arquivada_em", "is", null).order("arquivada_em", { ascending: false });
  if (taskError) throw taskError;
  const companyNames = new Map((companies ?? []).map((company) => [company.id, company.nome]));
  return (tasks ?? []).map((task) => toRemoteTask(task, companyNames.get(task.empresa_id)));
}

export async function createFinancialTask(task: CreateRemoteTask, responsibleId?: string): Promise<RemoteTask> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sessão expirada. Entre novamente para criar uma atividade.");
  const { data: company, error: companyError } = await supabase.from("empresas").select("id,nome").eq("ativo", true).eq("nome", task.company).maybeSingle();
  if (companyError) throw companyError;
  if (!company) throw new Error(`Cadastre ou ative a empresa ${task.company} antes de criar atividades.`);
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : null;
  const { data, error } = await supabase.from("atividades_financeiras").insert({ empresa_id: company.id, lista_id: task.listId || null, titulo: task.title, valor_previsto: task.value, vencimento: dueDate, prioridade: priorityToDatabase[task.priority], status: statusToDatabase[task.status], tipo: typeToDatabase[task.taskType], responsavel_id: responsibleId || null, criado_por: authData.user.id }).select("id,titulo,valor_previsto,vencimento,prioridade,status,responsavel_id,lista_id,tipo,empresa_id").single();
  if (error) throw error;
  return toRemoteTask(data, company.nome);
}

export async function updateFinancialTaskStatus(id: string, status: RemoteTaskStatus): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("atividades_financeiras").update({ status: statusToDatabase[status] }).eq("id", id);
  if (error) throw error;
}

export async function updateFinancialTask(id: string, task: UpdateRemoteTask): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : null;
  const { error } = await supabase.from("atividades_financeiras").update({ titulo: task.title, vencimento: dueDate, valor_previsto: task.value, prioridade: priorityToDatabase[task.priority], status: statusToDatabase[task.status], tipo: typeToDatabase[task.taskType] }).eq("id", id);
  if (error) throw error;
}

export async function archiveFinancialTask(id: string, archived = true): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { error } = await supabase.from("atividades_financeiras").update({ arquivada_em: archived ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw error;
}

export async function decideFinancialApproval(taskId: string, decision: "aprovado" | "devolvido", justification: string | null): Promise<void> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const userId = await getCurrentUserId();
  const { error: approvalError } = await supabase.from("aprovacoes_financeiras").insert({ atividade_id: taskId, aprovador_id: userId, decisao: decision, justificativa: justification, decidido_em: new Date().toISOString() });
  if (approvalError) throw approvalError;
  const status = decision === "aprovado" ? "aprovado" : "pendente";
  const { error: taskError } = await supabase.from("atividades_financeiras").update({ status }).eq("id", taskId);
  if (taskError) throw taskError;
}

export async function loadTaskDetails(taskId: string): Promise<{ subtasks: RemoteSubtask[]; comments: RemoteComment[]; attachments: RemoteAttachment[] }> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const [{ data: subtasks, error: subtasksError }, { data: comments, error: commentsError }, { data: attachments, error: attachmentsError }] = await Promise.all([
    supabase.from("subtarefas_financeiras").select("id,titulo,concluida").eq("atividade_id", taskId).order("ordem").order("created_at"),
    supabase.from("comentarios_atividade").select("id,conteudo,autor_id").eq("atividade_id", taskId).order("created_at"),
    supabase.from("anexos_atividade").select("id,nome,caminho,tipo_mime,tamanho_bytes").eq("atividade_id", taskId).order("created_at"),
  ]);
  if (subtasksError) throw subtasksError;
  if (commentsError) throw commentsError;
  if (attachmentsError) throw attachmentsError;
  return { subtasks: (subtasks ?? []).map((item) => ({ id: item.id, title: item.titulo, done: item.concluida })), comments: (comments ?? []).map((item) => ({ id: item.id, content: item.conteudo, author: item.autor_id ? "Membro da equipe" : "Equipe" })), attachments: (attachments ?? []).map((item) => ({ id: item.id, name: item.nome, path: item.caminho, mimeType: item.tipo_mime, size: item.tamanho_bytes })) };
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

const attachmentBucket = "anexos-atividades";
const supportedAttachmentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "anexo";
}

export async function uploadTaskAttachment(taskId: string, file: File): Promise<RemoteAttachment> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  if (!supportedAttachmentTypes.has(file.type)) throw new Error("Formato não permitido. Envie PDF, JPEG, PNG ou XLSX.");
  if (file.size > 10 * 1024 * 1024) throw new Error("O anexo deve ter no máximo 10 MB.");
  const userId = await getCurrentUserId();
  const path = `${userId}/${taskId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(attachmentBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from("anexos_atividade").insert({ atividade_id: taskId, autor_id: userId, bucket_id: attachmentBucket, caminho: path, nome: file.name, tipo_mime: file.type, tamanho_bytes: file.size }).select("id,nome,caminho,tipo_mime,tamanho_bytes").single();
  if (error) { await supabase.storage.from(attachmentBucket).remove([path]); throw error; }
  return { id: data.id, name: data.nome, path: data.caminho, mimeType: data.tipo_mime, size: data.tamanho_bytes };
}

export async function getTaskAttachmentUrl(path: string): Promise<string> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.storage.from(attachmentBucket).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
