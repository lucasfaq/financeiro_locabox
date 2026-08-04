import { CopyPlus, FileStack, LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export type TaskTemplate = { id: string | number; name: string; category: string; description: string };

type Props = {
  templates: TaskTemplate[];
  onSaveCurrent: () => void;
  onUse: (template: TaskTemplate) => void;
  onUpdate: (id: TaskTemplate["id"], patch: Omit<TaskTemplate, "id">) => Promise<void>;
  onDelete: (id: TaskTemplate["id"]) => Promise<void>;
};

export function TemplatesLibrary({ templates, onSaveCurrent, onUse, onUpdate, onDelete }: Props) {
  const [filter, setFilter] = useState<"Todos" | "Tarefas" | "Processos" | "Documentos">("Todos");
  const [deletingId, setDeletingId] = useState<TaskTemplate["id"] | null>(null);
  const [editingId, setEditingId] = useState<TaskTemplate["id"] | null>(null);
  const [draft, setDraft] = useState<Omit<TaskTemplate, "id">>({ name: "", category: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const visibleTemplates = useMemo(() => templates.filter((template) => {
    if (filter === "Todos") return true;
    const category = template.category.toLowerCase();
    if (filter === "Processos") return category.includes("processo") || category.includes("departamento") || category.includes("pasta");
    if (filter === "Documentos") return category.includes("documento");
    return !category.includes("processo") && !category.includes("documento");
  }), [filter, templates]);
  const startEditing = (template: TaskTemplate) => {
    setErrorMessage("");
    setDraft({ name: template.name, category: template.category, description: template.description });
    setEditingId(template.id);
  };
  const saveTemplate = async (template: TaskTemplate) => {
    if (draft.name.trim().length < 2 || !draft.category.trim()) {
      setErrorMessage("Informe nome e categoria do template.");
      return;
    }
    setErrorMessage("");
    setSaving(true);
    try {
      await onUpdate(template.id, { name: draft.name.trim(), category: draft.category.trim(), description: draft.description.trim() });
      setEditingId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível atualizar o template.");
    } finally {
      setSaving(false);
    }
  };
  const removeTemplate = async (template: TaskTemplate) => {
    if (!window.confirm(`Excluir o template “${template.name}”?`)) return;
    setErrorMessage("");
    setDeletingId(template.id);
    try {
      await onDelete(template.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível excluir o template.");
    } finally {
      setDeletingId(null);
    }
  };
  return <section className="templates-library">
    <div className="templates-heading"><div><p className="eyebrow">BIBLIOTECA DO ESPAÇO DE TRABALHO</p><h2>Templates</h2><p>Modelos reutilizáveis de tarefas e processos do departamento.</p></div><button className="primary-button" onClick={onSaveCurrent}><Plus size={17} />Salvar visão como template</button></div>
    <div className="template-filters">{(["Todos", "Tarefas", "Processos", "Documentos"] as const).map((option) => <button key={option} className={filter === option ? "selected" : ""} onClick={() => setFilter(option)}>{option}</button>)}</div>
    {errorMessage && <p className="template-error">{errorMessage}</p>}
    {templates.length === 0 ? <div className="template-empty"><LayoutTemplate size={28}/><h3>Nenhum template salvo</h3><p>Salve uma visão ou processo do departamento para reutilizá-lo depois.</p></div> : visibleTemplates.length === 0 ? <div className="template-empty"><LayoutTemplate size={28}/><h3>Nenhum template nesta categoria</h3><p>Escolha outra categoria ou salve um novo modelo.</p></div> : <div className="template-grid">{visibleTemplates.map((template) => <article key={template.id}><span><FileStack size={18}/>{template.category}</span>{editingId === template.id ? <div className="template-edit"><input aria-label="Nome do template" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}/><input aria-label="Categoria do template" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}/><textarea aria-label="Descrição do template" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}/><div><button className="primary-button" disabled={saving} onClick={() => void saveTemplate(template)}>{saving ? "Salvando…" : "Salvar"}</button><button className="secondary-button" disabled={saving} onClick={() => setEditingId(null)}>Cancelar</button></div></div> : <><h3>{template.name}</h3><p>{template.description}</p><button className="secondary-button" onClick={() => onUse(template)}><CopyPlus size={15}/>Usar template</button><button className="secondary-button" onClick={() => startEditing(template)}><Pencil size={15}/>Editar</button><button className="secondary-button" disabled={deletingId === template.id} onClick={() => void removeTemplate(template)}><Trash2 size={15}/>{deletingId === template.id ? "Excluindo…" : "Excluir"}</button></>}</article>)}</div>}
  </section>;
}
