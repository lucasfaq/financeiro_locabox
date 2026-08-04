import { useEffect, useState } from "react";
import { createTaskComment, createTaskSubtask, getTaskAttachmentUrl, loadTaskDetails, updateTaskSubtask, uploadTaskAttachment, type RemoteAttachment } from "./workspaceRepository";
import { subtaskProgress } from "./taskProgress";

export type DetailTask = { id: string | number; title: string; company: string; category: string; due: string; owner: string; value: number; status: "Pendente" | "Em aprovação" | "Aprovado" | "Executado" };
type EditableTask = DetailTask & { priority: "Alta" | "Média" | "Baixa"; taskType: "Tarefa" | "Aprovação" | "Financeiro" };
const dateInputValue = (due: string) => { const match = due.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return match ? `${match[3]}-${match[2]}-${match[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : ""; };
export function TaskDetail({ task, onClose, onArchive, onSave }: { task: EditableTask; onClose: () => void; onArchive?: () => void; onSave?: (patch: Pick<EditableTask, "title" | "due" | "value" | "priority" | "status" | "taskType">) => Promise<void> }) {
  const [subtasks, setSubtasks] = useState<{ id: string | number; title: string; done: boolean }[]>([]);
  const [comments, setComments] = useState<{ id: string | number; content: string; author: string }[]>([]);
  const [attachments, setAttachments] = useState<RemoteAttachment[]>([]);
  const [draft, setDraft] = useState("");
  const [subtask, setSubtask] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({ title: task.title, due: dateInputValue(task.due), value: String(task.value), priority: task.priority, status: task.status, taskType: task.taskType });
  const persistent = typeof task.id === "string";

  useEffect(() => {
    let active = true;
    if (typeof task.id !== "string") return;
    const taskId = task.id;
    void loadTaskDetails(taskId).then((details) => { if (active) { setSubtasks(details.subtasks); setComments(details.comments); setAttachments(details.attachments); } }).catch(() => { if (active) setMessage("Não foi possível carregar os detalhes compartilhados."); });
    return () => { active = false; };
  }, [persistent, task.id]);
  useEffect(() => { setEdit({ title: task.title, due: dateInputValue(task.due), value: String(task.value), priority: task.priority, status: task.status, taskType: task.taskType }); setEditing(false); }, [task]);

  const toggleSubtask = async (item: { id: string | number; done: boolean }) => {
    const done = !item.done;
    if (persistent && typeof item.id === "string") { try { await updateTaskSubtask(item.id, done); } catch { setMessage("Não foi possível atualizar a subtarefa."); return; } }
    setSubtasks((items) => items.map((current) => current.id === item.id ? { ...current, done } : current));
  };
  const addSubtask = async () => {
    const title = subtask.trim(); if (!title) return;
    if (persistent) { try { const item = await createTaskSubtask(task.id as string, title, subtasks.length); setSubtasks((items) => [...items, item]); } catch { setMessage("Não foi possível adicionar a subtarefa."); return; } }
    else setSubtasks((items) => [...items, { id: Date.now(), title, done: false }]);
    setSubtask("");
  };
  const addComment = async () => {
    const content = draft.trim(); if (!content) return;
    if (persistent) { try { const item = await createTaskComment(task.id as string, content); setComments((items) => [...items, item]); } catch { setMessage("Não foi possível enviar o comentário."); return; } }
    else setComments((items) => [...items, { id: Date.now(), content, author: "Você" }]);
    setDraft("");
  };
  const addAttachment = async (file: File | undefined) => {
    if (!file) return;
    if (!persistent) { setMessage("Anexos ficam disponíveis ao abrir uma atividade compartilhada."); return; }
    try { const item = await uploadTaskAttachment(task.id as string, file); setAttachments((items) => [...items, item]); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar o anexo."); }
  };
  const openAttachment = async (attachment: RemoteAttachment) => {
    try { window.open(await getTaskAttachmentUrl(attachment.path), "_blank", "noopener,noreferrer"); }
    catch { setMessage("Não foi possível abrir o anexo."); }
  };
  const save = async () => { if (!onSave || !edit.title.trim()) return; setSaving(true); try { await onSave({ title: edit.title.trim(), due: edit.due, value: Number(edit.value) || 0, priority: edit.priority, status: edit.status, taskType: edit.taskType }); setEditing(false); setMessage("Atividade atualizada."); } catch { setMessage("Não foi possível salvar as alterações."); } finally { setSaving(false); } };
  const progress = subtaskProgress(subtasks);
  return <div className="modal-backdrop" role="presentation"><section className="task-detail" role="dialog" aria-modal="true" aria-label="Detalhe da tarefa"><header><div><p className="eyebrow">{task.status}</p><h2>{task.title}</h2><p>{task.company} · {task.category} · Vencimento: {task.due}</p></div><button className="close" onClick={onClose}>×</button></header><div className="detail-meta"><span>Responsável <b>{task.owner}</b></span><span>Valor <b>{task.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span></div><div className="modal-actions">{onSave && <button className="secondary-button" onClick={() => setEditing((current) => !current)}>{editing ? "Cancelar edição" : "Editar atividade"}</button>}{onArchive && <button className="secondary-button" onClick={onArchive}>Arquivar tarefa</button>}</div>{editing && <form className="inline-form" onSubmit={(event) => { event.preventDefault(); void save(); }}><input aria-label="Título" value={edit.title} onChange={(event) => setEdit((current) => ({ ...current, title: event.target.value }))} /><input aria-label="Vencimento" type="date" value={edit.due} onChange={(event) => setEdit((current) => ({ ...current, due: event.target.value }))} /><input aria-label="Valor previsto" type="number" min="0" step="0.01" value={edit.value} onChange={(event) => setEdit((current) => ({ ...current, value: event.target.value }))} /><select aria-label="Prioridade" value={edit.priority} onChange={(event) => setEdit((current) => ({ ...current, priority: event.target.value as EditableTask["priority"] }))}><option>Alta</option><option>Média</option><option>Baixa</option></select><select aria-label="Status" value={edit.status} onChange={(event) => setEdit((current) => ({ ...current, status: event.target.value as EditableTask["status"] }))}><option>Pendente</option><option>Em aprovação</option><option>Aprovado</option><option>Executado</option></select><select aria-label="Tipo" value={edit.taskType} onChange={(event) => setEdit((current) => ({ ...current, taskType: event.target.value as EditableTask["taskType"] }))}><option>Tarefa</option><option>Aprovação</option><option>Financeiro</option></select><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button></form>}{message && <p className="empty">{message}</p>}<section><div className="subtask-heading"><h3>Subtarefas</h3><span>{progress.completed}/{progress.total} concluídas</span></div><div className="subtask-progress" aria-label={`${progress.percent}% das subtarefas concluídas`}><i style={{ width: `${progress.percent}%` }} /></div>{subtasks.map((item) => <label className="subtask" key={item.id}><input type="checkbox" checked={item.done} onChange={() => void toggleSubtask(item)} />{item.title}</label>)}<form className="inline-form" onSubmit={(event) => { event.preventDefault(); void addSubtask(); }}><input value={subtask} onChange={(event) => setSubtask(event.target.value)} placeholder="Adicionar subtarefa" /><button className="secondary-button">Adicionar</button></form></section><section><h3>Comentários</h3>{comments.map((comment) => <p className="comment" key={comment.id}><b>{comment.author}: </b>{comment.content}</p>)}<form className="inline-form" onSubmit={(event) => { event.preventDefault(); void addComment(); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva um comentário" /><button className="primary-button">Enviar</button></form></section><section><h3>Anexos</h3>{attachments.map((attachment) => <button className="text-button" key={attachment.id} onClick={() => void openAttachment(attachment)}>{attachment.name}</button>)}<label className="inline-form">Adicionar arquivo<input type="file" accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void addAttachment(event.target.files?.[0])} /></label></section></section></div>;
}
